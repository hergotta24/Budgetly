import { createId } from "@/lib/id";
import { getDb } from "./db";
import {
  DEFAULT_ACCOUNT,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  SETTINGS_ID,
  UNCATEGORIZED_ID,
} from "./defaults";
import {
  appSettingsSchema,
  categorySchema,
  type Account,
  type AppSettings,
  type Backup,
  type Category,
  type CategoryKind,
  type ImportRecord,
  type MonthlyBudget,
  type Transaction,
} from "./schema";

/**
 * The repository layer. Every write the UI performs goes through one of these
 * functions, which keeps domain rules (reassignment on delete, budget upserts,
 * demo tagging) out of React components and testable on their own.
 */

function now(): string {
  return new Date().toISOString();
}

/** Creates default categories, the fallback account and settings on first run. */
export async function ensureSeeded(): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.categories, db.accounts, db.settings, async () => {
    if ((await db.categories.count()) === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    }
    if ((await db.accounts.count()) === 0) {
      await db.accounts.add(DEFAULT_ACCOUNT);
    }
    if (!(await db.settings.get(SETTINGS_ID))) {
      await db.settings.add(DEFAULT_SETTINGS);
    }
  });
}

export async function getSettings(): Promise<AppSettings> {
  const stored = await getDb().settings.get(SETTINGS_ID);
  if (!stored) return DEFAULT_SETTINGS;
  const parsed = appSettingsSchema.safeParse(stored);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const db = getDb();
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID });
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                    */
/* -------------------------------------------------------------------------- */

/** Finds an account by name (case-insensitive) or creates it. */
export async function ensureAccount(name: string, isDemo = false): Promise<Account> {
  const db = getDb();
  const trimmed = name.trim() || "Primary account";
  const existing = await db.accounts.toArray();
  const match = existing.find(
    (account) => account.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (match) return match;

  const account: Account = { id: createId("acct"), name: trimmed, isDemo };
  await db.accounts.add(account);
  return account;
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export async function createCategory(input: {
  name: string;
  color: string;
  kind: CategoryKind;
}): Promise<Category> {
  const db = getDb();
  const maxOrder = (await db.categories.toArray()).reduce(
    (max, category) => Math.max(max, category.sortOrder),
    0,
  );
  const category = categorySchema.parse({
    id: createId("cat"),
    name: input.name.trim(),
    color: input.color,
    kind: input.kind,
    isSystem: false,
    sortOrder: maxOrder + 10,
  });
  await db.categories.add(category);
  return category;
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, "name" | "color" | "kind">>,
): Promise<void> {
  const db = getDb();
  const existing = await db.categories.get(id);
  if (!existing) return;
  const next = categorySchema.parse({
    ...existing,
    ...patch,
    name: (patch.name ?? existing.name).trim(),
    // System categories keep their kind so income accounting stays correct.
    kind: existing.isSystem ? existing.kind : (patch.kind ?? existing.kind),
  });
  await db.categories.put(next);
}

/**
 * Deletes a category, moving its transactions and budgets to `reassignToId`
 * (defaulting to Uncategorized). System categories are never deleted.
 */
export async function deleteCategory(
  id: string,
  reassignToId: string = UNCATEGORIZED_ID,
): Promise<void> {
  const db = getDb();
  const category = await db.categories.get(id);
  if (!category || category.isSystem) return;
  const target = reassignToId === id ? UNCATEGORIZED_ID : reassignToId;

  await db.transaction("rw", db.categories, db.transactions, db.budgets, async () => {
    const affected = await db.transactions.where("categoryId").equals(id).toArray();
    if (affected.length > 0) {
      const timestamp = now();
      await db.transactions.bulkPut(
        affected.map((transaction) => ({
          ...transaction,
          categoryId: target,
          updatedAt: timestamp,
        })),
      );
    }
    await db.budgets.where("categoryId").equals(id).delete();
    await db.categories.delete(id);
  });
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export async function addTransactions(transactions: Transaction[]): Promise<void> {
  if (transactions.length === 0) return;
  await getDb().transactions.bulkPut(transactions);
}

export type TransactionEdit = Partial<
  Pick<
    Transaction,
    "date" | "description" | "amountCents" | "categoryId" | "accountId" | "notes"
  >
>;

export async function updateTransaction(
  id: string,
  patch: TransactionEdit,
): Promise<void> {
  const db = getDb();
  const existing = await db.transactions.get(id);
  if (!existing) return;
  await db.transactions.put({ ...existing, ...patch, updatedAt: now() });
}

export async function setTransactionCategory(
  id: string,
  categoryId: string,
): Promise<void> {
  await updateTransaction(id, { categoryId });
}

export async function bulkSetCategory(
  ids: string[],
  categoryId: string,
): Promise<number> {
  if (ids.length === 0) return 0;
  const db = getDb();
  const rows = await db.transactions.bulkGet(ids);
  const timestamp = now();
  const updated = rows
    .filter((row): row is Transaction => Boolean(row))
    .map((row) => ({ ...row, categoryId, updatedAt: timestamp }));
  await db.transactions.bulkPut(updated);
  return updated.length;
}

/** Deletes a transaction and returns it, so the UI can offer an undo. */
export async function deleteTransaction(id: string): Promise<Transaction | null> {
  const db = getDb();
  const existing = await db.transactions.get(id);
  if (!existing) return null;
  await db.transactions.delete(id);
  return existing;
}

export async function bulkDeleteTransactions(ids: string[]): Promise<Transaction[]> {
  if (ids.length === 0) return [];
  const db = getDb();
  const rows = (await db.transactions.bulkGet(ids)).filter((row): row is Transaction =>
    Boolean(row),
  );
  await db.transactions.bulkDelete(rows.map((row) => row.id));
  return rows;
}

/** Puts previously deleted transactions back (undo). */
export async function restoreTransactions(transactions: Transaction[]): Promise<void> {
  if (transactions.length === 0) return;
  await getDb().transactions.bulkPut(transactions);
}

/** Existing fingerprints, used to detect duplicates before an import. */
export async function getExistingFingerprints(): Promise<Set<string>> {
  const rows = await getDb().transactions.toArray();
  return new Set(rows.map((row) => row.fingerprint));
}

/* -------------------------------------------------------------------------- */
/* Budgets                                                                     */
/* -------------------------------------------------------------------------- */

/** Creates or updates the budget for a category in a month. `0` removes it. */
export async function setBudget(
  month: string,
  categoryId: string,
  limitCents: number,
): Promise<void> {
  const db = getDb();
  const existing = await db.budgets
    .where("[month+categoryId]")
    .equals([month, categoryId])
    .first();

  if (limitCents <= 0) {
    if (existing) await db.budgets.delete(existing.id);
    return;
  }

  const budget: MonthlyBudget = {
    id: existing?.id ?? createId("bud"),
    month,
    categoryId,
    limitCents,
    isDemo: existing?.isDemo ?? false,
  };
  await db.budgets.put(budget);
}

export async function deleteBudget(id: string): Promise<void> {
  await getDb().budgets.delete(id);
}

/**
 * Copies every budget from `fromMonth` into `toMonth`, overwriting existing
 * limits for the same categories. Returns how many budgets were written.
 */
export async function copyBudgets(fromMonth: string, toMonth: string): Promise<number> {
  const db = getDb();
  const source = await db.budgets.where("month").equals(fromMonth).toArray();
  if (source.length === 0) return 0;

  await db.transaction("rw", db.budgets, async () => {
    const existing = await db.budgets.where("month").equals(toMonth).toArray();
    const byCategory = new Map(existing.map((budget) => [budget.categoryId, budget]));
    await db.budgets.bulkPut(
      source.map((budget) => ({
        id: byCategory.get(budget.categoryId)?.id ?? createId("bud"),
        month: toMonth,
        categoryId: budget.categoryId,
        limitCents: budget.limitCents,
        isDemo: false,
      })),
    );
  });

  return source.length;
}

/* -------------------------------------------------------------------------- */
/* Imports                                                                     */
/* -------------------------------------------------------------------------- */

export async function recordImport(record: ImportRecord): Promise<void> {
  await getDb().imports.put(record);
}

/** Deletes an import record and every transaction that came from it. */
export async function deleteImport(importId: string): Promise<number> {
  const db = getDb();
  let removed = 0;
  await db.transaction("rw", db.imports, db.transactions, async () => {
    removed = await db.transactions.where("sourceImportId").equals(importId).delete();
    await db.imports.delete(importId);
  });
  return removed;
}

/* -------------------------------------------------------------------------- */
/* Whole-database operations                                                   */
/* -------------------------------------------------------------------------- */

/** Wipes every table and re-seeds defaults. */
export async function resetAllData(): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    [db.transactions, db.categories, db.budgets, db.accounts, db.imports, db.settings],
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.budgets.clear(),
        db.accounts.clear(),
        db.imports.clear(),
        db.settings.clear(),
      ]);
    },
  );
  await ensureSeeded();
}

/** Removes every record created by the demo dataset, leaving real data intact. */
export async function removeDemoData(): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    db.transactions,
    db.budgets,
    db.accounts,
    db.imports,
    async () => {
      await db.transactions.filter((row) => row.isDemo).delete();
      await db.budgets.filter((row) => row.isDemo).delete();
      await db.accounts.filter((row) => row.isDemo).delete();
      await db.imports.filter((row) => row.isDemo).delete();
    },
  );
}

export async function hasDemoData(): Promise<boolean> {
  return (
    (await getDb()
      .imports.filter((row) => row.isDemo)
      .count()) > 0
  );
}

/** Reads the whole database for a backup export. */
export async function readAll(): Promise<Backup["data"]> {
  const db = getDb();
  const [categories, accounts, transactions, budgets, imports, settings] =
    await Promise.all([
      db.categories.toArray(),
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.budgets.toArray(),
      db.imports.toArray(),
      getSettings(),
    ]);
  return { categories, accounts, transactions, budgets, imports, settings };
}

/** Replaces the whole database with a validated backup payload. */
export async function replaceAll(data: Backup["data"]): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    [db.transactions, db.categories, db.budgets, db.accounts, db.imports, db.settings],
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.budgets.clear(),
        db.accounts.clear(),
        db.imports.clear(),
        db.settings.clear(),
      ]);
      await Promise.all([
        db.categories.bulkAdd(data.categories),
        db.accounts.bulkAdd(data.accounts),
        db.transactions.bulkAdd(data.transactions),
        db.budgets.bulkAdd(data.budgets),
        db.imports.bulkAdd(data.imports),
        db.settings.add(data.settings),
      ]);
    },
  );
  await ensureSeeded();
}
