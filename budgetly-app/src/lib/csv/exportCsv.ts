import Papa from "papaparse";
import type { Account, Category, Transaction } from "@/lib/db/schema";
import { centsToDecimalString } from "@/lib/money";

/** Header row of a Budgetly CSV export — also a valid Budgetly import layout. */
export const EXPORT_HEADERS = [
  "Date",
  "Description",
  "Amount",
  "Category",
  "Account",
  "Notes",
] as const;

/**
 * Serializes transactions to CSV.
 *
 * Amounts keep Budgetly's sign convention (negative = expense) and are written as
 * plain decimals with no currency symbol or thousands separators, so the file
 * round-trips through Excel and Google Sheets without mangling.
 */
export function transactionsToCsv(
  transactions: Transaction[],
  lookups: { categories: Category[]; accounts: Account[] },
): string {
  const categoryName = new Map(lookups.categories.map((c) => [c.id, c.name]));
  const accountName = new Map(lookups.accounts.map((a) => [a.id, a.name]));

  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.description,
    centsToDecimalString(transaction.amountCents),
    categoryName.get(transaction.categoryId) ?? "Uncategorized",
    accountName.get(transaction.accountId) ?? "",
    transaction.notes,
  ]);

  const csv = Papa.unparse({ fields: [...EXPORT_HEADERS], data: rows }, {
    newline: "\r\n",
  });

  // A UTF-8 BOM makes Excel read accented merchant names correctly; Google
  // Sheets and Papa Parse both skip it.
  return `﻿${csv}\r\n`;
}
