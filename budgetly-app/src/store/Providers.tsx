"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import {
  deleteWorkspace,
  loadWorkspace,
  saveWorkspace,
  type WorkspaceLoadResult,
} from "./persistence";
import {
  clearWorkspace,
  hydrateWorkspace,
  makeStore,
} from "./store";
import styles from "./Providers.module.css";

type RecoveryError = Extract<WorkspaceLoadResult, { status: "error" }>;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<RecoveryError | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startPersistence = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = store.subscribe(() => {
      try {
        saveWorkspace(window.localStorage, store.getState());
      } catch {
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
        setSaveError(
          "Changes are only in memory because this browser could not save them locally.",
        );
      }
    });
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    const result = loadWorkspace(window.localStorage);
    if (result.status === "error") {
      queueMicrotask(() => {
        if (!cancelled) setLoadError(result);
      });
    } else {
      if (result.status === "loaded") {
        store.dispatch(hydrateWorkspace(result.state));
      }
      startPersistence();
      queueMicrotask(() => {
        if (!cancelled) setReady(true);
      });
    }

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
    };
  }, [startPersistence, store]);

  const startFresh = () => {
    try {
      deleteWorkspace(window.localStorage);
      store.dispatch(clearWorkspace());
      startPersistence();
      setLoadError(null);
      setReady(true);
    } catch {
      setLoadError((current) =>
        current
          ? {
              ...current,
              message:
                "The browser blocked access to local storage, so the saved workspace could not be cleared.",
            }
          : current,
      );
    }
  };

  const downloadRecoveryCopy = () => {
    if (!loadError?.raw) return;
    const url = URL.createObjectURL(
      new Blob([loadError.raw], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "budgetly-workspace-recovery.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loadError) {
    return (
      <main className={styles.recovery}>
        <section className={styles.recoveryCard} role="alert">
          <p className={styles.eyebrow}>Local workspace error</p>
          <h1>Your saved workspace could not be opened</h1>
          <p>{loadError.message}</p>
          <p>
            Budgetly has left the stored data untouched. Save a recovery copy
            before starting over if you may need it later.
          </p>
          <div className={styles.actions}>
            {loadError.raw && (
              <button type="button" onClick={downloadRecoveryCopy}>
                Download recovery copy
              </button>
            )}
            <button
              type="button"
              className={styles.dangerButton}
              onClick={startFresh}
            >
              Permanently clear and start fresh
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!ready) {
    return <main className={styles.loading}>Loading local workspace…</main>;
  }

  return (
    <Provider store={store}>
      {saveError && (
        <div className={styles.saveError} role="alert">
          {saveError}
        </div>
      )}
      {children}
    </Provider>
  );
}
