import type { ColumnMapping } from "@/lib/db/schema";

/** Column roles Budgetly can map a CSV header onto. */
export type ColumnRole =
  "date" | "description" | "amount" | "debit" | "credit" | "account" | "category";

const ALIASES: Record<ColumnRole, string[]> = {
  date: [
    "date",
    "transactiondate",
    "posteddate",
    "postdate",
    "postingdate",
    "datetime",
    "effectivedate",
    "valuedate",
    "bookingdate",
  ],
  description: [
    "description",
    "descriptions",
    "memo",
    "details",
    "detail",
    "merchant",
    "name",
    "payee",
    "narrative",
    "transactiondescription",
    "originaldescription",
    "reference",
  ],
  amount: [
    "amount",
    "transactionamount",
    "amt",
    "value",
    "total",
    "signedamount",
    "netamount",
  ],
  debit: [
    "debit",
    "debitamount",
    "withdrawal",
    "withdrawals",
    "withdraw",
    "outflow",
    "moneyout",
    "charge",
    "charges",
    "expense",
    "paidout",
  ],
  credit: [
    "credit",
    "creditamount",
    "deposit",
    "deposits",
    "inflow",
    "moneyin",
    "refund",
    "income",
    "paidin",
  ],
  account: [
    "account",
    "accountid",
    "accountnumber",
    "accountname",
    "card",
    "cardnumber",
    "source",
  ],
  category: ["category", "categories", "type", "classification", "tag", "bucket"],
};

/** Lowercases a header and drops punctuation so `"Post Date"` matches `postdate`. */
export function normalizeHeader(header: string): string {
  return header
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function scoreHeader(header: string, role: ColumnRole): number {
  const normalized = normalizeHeader(header);
  if (normalized === "") return 0;
  const aliases = ALIASES[role];

  const exactIndex = aliases.indexOf(normalized);
  if (exactIndex !== -1) return 100 - exactIndex;

  for (const [index, alias] of aliases.entries()) {
    if (normalized.includes(alias)) return 60 - index;
  }
  return 0;
}

/** Best-matching header for a role, or `null` when nothing scores above zero. */
export function detectColumn(headers: string[], role: ColumnRole): string | null {
  let best: { header: string; score: number } | null = null;
  for (const header of headers) {
    const score = scoreHeader(header, role);
    if (score > 0 && (!best || score > best.score)) best = { header, score };
  }
  return best?.header ?? null;
}

export type MappingDefaults = Pick<ColumnMapping, "signConvention" | "dateOrder">;

/**
 * Proposes a full column mapping for a freshly parsed file.
 *
 * When the file has separate debit/credit columns and no single amount column,
 * the mapping switches to `debit-credit` mode automatically.
 */
export function detectMapping(
  headers: string[],
  defaults: MappingDefaults,
): ColumnMapping {
  const date = detectColumn(headers, "date");
  const description = detectColumn(headers, "description");
  const amount = detectColumn(headers, "amount");
  const debit = detectColumn(headers, "debit");
  const credit = detectColumn(headers, "credit");
  const account = detectColumn(headers, "account");
  const category = detectColumn(headers, "category");

  const useDebitCredit = !amount && Boolean(debit || credit);

  return {
    date: date ?? "",
    description: description ?? "",
    amountMode: useDebitCredit ? "debit-credit" : "single",
    amount: useDebitCredit ? null : amount,
    debit: useDebitCredit ? debit : null,
    credit: useDebitCredit ? credit : null,
    account,
    category,
    signConvention: defaults.signConvention,
    dateOrder: defaults.dateOrder,
  };
}

/** Human-readable problems that stop a mapping from being usable. */
export function validateMapping(mapping: ColumnMapping): string[] {
  const errors: string[] = [];
  if (!mapping.date) errors.push("Choose the column that holds the transaction date.");
  if (!mapping.description) {
    errors.push("Choose the column that holds the description or merchant.");
  }
  if (mapping.amountMode === "single" && !mapping.amount) {
    errors.push("Choose the column that holds the amount.");
  }
  if (mapping.amountMode === "debit-credit" && !mapping.debit && !mapping.credit) {
    errors.push("Choose at least one of the debit or credit columns.");
  }
  return errors;
}
