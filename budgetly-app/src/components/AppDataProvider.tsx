"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY } from "@/components/ThemeScript";
import { getDb, isDbAvailable } from "@/lib/db/db";
import { DEFAULT_SETTINGS } from "@/lib/db/defaults";
import { ensureSeeded, getSettings, updateSettings } from "@/lib/db/repo";
import type {
  Account,
  AppSettings,
  Category,
  ImportRecord,
  MonthlyBudget,
  Theme,
  Transaction,
} from "@/lib/db/schema";

export type AppData = {
  /** `false` until the first read from IndexedDB resolves. */
  ready: boolean;
  /** Set when IndexedDB could not be opened at all. */
  error: string | null;
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  imports: ImportRecord[];
  settings: AppSettings;
  categoryById: Map<string, Category>;
  accountById: Map<string, Account>;
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const EMPTY: Omit<AppData, "theme" | "setTheme"> = {
  ready: false,
  error: null,
  categories: [],
  accounts: [],
  transactions: [],
  budgets: [],
  imports: [],
  settings: DEFAULT_SETTINGS,
  categoryById: new Map(),
  accountById: new Map(),
};

const AppDataContext = createContext<AppData | null>(null);

function applyTheme(theme: Theme): void {
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
}

/**
 * Loads the whole local dataset and keeps it live.
 *
 * Personal CSV exports are small enough that holding every transaction in memory
 * is simpler and faster than paging through IndexedDB — and it guarantees the
 * dashboard, transactions table and reports all read exactly the same rows.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const open = async () => {
      if (!isDbAvailable()) {
        throw new Error("this browser has no IndexedDB support");
      }
      await ensureSeeded();
    };

    open()
      .then(() => {
        if (active) setSeeded(true);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? `Budgetly could not open local storage: ${cause.message}.`
            : "Budgetly could not open local storage.",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const snapshot = useLiveQuery(async () => {
    if (!seeded || !isDbAvailable()) return undefined;
    const db = getDb();
    const [categories, accounts, transactions, budgets, imports, settings] =
      await Promise.all([
        db.categories.orderBy("sortOrder").toArray(),
        db.accounts.orderBy("name").toArray(),
        db.transactions.toArray(),
        db.budgets.toArray(),
        db.imports.orderBy("importedAt").reverse().toArray(),
        getSettings(),
      ]);
    return { categories, accounts, transactions, budgets, imports, settings };
  }, [seeded]);

  const settings = snapshot?.settings ?? DEFAULT_SETTINGS;
  const theme = settings.theme;

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing modes can block localStorage; the theme still applies.
    }
    applyTheme(next);
    void updateSettings({ theme: next });
  }, []);

  // Keep the DOM and the localStorage mirror in step with the persisted theme.
  useEffect(() => {
    if (!snapshot) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures — the applied theme is what matters.
    }
    applyTheme(theme);
  }, [snapshot, theme]);

  // Follow the OS when the user has chosen "system".
  useEffect(() => {
    if (theme !== "system" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const value = useMemo<AppData>(() => {
    if (!snapshot) {
      return { ...EMPTY, error, theme, setTheme };
    }
    return {
      ready: true,
      error,
      categories: snapshot.categories,
      accounts: snapshot.accounts,
      transactions: snapshot.transactions,
      budgets: snapshot.budgets,
      imports: snapshot.imports,
      settings: snapshot.settings,
      categoryById: new Map(snapshot.categories.map((c) => [c.id, c])),
      accountById: new Map(snapshot.accounts.map((a) => [a.id, a])),
      theme,
      setTheme,
    };
  }, [snapshot, error, theme, setTheme]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside an AppDataProvider");
  return context;
}
