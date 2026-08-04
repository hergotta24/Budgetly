import { parseDateToIso } from "@/lib/date";
import { INCOME_ID, UNCATEGORIZED_ID } from "@/lib/db/defaults";
import type { Category, ColumnMapping, Transaction } from "@/lib/db/schema";
import { createId } from "@/lib/id";
import { parseAmountToCents } from "@/lib/money";
import { buildFingerprint } from "./fingerprint";
import type { ParsedCsvFile } from "./parse";

/** Account name used when a file has no account column. */
export const FALLBACK_ACCOUNT_NAME = "Primary account";

export type StagedStatus = "ready" | "duplicate" | "invalid";

export type StagedDraft = {
  date: string;
  description: string;
  /** Signed integer cents; negative = expense. */
  amountCents: number;
  categoryId: string;
  accountName: string;
  fingerprint: string;
};

export type StagedRow = {
  /** 1-based index among the file's data rows, matching what a user sees. */
  rowNumber: number;
  status: StagedStatus;
  /** Why a row is invalid, or what was adjusted, in plain language. */
  issues: string[];
  duplicateOf: "existing" | "file" | null;
  draft: StagedDraft | null;
  raw: Record<string, string>;
};

export type StagedFile = {
  filename: string;
  rows: StagedRow[];
  readyCount: number;
  duplicateCount: number;
  invalidCount: number;
};

export type BuildContext = {
  categories: Category[];
  /** Fingerprints already stored in the database. */
  existingFingerprints: ReadonlySet<string>;
};

function resolveAmountCents(
  row: Record<string, string>,
  mapping: ColumnMapping,
): { cents: number | null; issue: string | null } {
  if (mapping.amountMode === "debit-credit") {
    const debitRaw = mapping.debit ? (row[mapping.debit] ?? "") : "";
    const creditRaw = mapping.credit ? (row[mapping.credit] ?? "") : "";
    const debit = debitRaw.trim() === "" ? null : parseAmountToCents(debitRaw);
    const credit = creditRaw.trim() === "" ? null : parseAmountToCents(creditRaw);

    if (debit === null && credit === null) {
      if (debitRaw.trim() !== "" || creditRaw.trim() !== "") {
        return { cents: null, issue: `Could not read the debit/credit amount.` };
      }
      return { cents: null, issue: "No debit or credit amount on this row." };
    }

    // Debit columns mean money out and credit columns mean money in, regardless
    // of how the file signs them.
    const outflow = debit === null ? 0 : Math.abs(debit);
    const inflow = credit === null ? 0 : Math.abs(credit);
    const cents = inflow - outflow;
    if (cents === 0 && inflow === 0 && outflow === 0) {
      return { cents: null, issue: "Amount is zero." };
    }
    return { cents, issue: null };
  }

  const raw = mapping.amount ? (row[mapping.amount] ?? "") : "";
  if (raw.trim() === "") return { cents: null, issue: "Amount is empty." };

  const parsed = parseAmountToCents(raw);
  if (parsed === null) {
    return { cents: null, issue: `Could not read "${raw}" as an amount.` };
  }
  if (parsed === 0) return { cents: null, issue: "Amount is zero." };

  const cents =
    mapping.signConvention === "positive-is-expense" ? -parsed : parsed;
  return { cents, issue: null };
}

function resolveCategoryId(
  row: Record<string, string>,
  mapping: ColumnMapping,
  categories: Category[],
  amountCents: number,
): { categoryId: string; issue: string | null } {
  const rawName = mapping.category ? (row[mapping.category] ?? "").trim() : "";

  if (rawName !== "") {
    const match = categories.find(
      (category) => category.name.toLowerCase() === rawName.toLowerCase(),
    );
    if (match) return { categoryId: match.id, issue: null };
    return {
      categoryId: amountCents > 0 ? INCOME_ID : UNCATEGORIZED_ID,
      issue: `No category named "${rawName}" exists yet — imported as ${
        amountCents > 0 ? "Income" : "Uncategorized"
      }.`,
    };
  }

  return {
    categoryId: amountCents > 0 ? INCOME_ID : UNCATEGORIZED_ID,
    issue: null,
  };
}

/**
 * Turns parsed CSV rows into staged transactions, flagging invalid rows and
 * likely duplicates. Nothing is written to the database here — the user reviews
 * the result first.
 */
export function buildStagedFile(
  file: ParsedCsvFile,
  mapping: ColumnMapping,
  context: BuildContext,
): StagedFile {
  const rows: StagedRow[] = [];
  const seenInFile = new Set<string>();

  file.rows.forEach((raw, index) => {
    const rowNumber = index + 1;
    const issues: string[] = [];

    const rawDate = (raw[mapping.date] ?? "").trim();
    const date = parseDateToIso(rawDate, mapping.dateOrder);
    if (!date) {
      issues.push(
        rawDate === ""
          ? "Date is empty."
          : `Could not read "${rawDate}" as a date.`,
      );
    }

    const description = (raw[mapping.description] ?? "").trim();
    if (description === "") issues.push("Description is empty.");

    const amount = resolveAmountCents(raw, mapping);
    if (amount.issue) issues.push(amount.issue);

    if (!date || description === "" || amount.cents === null) {
      rows.push({
        rowNumber,
        status: "invalid",
        issues,
        duplicateOf: null,
        draft: null,
        raw,
      });
      return;
    }

    const accountName =
      (mapping.account ? (raw[mapping.account] ?? "").trim() : "") ||
      FALLBACK_ACCOUNT_NAME;

    const category = resolveCategoryId(raw, mapping, context.categories, amount.cents);
    if (category.issue) issues.push(category.issue);

    const fingerprint = buildFingerprint({
      date,
      description,
      amountCents: amount.cents,
      account: accountName,
    });

    let duplicateOf: StagedRow["duplicateOf"] = null;
    if (context.existingFingerprints.has(fingerprint)) {
      duplicateOf = "existing";
    } else if (seenInFile.has(fingerprint)) {
      duplicateOf = "file";
    }
    seenInFile.add(fingerprint);

    rows.push({
      rowNumber,
      status: duplicateOf ? "duplicate" : "ready",
      issues,
      duplicateOf,
      draft: {
        date,
        description,
        amountCents: amount.cents,
        categoryId: category.categoryId,
        accountName,
        fingerprint,
      },
      raw,
    });
  });

  return {
    filename: file.filename,
    rows,
    readyCount: rows.filter((row) => row.status === "ready").length,
    duplicateCount: rows.filter((row) => row.status === "duplicate").length,
    invalidCount: rows.filter((row) => row.status === "invalid").length,
  };
}

/** Distinct account names referenced by the importable rows. */
export function collectAccountNames(files: StagedFile[]): string[] {
  const names = new Set<string>();
  for (const file of files) {
    for (const row of file.rows) {
      if (row.draft) names.add(row.draft.accountName);
    }
  }
  return Array.from(names);
}

export type MaterializeOptions = {
  /** Row keys (`filename#rowNumber`) of duplicates the user chose to keep. */
  includedDuplicates: ReadonlySet<string>;
  accountIdByName: ReadonlyMap<string, string>;
  importId: string;
  timestamp: string;
};

/** Stable key identifying a staged row across the review UI. */
export function stagedRowKey(filename: string, rowNumber: number): string {
  return `${filename}#${rowNumber}`;
}

/**
 * Converts the rows the user accepted into persistable transactions. Invalid rows
 * are always dropped; duplicates are included only when explicitly selected.
 */
export function materializeTransactions(
  files: StagedFile[],
  options: MaterializeOptions,
): Transaction[] {
  const transactions: Transaction[] = [];

  for (const file of files) {
    for (const row of file.rows) {
      if (!row.draft) continue;
      if (
        row.status === "duplicate" &&
        !options.includedDuplicates.has(stagedRowKey(file.filename, row.rowNumber))
      ) {
        continue;
      }

      const accountId = options.accountIdByName.get(row.draft.accountName);
      if (!accountId) continue;

      transactions.push({
        id: createId("txn"),
        date: row.draft.date,
        description: row.draft.description,
        amountCents: row.draft.amountCents,
        categoryId: row.draft.categoryId,
        accountId,
        notes: "",
        sourceImportId: options.importId,
        fingerprint: row.draft.fingerprint,
        isDemo: false,
        createdAt: options.timestamp,
        updatedAt: options.timestamp,
      });
    }
  }

  return transactions;
}
