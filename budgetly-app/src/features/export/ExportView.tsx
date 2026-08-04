"use client";

import { useMemo, useRef, useState } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { ExportIcon, ImportIcon, WarningIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { LoadingPanel } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  EMPTY_FILTERS,
  filterTransactions,
  sortTransactions,
  DEFAULT_SORT,
  type FlowFilter,
  type TransactionFilters,
} from "@/lib/analytics/selectors";
import { transactionsToCsv } from "@/lib/csv/exportCsv";
import { formatTimestamp, isIsoDate } from "@/lib/date";
import {
  backupFilename,
  createBackup,
  readBackupText,
  restoreBackup,
  summarizeBackup,
  transactionsFilename,
  type BackupSummary,
} from "@/lib/db/backup";
import { BACKUP_SCHEMA_VERSION, type Backup } from "@/lib/db/schema";
import { downloadFile } from "@/lib/download";

export function ExportView() {
  const data = useAppData();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [pendingRestore, setPendingRestore] = useState<{
    backup: Backup;
    summary: BackupSummary;
    filename: string;
  } | null>(null);
  const [restoreErrors, setRestoreErrors] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => sortTransactions(filterTransactions(data.transactions, filters), DEFAULT_SORT),
    [data.transactions, filters],
  );

  function patchFilters(patch: Partial<TransactionFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function exportCsv(scope: "filtered" | "all") {
    const rows =
      scope === "all"
        ? sortTransactions(data.transactions, DEFAULT_SORT)
        : filtered;
    if (rows.length === 0) {
      showToast({ tone: "warning", message: "There is nothing to export." });
      return;
    }
    downloadFile(
      transactionsFilename(scope),
      transactionsToCsv(rows, {
        categories: data.categories,
        accounts: data.accounts,
      }),
      "text/csv",
    );
    showToast({
      tone: "success",
      message: `Exported ${rows.length} transaction${rows.length === 1 ? "" : "s"} to CSV.`,
    });
  }

  async function exportBackup() {
    const backup = await createBackup();
    downloadFile(
      backupFilename(),
      `${JSON.stringify(backup, null, 2)}\n`,
      "application/json",
    );
    showToast({ tone: "success", message: "Backup downloaded." });
  }

  async function pickRestoreFile(file: File | undefined) {
    if (!file) return;
    setRestoreErrors([]);
    const text = await file.text();
    const result = readBackupText(text);
    if (!result.ok) {
      setPendingRestore(null);
      setRestoreErrors(result.errors);
      return;
    }
    setPendingRestore({
      backup: result.backup,
      summary: summarizeBackup(result.backup),
      filename: file.name,
    });
  }

  async function confirmRestore() {
    if (!pendingRestore) return;
    setRestoring(true);
    try {
      await restoreBackup(pendingRestore.backup);
      showToast({
        tone: "success",
        message: `Restored ${pendingRestore.summary.transactions} transactions from ${pendingRestore.filename}.`,
      });
      setPendingRestore(null);
    } catch {
      showToast({ tone: "danger", message: "The restore could not be completed." });
    } finally {
      setRestoring(false);
    }
  }

  if (!data.ready) return <LoadingPanel />;

  return (
    <>
      <PageHeader
        title="Export &amp; backup"
        description="Take your data with you. Everything is generated in this browser."
      />

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader
            title="Export transactions to CSV"
            description="Opens cleanly in Excel and Google Sheets. Amounts are negative for expenses."
          />
          <CardBody className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="From date"
                type="date"
                value={filters.from ?? ""}
                onChange={(event) =>
                  patchFilters({
                    from: isIsoDate(event.target.value) ? event.target.value : null,
                  })
                }
              />
              <TextField
                label="To date"
                type="date"
                value={filters.to ?? ""}
                onChange={(event) =>
                  patchFilters({
                    to: isIsoDate(event.target.value) ? event.target.value : null,
                  })
                }
              />
              <SelectField
                label="Category"
                value={filters.categoryIds[0] ?? ""}
                onChange={(event) =>
                  patchFilters({
                    categoryIds: event.target.value ? [event.target.value] : [],
                  })
                }
              >
                <option value="">All categories</option>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Type"
                value={filters.flow}
                onChange={(event) =>
                  patchFilters({ flow: event.target.value as FlowFilter })
                }
              >
                <option value="all">Income and expenses</option>
                <option value="expense">Expenses only</option>
                <option value="income">Income only</option>
              </SelectField>
            </div>

            <p className="text-sm text-ink-muted">
              {filtered.length} of {data.transactions.length} transactions match these
              filters.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => exportCsv("filtered")}
                disabled={filtered.length === 0}
              >
                <ExportIcon className="size-4" />
                Export {filtered.length} filtered
              </Button>
              <Button
                onClick={() => exportCsv("all")}
                disabled={data.transactions.length === 0}
              >
                Export all {data.transactions.length}
              </Button>
              <Button variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Back up everything to JSON"
            description={`Schema version ${BACKUP_SCHEMA_VERSION}. Includes transactions, categories, budgets, accounts, import history and settings.`}
          />
          <CardBody className="flex flex-col gap-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-4">
              {[
                ["Transactions", data.transactions.length],
                ["Categories", data.categories.length],
                ["Budgets", data.budgets.length],
                ["Imports", data.imports.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-surface-muted p-3">
                  <dt className="text-xs text-ink-subtle uppercase">{label}</dt>
                  <dd className="tabular mt-0.5 text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <Button variant="primary" onClick={exportBackup}>
                <ExportIcon className="size-4" />
                Download backup
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Restore from a backup"
            description="Replaces everything currently stored in this browser."
          />
          <CardBody className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="restore-input"
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
              >
                <ImportIcon className="size-4" />
                Choose a backup file
              </label>
              <input
                ref={restoreInputRef}
                id="restore-input"
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  void pickRestoreFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>

            {restoreErrors.length > 0 ? (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <WarningIcon className="size-4 text-danger" />
                  That file is not a valid Budgetly backup
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm text-ink-muted">
                  {restoreErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={pendingRestore !== null}
        onClose={() => setPendingRestore(null)}
        onConfirm={confirmRestore}
        title="Restore this backup?"
        description="Your current transactions, categories, budgets and settings will be replaced."
        confirmLabel="Replace my data"
        destructive
        busy={restoring}
      >
        {pendingRestore ? (
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">File</dt>
              <dd className="font-medium">{pendingRestore.filename}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Created</dt>
              <dd className="font-medium">
                {formatTimestamp(pendingRestore.summary.exportedAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Transactions</dt>
              <dd className="tabular font-medium">
                {pendingRestore.summary.transactions}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Categories</dt>
              <dd className="tabular font-medium">
                {pendingRestore.summary.categories}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Budgets</dt>
              <dd className="tabular font-medium">{pendingRestore.summary.budgets}</dd>
            </div>
          </dl>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
