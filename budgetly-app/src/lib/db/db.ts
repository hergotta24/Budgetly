import Dexie, { type Table } from "dexie";
import type {
  Account,
  AppSettings,
  Category,
  ImportRecord,
  MonthlyBudget,
  Transaction,
} from "./schema";

export const DB_NAME = "budgetly";

/**
 * The browser-local database. Budgetly never sends financial data anywhere — this
 * IndexedDB instance is the whole backend for the MVP.
 */
export class BudgetlyDatabase extends Dexie {
  declare transactions: Table<Transaction, string>;
  declare categories: Table<Category, string>;
  declare budgets: Table<MonthlyBudget, string>;
  declare accounts: Table<Account, string>;
  declare imports: Table<ImportRecord, string>;
  declare settings: Table<AppSettings, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      transactions: "id, date, categoryId, accountId, fingerprint, sourceImportId",
      categories: "id, name, kind, sortOrder",
      budgets: "id, month, categoryId, [month+categoryId]",
      accounts: "id, name",
      imports: "id, importedAt",
      settings: "id",
    });
  }
}

let instance: BudgetlyDatabase | null = null;

/**
 * Lazily creates the singleton database.
 *
 * Construction is deferred so that importing this module during server rendering
 * never touches the IndexedDB globals.
 */
export function getDb(): BudgetlyDatabase {
  if (!instance) instance = new BudgetlyDatabase();
  return instance;
}

/** Replaces the singleton — used by tests to isolate each case. */
export function setDb(next: BudgetlyDatabase | null): void {
  instance = next;
}

/** `true` when IndexedDB is reachable (false during server rendering). */
export function isDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
