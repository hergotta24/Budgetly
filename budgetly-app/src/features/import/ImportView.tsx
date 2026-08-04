"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { FileIcon, ImportIcon, TrashIcon, WarningIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/Field";
import { Badge, EmptyState, LoadingPanel } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  buildStagedFile,
  collectAccountNames,
  materializeTransactions,
  stagedRowKey,
  type StagedFile,
} from "@/lib/csv/buildImport";
import { detectMapping, validateMapping } from "@/lib/csv/detect";
import { CsvParseError, parseCsvFile, type ParsedCsvFile } from "@/lib/csv/parse";
import { formatDate } from "@/lib/date";
import type { ColumnMapping } from "@/lib/db/schema";
import {
  addTransactions,
  ensureAccount,
  getExistingFingerprints,
  recordImport,
  updateSettings,
} from "@/lib/db/repo";
import { createId } from "@/lib/id";
import { formatCentsSigned } from "@/lib/money";

type Step = "select" | "map" | "review" | "done";

type FileEntry = { parsed: ParsedCsvFile; mapping: ColumnMapping };

type ImportSummary = {
  files: number;
  imported: number;
  skipped: number;
  duplicatesFound: number;
  duplicatesImported: number;
};

const STEPS: { id: Step; label: string }[] = [
  { id: "select", label: "Choose files" },
  { id: "map", label: "Map columns" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {STEPS.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={
                state === "current"
                  ? "flex items-center gap-2 font-medium text-ink"
                  : state === "done"
                    ? "flex items-center gap-2 text-ink-muted"
                    : "flex items-center gap-2 text-ink-subtle"
              }
              aria-current={state === "current" ? "step" : undefined}
            >
              <span
                className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${
                  state === "todo"
                    ? "bg-surface-muted text-ink-subtle"
                    : "bg-brand text-brand-ink"
                }`}
              >
                {index + 1}
              </span>
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span aria-hidden="true" className="text-ink-subtle">
                ›
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function ImportView() {
  const data = useAppData();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("select");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState(0);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [includedDuplicates, setIncludedDuplicates] = useState<Set<string>>(new Set());
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const errors: string[] = [];
      const parsedEntries: FileEntry[] = [];

      for (const file of Array.from(fileList)) {
        if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
          errors.push(`${file.name}: only .csv files can be imported.`);
          continue;
        }
        try {
          const parsed = await parseCsvFile(file);
          parsedEntries.push({
            parsed,
            mapping: detectMapping(parsed.headers, {
              signConvention: data.settings.defaultSignConvention,
              dateOrder: data.settings.defaultDateOrder,
            }),
          });
        } catch (cause) {
          errors.push(
            `${file.name}: ${
              cause instanceof CsvParseError ? cause.message : "could not be read."
            }`,
          );
        }
      }

      setFileErrors(errors);
      if (parsedEntries.length > 0) {
        setEntries((current) => [...current, ...parsedEntries]);
        setStep("map");
        setActiveFile(0);
      }
    },
    [data.settings.defaultDateOrder, data.settings.defaultSignConvention],
  );

  const mappingErrors = useMemo(
    () => entries.map((entry) => validateMapping(entry.mapping)),
    [entries],
  );
  const canContinueToReview =
    entries.length > 0 && mappingErrors.every((errors) => errors.length === 0);

  function updateMapping(index: number, patch: Partial<ColumnMapping>) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, mapping: { ...entry.mapping, ...patch } }
          : entry,
      ),
    );
  }

  async function goToReview() {
    setBusy(true);
    try {
      const existingFingerprints = await getExistingFingerprints();
      const stagedFiles = entries.map((entry) =>
        buildStagedFile(entry.parsed, entry.mapping, {
          categories: data.categories,
          existingFingerprints,
        }),
      );
      setStaged(stagedFiles);
      setIncludedDuplicates(new Set());
      setStep("review");
    } catch {
      showToast({ tone: "danger", message: "Could not prepare the preview." });
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    try {
      const accountNames = collectAccountNames(staged);
      const accountIdByName = new Map<string, string>();
      for (const name of accountNames) {
        const account = await ensureAccount(name);
        accountIdByName.set(name, account.id);
      }

      const timestamp = new Date().toISOString();
      let imported = 0;
      let skipped = 0;
      let duplicatesFound = 0;
      let duplicatesImported = 0;

      for (const [index, file] of staged.entries()) {
        const importId = createId("import");
        const transactions = materializeTransactions([file], {
          includedDuplicates,
          accountIdByName,
          importId,
          timestamp,
        });

        const keptDuplicates = file.rows.filter(
          (row) =>
            row.status === "duplicate" &&
            includedDuplicates.has(stagedRowKey(file.filename, row.rowNumber)),
        ).length;

        await addTransactions(transactions);
        await recordImport({
          id: importId,
          filename: file.filename,
          importedAt: timestamp,
          importedCount: transactions.length,
          skippedCount: file.invalidCount + (file.duplicateCount - keptDuplicates),
          duplicateCount: file.duplicateCount,
          mapping: entries[index]?.mapping ?? null,
          isDemo: false,
        });

        imported += transactions.length;
        skipped += file.invalidCount + (file.duplicateCount - keptDuplicates);
        duplicatesFound += file.duplicateCount;
        duplicatesImported += keptDuplicates;
      }

      await updateSettings({ onboardingCompleted: true });

      setSummary({
        files: staged.length,
        imported,
        skipped,
        duplicatesFound,
        duplicatesImported,
      });
      setStep("done");
      showToast({
        tone: "success",
        message: `Imported ${imported} transaction${imported === 1 ? "" : "s"}.`,
      });
    } catch {
      showToast({
        tone: "danger",
        message:
          "Something went wrong while saving the import. Nothing partial was kept.",
      });
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setEntries([]);
    setStaged([]);
    setIncludedDuplicates(new Set());
    setFileErrors([]);
    setSummary(null);
    setActiveFile(0);
    setStep("select");
  }

  if (!data.ready) return <LoadingPanel />;

  return (
    <>
      <PageHeader
        title="Import transactions"
        description="Budgetly reads your CSV in this browser. The file is never uploaded."
      />
      <Stepper current={step} />

      {step === "select" ? (
        <SelectStep
          dragging={dragging}
          setDragging={setDragging}
          onFiles={acceptFiles}
          inputRef={inputRef}
          errors={fileErrors}
          recentImports={data.imports.slice(0, 5)}
        />
      ) : null}

      {step === "map" ? (
        <MapStep
          entries={entries}
          activeFile={activeFile}
          setActiveFile={setActiveFile}
          mappingErrors={mappingErrors}
          updateMapping={updateMapping}
          onRemoveFile={(index) => {
            setEntries((current) => current.filter((_, i) => i !== index));
            setActiveFile(0);
          }}
          onBack={restart}
          onContinue={goToReview}
          canContinue={canContinueToReview}
          busy={busy}
        />
      ) : null}

      {step === "review" ? (
        <ReviewStep
          staged={staged}
          includedDuplicates={includedDuplicates}
          setIncludedDuplicates={setIncludedDuplicates}
          categoryName={(id) => data.categoryById.get(id)?.name ?? "Uncategorized"}
          onBack={() => setStep("map")}
          onImport={runImport}
          busy={busy}
        />
      ) : null}

      {step === "done" && summary ? (
        <DoneStep summary={summary} onImportAnother={restart} />
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */

function SelectStep({
  dragging,
  setDragging,
  onFiles,
  inputRef,
  errors,
  recentImports,
}: {
  dragging: boolean;
  setDragging: (value: boolean) => void;
  onFiles: (files: FileList | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  errors: string[];
  recentImports: ReturnType<typeof useAppData>["imports"];
}) {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void onFiles(event.dataTransfer.files);
            }}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragging
                ? "border-brand bg-brand-soft"
                : "border-line bg-inset hover:border-line-strong"
            }`}
          >
            <ImportIcon className="size-8 text-ink-subtle" />
            <div>
              <p className="text-sm font-medium text-ink">
                Drag CSV files here, or choose them
              </p>
              <p className="mt-1 text-sm text-ink-subtle">
                One or more <code className="font-mono text-xs">.csv</code> exports from
                your bank or card issuer.
              </p>
            </div>

            <label
              htmlFor="csv-input"
              className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink hover:bg-brand-hover"
            >
              Choose CSV files
            </label>
            <input
              ref={inputRef}
              id="csv-input"
              type="file"
              accept=".csv,text/csv"
              multiple
              className="sr-only"
              onChange={(event) => {
                void onFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {errors.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2">
              {errors.map((error) => (
                <li
                  key={error}
                  className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink"
                >
                  <WarningIcon className="mt-0.5 size-4 shrink-0 text-danger" />
                  {error}
                </li>
              ))}
            </ul>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="What Budgetly needs"
          description="A header row plus, at minimum, a date, a description and an amount."
        />
        <CardBody className="text-sm leading-6 text-ink-muted">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Amounts can be a single signed column, or separate debit and credit
              columns.
            </li>
            <li>
              <code className="font-mono text-xs">$1,234.56</code>,{" "}
              <code className="font-mono text-xs">(45.00)</code> and{" "}
              <code className="font-mono text-xs">45.00-</code> are all understood.
            </li>
            <li>
              Dates like <code className="font-mono text-xs">2026-03-14</code>,{" "}
              <code className="font-mono text-xs">03/14/2026</code> and{" "}
              <code className="font-mono text-xs">Mar 14, 2026</code> are recognized;
              you can pick day-first or month-first for ambiguous files.
            </li>
            <li>Optional account and category columns are used when present.</li>
          </ul>
        </CardBody>
      </Card>

      {recentImports.length > 0 ? (
        <Card>
          <CardHeader title="Recent imports" />
          <CardBody className="p-0 sm:p-0">
            <ul className="divide-y divide-line-subtle">
              {recentImports.map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                    <FileIcon className="size-4 shrink-0 text-ink-subtle" />
                    <span className="truncate">{record.filename}</span>
                  </span>
                  <span className="text-xs text-ink-subtle">
                    {record.importedCount} imported · {record.skippedCount} skipped ·{" "}
                    {record.duplicateCount} duplicates
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function MapStep({
  entries,
  activeFile,
  setActiveFile,
  mappingErrors,
  updateMapping,
  onRemoveFile,
  onBack,
  onContinue,
  canContinue,
  busy,
}: {
  entries: FileEntry[];
  activeFile: number;
  setActiveFile: (index: number) => void;
  mappingErrors: string[][];
  updateMapping: (index: number, patch: Partial<ColumnMapping>) => void;
  onRemoveFile: (index: number) => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
  busy: boolean;
}) {
  const entry = entries[activeFile];
  if (!entry) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="No files selected"
            action={<Button onClick={onBack}>Choose files</Button>}
          />
        </CardBody>
      </Card>
    );
  }

  const { parsed, mapping } = entry;
  const errors = mappingErrors[activeFile] ?? [];
  const columnOptions = (
    <>
      <option value="">— not in this file —</option>
      {parsed.headers.map((header) => (
        <option key={header} value={header}>
          {header}
        </option>
      ))}
    </>
  );
  const sampleRows = parsed.rows.slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      {entries.length > 1 ? (
        <div
          role="tablist"
          aria-label="Files to import"
          className="flex flex-wrap gap-2"
        >
          {entries.map((item, index) => (
            <button
              key={`${item.parsed.filename}-${index}`}
              type="button"
              role="tab"
              aria-selected={index === activeFile}
              onClick={() => setActiveFile(index)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                index === activeFile
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line bg-surface text-ink-muted hover:text-ink"
              }`}
            >
              {item.parsed.filename}
              {(mappingErrors[index] ?? []).length > 0 ? (
                <WarningIcon className="size-4 text-warning" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={parsed.filename}
          description={`${parsed.rows.length} rows · ${parsed.headers.length} columns detected`}
          actions={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemoveFile(activeFile)}
              aria-label={`Remove ${parsed.filename}`}
            >
              <TrashIcon className="size-4" />
              Remove
            </Button>
          }
        />
        <CardBody className="flex flex-col gap-5">
          {parsed.warnings.length > 0 ? (
            <ul className="flex flex-col gap-1 text-xs text-warning">
              {parsed.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Date column"
              hint="required"
              value={mapping.date}
              onChange={(event) =>
                updateMapping(activeFile, { date: event.target.value })
              }
            >
              {columnOptions}
            </SelectField>

            <SelectField
              label="Description / merchant column"
              hint="required"
              value={mapping.description}
              onChange={(event) =>
                updateMapping(activeFile, { description: event.target.value })
              }
            >
              {columnOptions}
            </SelectField>

            <SelectField
              label="Amount layout"
              value={mapping.amountMode}
              onChange={(event) =>
                updateMapping(activeFile, {
                  amountMode: event.target.value as ColumnMapping["amountMode"],
                })
              }
            >
              <option value="single">One signed amount column</option>
              <option value="debit-credit">Separate debit and credit columns</option>
            </SelectField>

            {mapping.amountMode === "single" ? (
              <SelectField
                label="Amount column"
                hint="required"
                value={mapping.amount ?? ""}
                onChange={(event) =>
                  updateMapping(activeFile, { amount: event.target.value || null })
                }
              >
                {columnOptions}
              </SelectField>
            ) : (
              <>
                <SelectField
                  label="Debit (money out) column"
                  value={mapping.debit ?? ""}
                  onChange={(event) =>
                    updateMapping(activeFile, { debit: event.target.value || null })
                  }
                >
                  {columnOptions}
                </SelectField>
                <SelectField
                  label="Credit (money in) column"
                  value={mapping.credit ?? ""}
                  onChange={(event) =>
                    updateMapping(activeFile, { credit: event.target.value || null })
                  }
                >
                  {columnOptions}
                </SelectField>
              </>
            )}

            <SelectField
              label="Account column"
              hint="optional"
              value={mapping.account ?? ""}
              onChange={(event) =>
                updateMapping(activeFile, { account: event.target.value || null })
              }
            >
              {columnOptions}
            </SelectField>

            <SelectField
              label="Category column"
              hint="optional"
              value={mapping.category ?? ""}
              onChange={(event) =>
                updateMapping(activeFile, { category: event.target.value || null })
              }
            >
              {columnOptions}
            </SelectField>

            {mapping.amountMode === "single" ? (
              <SelectField
                label="Sign convention"
                value={mapping.signConvention}
                onChange={(event) =>
                  updateMapping(activeFile, {
                    signConvention: event.target
                      .value as ColumnMapping["signConvention"],
                  })
                }
              >
                <option value="negative-is-expense">
                  Negative amounts are expenses
                </option>
                <option value="positive-is-expense">
                  Positive amounts are expenses (card statements)
                </option>
              </SelectField>
            ) : null}

            <SelectField
              label="Ambiguous date order"
              hint="for files like 03/04/2026"
              value={mapping.dateOrder}
              onChange={(event) =>
                updateMapping(activeFile, {
                  dateOrder: event.target.value as ColumnMapping["dateOrder"],
                })
              }
            >
              <option value="mdy">Month first (US)</option>
              <option value="dmy">Day first</option>
              <option value="auto">Detect automatically</option>
            </SelectField>
          </div>

          {errors.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-danger">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium text-ink">First rows in this file</p>
            <div className="overflow-x-auto rounded-lg border border-line-subtle">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-ink-subtle uppercase">
                  <tr>
                    {parsed.headers.map((header) => (
                      <th key={header} scope="col" className="px-3 py-2 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {sampleRows.map((row, index) => (
                    <tr key={index}>
                      {parsed.headers.map((header) => (
                        <td
                          key={header}
                          className="px-3 py-2 text-ink-muted whitespace-nowrap"
                        >
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-between gap-2">
        <Button onClick={onBack}>Start over</Button>
        <Button variant="primary" onClick={onContinue} disabled={!canContinue || busy}>
          {busy ? "Preparing…" : "Preview import"}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ReviewStep({
  staged,
  includedDuplicates,
  setIncludedDuplicates,
  categoryName,
  onBack,
  onImport,
  busy,
}: {
  staged: StagedFile[];
  includedDuplicates: Set<string>;
  setIncludedDuplicates: (next: Set<string>) => void;
  categoryName: (id: string) => string;
  onBack: () => void;
  onImport: () => void;
  busy: boolean;
}) {
  const totals = staged.reduce(
    (acc, file) => ({
      ready: acc.ready + file.readyCount,
      duplicates: acc.duplicates + file.duplicateCount,
      invalid: acc.invalid + file.invalidCount,
    }),
    { ready: 0, duplicates: 0, invalid: 0 },
  );

  const willImport = totals.ready + includedDuplicates.size;

  function toggleDuplicate(key: string) {
    const next = new Set(includedDuplicates);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setIncludedDuplicates(next);
  }

  const duplicateRows = staged.flatMap((file) =>
    file.rows
      .filter((row) => row.status === "duplicate")
      .map((row) => ({ file: file.filename, row })),
  );

  const invalidRows = staged.flatMap((file) =>
    file.rows
      .filter((row) => row.status === "invalid")
      .map((row) => ({ file: file.filename, row })),
  );

  const readyRows = staged.flatMap((file) =>
    file.rows
      .filter((row) => row.status === "ready")
      .map((row) => ({ file: file.filename, row })),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line-subtle bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
            Ready to import
          </p>
          <p className="tabular mt-1 text-2xl font-semibold text-ink">{totals.ready}</p>
        </div>
        <div className="rounded-xl border border-line-subtle bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
            Likely duplicates
          </p>
          <p className="tabular mt-1 text-2xl font-semibold text-warning">
            {totals.duplicates}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">Skipped unless you tick them</p>
        </div>
        <div className="rounded-xl border border-line-subtle bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
            Rows with problems
          </p>
          <p className="tabular mt-1 text-2xl font-semibold text-danger">
            {totals.invalid}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">Always skipped</p>
        </div>
      </div>

      {duplicateRows.length > 0 ? (
        <Card>
          <CardHeader
            title="Review likely duplicates"
            description="These match a transaction you already have, or an earlier row in the same file. Tick any you want to import anyway."
            actions={
              <Button
                size="sm"
                onClick={() =>
                  setIncludedDuplicates(
                    includedDuplicates.size === duplicateRows.length
                      ? new Set()
                      : new Set(
                          duplicateRows.map(({ file, row }) =>
                            stagedRowKey(file, row.rowNumber),
                          ),
                        ),
                  )
                }
              >
                {includedDuplicates.size === duplicateRows.length
                  ? "Clear all"
                  : "Select all"}
              </Button>
            }
          />
          <CardBody className="p-0 sm:p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-ink-subtle uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Import
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Description
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Matches
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {duplicateRows.map(({ file, row }) => {
                    const key = stagedRowKey(file, row.rowNumber);
                    return (
                      <tr key={key}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--brand)]"
                            checked={includedDuplicates.has(key)}
                            onChange={() => toggleDuplicate(key)}
                            aria-label={`Import duplicate row ${row.rowNumber} from ${file}`}
                          />
                        </td>
                        <td className="tabular px-4 py-2 whitespace-nowrap">
                          {row.draft ? formatDate(row.draft.date) : "—"}
                        </td>
                        <td className="max-w-[22rem] truncate px-4 py-2">
                          {row.draft?.description}
                        </td>
                        <td className="tabular px-4 py-2 whitespace-nowrap">
                          {row.draft ? formatCentsSigned(row.draft.amountCents) : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <Badge tone="warning">
                            {row.duplicateOf === "existing"
                              ? "Existing transaction"
                              : "Earlier row in file"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {invalidRows.length > 0 ? (
        <Card>
          <CardHeader
            title="Rows that can't be imported"
            description="These are skipped. Fix them in the source file and import again if you need them."
          />
          <CardBody className="p-0 sm:p-0">
            <ul className="divide-y divide-line-subtle">
              {invalidRows.slice(0, 50).map(({ file, row }) => (
                <li
                  key={stagedRowKey(file, row.rowNumber)}
                  className="px-4 py-3 sm:px-5"
                >
                  <p className="text-sm font-medium text-ink">
                    {file} · row {row.rowNumber}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">
                    {row.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {invalidRows.length > 50 ? (
              <p className="px-4 py-3 text-sm text-ink-subtle sm:px-5">
                …and {invalidRows.length - 50} more.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Preview"
          description={`Showing the first ${Math.min(readyRows.length, 25)} of ${readyRows.length} rows that will be imported.`}
        />
        <CardBody className="p-0 sm:p-0">
          {readyRows.length === 0 ? (
            <EmptyState
              title="Nothing new to import"
              description="Every row in these files is either a duplicate or could not be read."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-ink-subtle uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Description
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Category
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Account
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {readyRows.slice(0, 25).map(({ file, row }) => (
                    <tr key={stagedRowKey(file, row.rowNumber)}>
                      <td className="tabular px-4 py-2 whitespace-nowrap">
                        {row.draft ? formatDate(row.draft.date) : "—"}
                      </td>
                      <td className="max-w-[20rem] truncate px-4 py-2">
                        {row.draft?.description}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {row.draft ? categoryName(row.draft.categoryId) : "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {row.draft?.accountName}
                      </td>
                      <td
                        className={`tabular px-4 py-2 text-right whitespace-nowrap ${
                          (row.draft?.amountCents ?? 0) > 0 ? "text-income" : "text-ink"
                        }`}
                      >
                        {row.draft ? formatCentsSigned(row.draft.amountCents) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-between gap-2">
        <Button onClick={onBack}>Back to mapping</Button>
        <Button
          variant="primary"
          onClick={onImport}
          disabled={busy || willImport === 0}
        >
          {busy
            ? "Importing…"
            : `Import ${willImport} transaction${willImport === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function DoneStep({
  summary,
  onImportAnother,
}: {
  summary: ImportSummary;
  onImportAnother: () => void;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col items-start gap-4">
        <Badge tone="income">Import complete</Badge>
        <div>
          <h2 className="text-lg font-semibold text-ink">
            {summary.imported} transaction{summary.imported === 1 ? "" : "s"} saved
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            From {summary.files} file{summary.files === 1 ? "" : "s"}. {summary.skipped}{" "}
            row{summary.skipped === 1 ? "" : "s"} skipped, {summary.duplicatesFound}{" "}
            likely duplicate{summary.duplicatesFound === 1 ? "" : "s"} found
            {summary.duplicatesImported > 0
              ? ` (${summary.duplicatesImported} imported on purpose)`
              : ""}
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/transactions"
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink hover:bg-brand-hover"
          >
            View transactions
          </Link>
          <Link
            href="/budgets"
            className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Set budgets
          </Link>
          <Button onClick={onImportAnother}>Import another file</Button>
        </div>
      </CardBody>
    </Card>
  );
}
