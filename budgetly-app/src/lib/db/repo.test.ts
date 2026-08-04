import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildFingerprint } from "@/lib/csv/fingerprint";
import { BudgetlyDatabase, setDb } from "./db";
import {
  backupFilename,
  createBackup,
  readBackupText,
  restoreBackup,
  summarizeBackup,
} from "./backup";
import { buildDemoDataset, loadDemoData } from "./demo";
import { DEFAULT_CATEGORIES, INCOME_ID, UNCATEGORIZED_ID } from "./defaults";
import {
  addTransactions,
  bulkSetCategory,
  copyBudgets,
  createCategory,
  deleteCategory,
  deleteImport,
  deleteTransaction,
  ensureAccount,
  ensureSeeded,
  getExistingFingerprints,
  getSettings,
  hasDemoData,
  recordImport,
  removeDemoData,
  resetAllData,
  restoreTransactions,
  setBudget,
  updateCategory,
  updateSettings,
  updateTransaction,
} from "./repo";
import { BACKUP_SCHEMA_VERSION, type Transaction } from "./schema";

let database: BudgetlyDatabase;
let dbIndex = 0;

beforeEach(async () => {
  dbIndex += 1;
  database = new BudgetlyDatabase(`budgetly-test-${dbIndex}`);
  setDb(database);
  await ensureSeeded();
});

afterEach(async () => {
  await database.delete();
  setDb(null);
});

let txnCounter = 0;

function makeTransaction(
  partial: Partial<Transaction> & { date: string; amountCents: number },
): Transaction {
  txnCounter += 1;
  const description = partial.description ?? `Merchant ${txnCounter}`;
  return {
    id: `txn-${txnCounter}`,
    description,
    categoryId: UNCATEGORIZED_ID,
    accountId: "acct-default",
    notes: "",
    sourceImportId: null,
    fingerprint: buildFingerprint({
      date: partial.date,
      description,
      amountCents: partial.amountCents,
      account: "Primary account",
    }),
    isDemo: false,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...partial,
  };
}

describe("seeding", () => {
  it("creates the default categories, account and settings", async () => {
    expect(await database.categories.count()).toBe(DEFAULT_CATEGORIES.length);
    expect(await database.accounts.count()).toBe(1);
    expect((await getSettings()).theme).toBe("system");
  });

  it("is idempotent", async () => {
    await ensureSeeded();
    await ensureSeeded();
    expect(await database.categories.count()).toBe(DEFAULT_CATEGORIES.length);
  });
});

describe("accounts", () => {
  it("reuses an existing account regardless of case", async () => {
    const first = await ensureAccount("Joint Checking");
    const second = await ensureAccount("joint checking");
    expect(second.id).toBe(first.id);
    expect(await database.accounts.count()).toBe(2); // default + joint
  });
});

describe("categories", () => {
  it("creates, renames and recolors custom categories", async () => {
    const created = await createCategory({
      name: "  Pets  ",
      color: "#4aa3a3",
      kind: "expense",
    });
    expect(created.name).toBe("Pets");

    await updateCategory(created.id, { name: "Pet care", color: "#b08a2e" });
    const updated = await database.categories.get(created.id);
    expect(updated).toMatchObject({ name: "Pet care", color: "#b08a2e" });
  });

  it("reassigns transactions when a category is deleted", async () => {
    const pets = await createCategory({
      name: "Pets",
      color: "#4aa3a3",
      kind: "expense",
    });
    await addTransactions([
      makeTransaction({ date: "2026-03-01", amountCents: -2500, categoryId: pets.id }),
      makeTransaction({ date: "2026-03-02", amountCents: -1500, categoryId: pets.id }),
    ]);
    await setBudget("2026-03", pets.id, 10000);

    await deleteCategory(pets.id, "cat-shopping");

    expect(await database.categories.get(pets.id)).toBeUndefined();
    expect(await database.budgets.where("categoryId").equals(pets.id).count()).toBe(0);
    const moved = await database.transactions.toArray();
    expect(moved.every((row) => row.categoryId === "cat-shopping")).toBe(true);
  });

  it("falls back to Uncategorized when no target is given", async () => {
    const pets = await createCategory({
      name: "Pets",
      color: "#4aa3a3",
      kind: "expense",
    });
    await addTransactions([
      makeTransaction({ date: "2026-03-01", amountCents: -2500, categoryId: pets.id }),
    ]);
    await deleteCategory(pets.id);
    const rows = await database.transactions.toArray();
    expect(rows[0]?.categoryId).toBe(UNCATEGORIZED_ID);
  });

  it("refuses to delete system categories", async () => {
    await deleteCategory(UNCATEGORIZED_ID, INCOME_ID);
    expect(await database.categories.get(UNCATEGORIZED_ID)).toBeDefined();
  });
});

describe("transactions", () => {
  it("edits a transaction and stamps updatedAt", async () => {
    const transaction = makeTransaction({ date: "2026-03-01", amountCents: -2500 });
    await addTransactions([transaction]);

    await updateTransaction(transaction.id, {
      description: "Renamed",
      amountCents: -3000,
    });

    const stored = await database.transactions.get(transaction.id);
    expect(stored).toMatchObject({ description: "Renamed", amountCents: -3000 });
    expect(stored?.updatedAt).not.toBe(transaction.updatedAt);
  });

  it("assigns a category to many transactions at once", async () => {
    const rows = [
      makeTransaction({ date: "2026-03-01", amountCents: -2500 }),
      makeTransaction({ date: "2026-03-02", amountCents: -1500 }),
      makeTransaction({ date: "2026-03-03", amountCents: -1000 }),
    ];
    await addTransactions(rows);

    const changed = await bulkSetCategory([rows[0]!.id, rows[1]!.id], "cat-groceries");

    expect(changed).toBe(2);
    const stored = await database.transactions.toArray();
    expect(stored.filter((row) => row.categoryId === "cat-groceries")).toHaveLength(2);
  });

  it("supports delete followed by undo", async () => {
    const transaction = makeTransaction({ date: "2026-03-01", amountCents: -2500 });
    await addTransactions([transaction]);

    const removed = await deleteTransaction(transaction.id);
    expect(await database.transactions.count()).toBe(0);

    await restoreTransactions(removed ? [removed] : []);
    expect(await database.transactions.count()).toBe(1);
  });

  it("exposes stored fingerprints for duplicate detection", async () => {
    const transaction = makeTransaction({ date: "2026-03-01", amountCents: -2500 });
    await addTransactions([transaction]);
    const fingerprints = await getExistingFingerprints();
    expect(fingerprints.has(transaction.fingerprint)).toBe(true);
  });
});

describe("budgets", () => {
  it("upserts a single budget per category and month", async () => {
    await setBudget("2026-03", "cat-groceries", 25000);
    await setBudget("2026-03", "cat-groceries", 30000);

    const rows = await database.budgets.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.limitCents).toBe(30000);
  });

  it("removes the budget when the limit drops to zero", async () => {
    await setBudget("2026-03", "cat-groceries", 25000);
    await setBudget("2026-03", "cat-groceries", 0);
    expect(await database.budgets.count()).toBe(0);
  });

  it("copies a month's budgets forward, overwriting matching categories", async () => {
    await setBudget("2026-02", "cat-groceries", 25000);
    await setBudget("2026-02", "cat-dining", 16000);
    await setBudget("2026-03", "cat-groceries", 99900);

    const copied = await copyBudgets("2026-02", "2026-03");

    expect(copied).toBe(2);
    const march = await database.budgets.where("month").equals("2026-03").toArray();
    expect(march).toHaveLength(2);
    expect(march.find((row) => row.categoryId === "cat-groceries")?.limitCents).toBe(
      25000,
    );
  });

  it("reports zero when the source month has no budgets", async () => {
    expect(await copyBudgets("2025-01", "2026-03")).toBe(0);
  });
});

describe("imports", () => {
  it("deletes an import and everything it created", async () => {
    await recordImport({
      id: "import-1",
      filename: "bank.csv",
      importedAt: "2026-03-01T00:00:00.000Z",
      importedCount: 2,
      skippedCount: 0,
      duplicateCount: 0,
      mapping: null,
      isDemo: false,
    });
    await addTransactions([
      makeTransaction({
        date: "2026-03-01",
        amountCents: -2500,
        sourceImportId: "import-1",
      }),
      makeTransaction({
        date: "2026-03-02",
        amountCents: -1500,
        sourceImportId: "import-1",
      }),
      makeTransaction({ date: "2026-03-03", amountCents: -1000 }),
    ]);

    const removed = await deleteImport("import-1");

    expect(removed).toBe(2);
    expect(await database.transactions.count()).toBe(1);
    expect(await database.imports.count()).toBe(0);
  });
});

describe("demo data", () => {
  it("is deterministic and clearly fictional", () => {
    const a = buildDemoDataset("2026-03", "2026-03-01T00:00:00.000Z");
    const b = buildDemoDataset("2026-03", "2026-03-01T00:00:00.000Z");
    expect(a.transactions.map((row) => row.amountCents)).toEqual(
      b.transactions.map((row) => row.amountCents),
    );
    expect(a.months).toHaveLength(6);
    expect(a.transactions.every((row) => row.isDemo)).toBe(true);
  });

  it("loads and removes cleanly without touching real data", async () => {
    await addTransactions([
      makeTransaction({ date: "2026-03-01", amountCents: -2500, description: "Mine" }),
    ]);

    await loadDemoData();
    expect(await hasDemoData()).toBe(true);
    expect(await database.transactions.count()).toBeGreaterThan(1);

    await removeDemoData();

    expect(await hasDemoData()).toBe(false);
    const remaining = await database.transactions.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.description).toBe("Mine");
    expect(await database.budgets.count()).toBe(0);
  });

  it("replaces rather than duplicates when loaded twice", async () => {
    const first = await loadDemoData();
    await loadDemoData();
    expect(await database.transactions.count()).toBe(first.transactions.length);
  });
});

describe("reset and backup", () => {
  it("erases everything and restores defaults", async () => {
    await addTransactions([
      makeTransaction({ date: "2026-03-01", amountCents: -2500 }),
    ]);
    await setBudget("2026-03", "cat-groceries", 25000);
    await createCategory({ name: "Pets", color: "#4aa3a3", kind: "expense" });

    await resetAllData();

    expect(await database.transactions.count()).toBe(0);
    expect(await database.budgets.count()).toBe(0);
    expect(await database.categories.count()).toBe(DEFAULT_CATEGORIES.length);
    expect((await getSettings()).onboardingCompleted).toBe(false);
  });

  it("round-trips a backup through reset and restore", async () => {
    await updateSettings({ theme: "dark", onboardingCompleted: true });
    const pets = await createCategory({
      name: "Pets",
      color: "#4aa3a3",
      kind: "expense",
    });
    await addTransactions([
      makeTransaction({
        date: "2026-03-01",
        amountCents: -2500,
        description: "Ivy Lane Pharmacy",
        categoryId: pets.id,
      }),
    ]);
    await setBudget("2026-03", pets.id, 25000);

    const backup = await createBackup();
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(summarizeBackup(backup)).toMatchObject({ transactions: 1, budgets: 1 });

    // Serialize and re-read exactly as the Export page does.
    const text = JSON.stringify(backup);
    await resetAllData();
    expect(await database.transactions.count()).toBe(0);

    const validation = readBackupText(text);
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    await restoreBackup(validation.backup);

    expect(await database.transactions.count()).toBe(1);
    const restored = await database.transactions.toArray();
    expect(restored[0]).toMatchObject({
      description: "Ivy Lane Pharmacy",
      amountCents: -2500,
      categoryId: pets.id,
    });
    expect(await database.budgets.count()).toBe(1);
    expect((await getSettings()).theme).toBe("dark");
    expect(await database.categories.get(pets.id)).toBeDefined();
  });

  it("names backups with a timestamp", () => {
    expect(backupFilename(new Date(2026, 2, 14, 9, 5))).toBe(
      "budgetly-backup_2026-03-14_0905.json",
    );
  });
});

describe("backup validation", () => {
  it("rejects non-JSON", () => {
    const result = readBackupText("not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain("valid JSON");
  });

  it("rejects a different schema version", () => {
    const result = readBackupText(
      JSON.stringify({ app: "budgetly", schemaVersion: 99, exportedAt: "x", data: {} }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain("schema version 99");
  });

  it("rejects a structurally invalid payload with readable errors", () => {
    const result = readBackupText(
      JSON.stringify({
        app: "budgetly",
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: "2026-03-14T00:00:00.000Z",
        data: {
          categories: [],
          accounts: [],
          transactions: [{ id: "x", date: "nope", amountCents: 1.5 }],
          budgets: [],
          imports: [],
          settings: { id: "app-settings" },
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.join(" ")).toContain("transactions.0");
    }
  });

  it("rejects fractional cents", async () => {
    const backup = await createBackup();
    const tampered = {
      ...backup,
      data: {
        ...backup.data,
        transactions: [
          {
            ...makeTransaction({ date: "2026-03-01", amountCents: -2500 }),
            amountCents: -25.5,
          },
        ],
      },
    };
    const result = readBackupText(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
  });
});
