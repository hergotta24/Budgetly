"use client";

import { useMemo, useState } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { FileIcon, ShieldIcon, TrashIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/AppShell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/Field";
import { EmptyState, LoadingPanel } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { formatTimestamp } from "@/lib/date";
import { loadDemoData } from "@/lib/db/demo";
import {
  deleteImport,
  removeDemoData,
  resetAllData,
  updateSettings,
} from "@/lib/db/repo";
import type { AppSettings } from "@/lib/db/schema";

type PendingAction =
  | { kind: "reset" }
  | { kind: "remove-demo" }
  | { kind: "load-demo" }
  | { kind: "delete-import"; id: string; filename: string; count: number }
  | null;

export function SettingsView() {
  const data = useAppData();
  const { showToast } = useToast();
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  const demoImport = useMemo(
    () => data.imports.find((record) => record.isDemo) ?? null,
    [data.imports],
  );
  const hasRealData = useMemo(
    () => data.transactions.some((transaction) => !transaction.isDemo),
    [data.transactions],
  );

  async function run(action: () => Promise<string>) {
    setBusy(true);
    try {
      const message = await action();
      showToast({ tone: "success", message });
      setPending(null);
    } catch {
      showToast({ tone: "danger", message: "That action could not be completed." });
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending() {
    if (!pending) return;
    if (pending.kind === "reset") {
      await run(async () => {
        await resetAllData();
        return "All local data has been erased.";
      });
      return;
    }
    if (pending.kind === "remove-demo") {
      await run(async () => {
        await removeDemoData();
        return "Demo data removed.";
      });
      return;
    }
    if (pending.kind === "load-demo") {
      await run(async () => {
        const dataset = await loadDemoData();
        await updateSettings({ onboardingCompleted: true });
        return `Loaded ${dataset.transactions.length} demo transactions.`;
      });
      return;
    }
    const target = pending;
    await run(async () => {
      const removed = await deleteImport(target.id);
      return `Removed ${target.filename} and ${removed} transaction${removed === 1 ? "" : "s"}.`;
    });
  }

  async function handleLoadDemo() {
    // Loading demo data alongside real transactions needs an explicit confirmation.
    if (hasRealData || demoImport) {
      setPending({ kind: "load-demo" });
      return;
    }
    await run(async () => {
      const dataset = await loadDemoData();
      await updateSettings({ onboardingCompleted: true });
      return `Loaded ${dataset.transactions.length} demo transactions.`;
    });
  }

  if (!data.ready) return <LoadingPanel />;

  const confirmCopy = (() => {
    switch (pending?.kind) {
      case "reset":
        return {
          title: "Erase all Budgetly data?",
          description:
            "Every transaction, category, budget, account and import record stored in this browser will be deleted, and the default categories restored. This cannot be undone — download a backup first if you might want it back.",
          confirmLabel: "Erase everything",
        };
      case "remove-demo":
        return {
          title: "Remove demo data?",
          description:
            "Only the fictional demo transactions, accounts and budgets are removed. Anything you imported yourself stays.",
          confirmLabel: "Remove demo data",
        };
      case "load-demo":
        return {
          title: "Add demo data to your existing data?",
          description: demoImport
            ? "The current demo dataset will be replaced with a fresh one. Your own transactions are not touched."
            : "The fictional demo transactions will be added alongside the data you already have. You can remove them again at any time.",
          confirmLabel: "Load demo data",
        };
      case "delete-import":
        return {
          title: `Delete ${pending.filename}?`,
          description: `This removes the import record and its ${pending.count} transaction${
            pending.count === 1 ? "" : "s"
          }. This cannot be undone.`,
          confirmLabel: "Delete import",
        };
      default:
        return { title: "", description: "", confirmLabel: "Confirm" };
    }
  })();

  return (
    <>
      <PageHeader
        title="Settings &amp; data"
        description="Preferences, demo data, import history and the reset switch."
      />

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Appearance" />
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Color theme</p>
              <p className="text-sm text-ink-subtle">
                &ldquo;System&rdquo; follows your operating system setting.
              </p>
            </div>
            <ThemeToggle />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Import defaults"
            description="Starting values on the CSV mapping step. You can still change them per file."
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Sign convention"
              value={data.settings.defaultSignConvention}
              onChange={(event) =>
                void updateSettings({
                  defaultSignConvention: event.target
                    .value as AppSettings["defaultSignConvention"],
                })
              }
            >
              <option value="negative-is-expense">Negative amounts are expenses</option>
              <option value="positive-is-expense">Positive amounts are expenses</option>
            </SelectField>

            <SelectField
              label="Ambiguous date order"
              value={data.settings.defaultDateOrder}
              onChange={(event) =>
                void updateSettings({
                  defaultDateOrder: event.target
                    .value as AppSettings["defaultDateOrder"],
                })
              }
            >
              <option value="mdy">Month first (US)</option>
              <option value="dmy">Day first</option>
              <option value="auto">Detect automatically</option>
            </SelectField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Demo data"
            description="A fictional six-month dataset for trying Budgetly out."
          />
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              {demoImport
                ? `Demo data loaded ${formatTimestamp(demoImport.importedAt)} · ${demoImport.importedCount} transactions.`
                : "No demo data is loaded."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={handleLoadDemo} disabled={busy}>
                {demoImport ? "Reload demo data" : "Load demo data"}
              </Button>
              {demoImport ? (
                <Button
                  onClick={() => setPending({ kind: "remove-demo" })}
                  disabled={busy}
                >
                  Remove demo data
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Import history"
            description="Every CSV you have imported into this browser."
          />
          <CardBody className="p-0 sm:p-0">
            {data.imports.length === 0 ? (
              <EmptyState title="No imports yet" />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {data.imports.map((record) => (
                  <li
                    key={record.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-ink">
                        <FileIcon className="size-4 shrink-0 text-ink-subtle" />
                        <span className="truncate">{record.filename}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-subtle">
                        {formatTimestamp(record.importedAt)} · {record.importedCount}{" "}
                        imported · {record.skippedCount} skipped ·{" "}
                        {record.duplicateCount} duplicates
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete import ${record.filename}`}
                      onClick={() =>
                        setPending({
                          kind: "delete-import",
                          id: record.id,
                          filename: record.filename,
                          count: record.importedCount,
                        })
                      }
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Where your data lives" />
          <CardBody className="flex items-start gap-3 text-sm leading-6 text-ink-muted">
            <ShieldIcon className="mt-0.5 size-5 shrink-0 text-brand" />
            <p>
              Budgetly stores everything in this browser&apos;s IndexedDB. There is no
              account, no server and no analytics — your CSV files are parsed locally
              and never uploaded. Clearing site data, using private browsing, or
              switching browsers or devices means starting over, so download a JSON
              backup from the Export page if you want to keep or move your data.
            </p>
          </CardBody>
        </Card>

        <Card className="border-danger/30">
          <CardHeader
            title="Reset all data"
            description="Erases everything stored in this browser and restores the default categories."
          />
          <CardBody>
            <Button
              variant="danger"
              onClick={() => setPending({ kind: "reset" })}
              disabled={busy}
            >
              <TrashIcon className="size-4" />
              Reset all data
            </Button>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        destructive={pending?.kind !== "load-demo"}
        busy={busy}
      />
    </>
  );
}
