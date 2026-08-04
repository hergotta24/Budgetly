import { addMonths, currentMonth, monthEnd, type IsoMonth } from "@/lib/date";
import { buildFingerprint } from "@/lib/csv/fingerprint";
import { createId } from "@/lib/id";
import { getDb } from "./db";
import { ensureSeeded } from "./repo";
import type { Account, ImportRecord, MonthlyBudget, Transaction } from "./schema";

/**
 * Demo dataset.
 *
 * Every merchant here is invented. Records are tagged `isDemo` so "Remove demo
 * data" can take exactly this dataset back out without touching anything the user
 * imported themselves.
 */

export const DEMO_IMPORT_ID = "import_demo";
export const DEMO_ACCOUNT_ID = "acct_demo_checking";
export const DEMO_CARD_ACCOUNT_ID = "acct_demo_card";
export const DEMO_MONTH_COUNT = 6;

/** Small deterministic PRNG so the demo dataset is identical on every machine. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

type DemoTemplate = {
  description: string;
  categoryId: string;
  /** Dollar amount, positive for income and negative for expenses. */
  baseDollars: number;
  /** Random +/- variation applied to `baseDollars`, in dollars. */
  jitterDollars: number;
  /** Day of month, or `"weekly"` for a recurring weekly charge. */
  day: number | "weekly";
  accountId: string;
};

const TEMPLATES: DemoTemplate[] = [
  {
    description: "Lantern Labs Payroll",
    categoryId: "cat-income",
    baseDollars: 3120,
    jitterDollars: 0,
    day: 1,
    accountId: DEMO_ACCOUNT_ID,
  },
  {
    description: "Lantern Labs Payroll",
    categoryId: "cat-income",
    baseDollars: 3120,
    jitterDollars: 0,
    day: 16,
    accountId: DEMO_ACCOUNT_ID,
  },
  {
    description: "Summit Ridge Apartments",
    categoryId: "cat-housing",
    baseDollars: -1650,
    jitterDollars: 0,
    day: 2,
    accountId: DEMO_ACCOUNT_ID,
  },
  {
    description: "Lumen Energy Co-op",
    categoryId: "cat-utilities",
    baseDollars: -104,
    jitterDollars: 28,
    day: 8,
    accountId: DEMO_ACCOUNT_ID,
  },
  {
    description: "Clearwater Broadband",
    categoryId: "cat-utilities",
    baseDollars: -72,
    jitterDollars: 0,
    day: 12,
    accountId: DEMO_ACCOUNT_ID,
  },
  {
    description: "Northwind Grocers",
    categoryId: "cat-groceries",
    baseDollars: -118,
    jitterDollars: 42,
    day: "weekly",
    accountId: DEMO_CARD_ACCOUNT_ID,
  },
  {
    description: "Blue Harbor Cafe",
    categoryId: "cat-dining",
    baseDollars: -18,
    jitterDollars: 9,
    day: "weekly",
    accountId: DEMO_CARD_ACCOUNT_ID,
  },
  {
    description: "Fable Coffee Roasters",
    categoryId: "cat-dining",
    baseDollars: -6,
    jitterDollars: 3,
    day: "weekly",
    accountId: DEMO_CARD_ACCOUNT_ID,
  },
  {
    description: "Grandview Transit Pass",
    categoryId: "cat-transportation",
    baseDollars: -96,
    jitterDollars: 0,
    day: 5,
    accountId: DEMO_ACCOUNT_ID,
  },
  {
    description: "Harborline Fuel",
    categoryId: "cat-transportation",
    baseDollars: -47,
    jitterDollars: 16,
    day: 19,
    accountId: DEMO_CARD_ACCOUNT_ID,
  },
  {
    description: "Aurora Streaming",
    categoryId: "cat-entertainment",
    baseDollars: -15,
    jitterDollars: 0,
    day: 22,
    accountId: DEMO_CARD_ACCOUNT_ID,
  },
  {
    description: "Pixel & Pine Books",
    categoryId: "cat-entertainment",
    baseDollars: -32,
    jitterDollars: 18,
    day: 24,
    accountId: DEMO_CARD_ACCOUNT_ID,
  },
  {
    description: "Cobblestone Hardware",
    categoryId: "cat-shopping",
    baseDollars: -64,
    jitterDollars: 35,
    day: 14,
    accountId: DEMO_CARD_ACCOUNT_ID,
  },
  {
    description: "Willowbrook Apparel",
    categoryId: "cat-shopping",
    baseDollars: -88,
    jitterDollars: 45,
    day: 27,
    accountId: DEMO_CARD_ACCOUNT_ID,
  },
  {
    description: "Ridgeline Fitness",
    categoryId: "cat-health",
    baseDollars: -42,
    jitterDollars: 0,
    day: 6,
    accountId: DEMO_ACCOUNT_ID,
  },
  {
    description: "Ivy Lane Pharmacy",
    categoryId: "cat-health",
    baseDollars: -26,
    jitterDollars: 14,
    day: 20,
    accountId: DEMO_CARD_ACCOUNT_ID,
  },
];

const DEMO_BUDGETS: { categoryId: string; limitDollars: number }[] = [
  { categoryId: "cat-housing", limitDollars: 1700 },
  { categoryId: "cat-groceries", limitDollars: 520 },
  { categoryId: "cat-dining", limitDollars: 160 },
  { categoryId: "cat-transportation", limitDollars: 180 },
  { categoryId: "cat-utilities", limitDollars: 200 },
  { categoryId: "cat-shopping", limitDollars: 150 },
  { categoryId: "cat-entertainment", limitDollars: 60 },
  { categoryId: "cat-health", limitDollars: 90 },
];

const DEMO_ACCOUNTS: Account[] = [
  { id: DEMO_ACCOUNT_ID, name: "Demo Checking", isDemo: true },
  { id: DEMO_CARD_ACCOUNT_ID, name: "Demo Credit Card", isDemo: true },
];

const ACCOUNT_NAMES = new Map(
  DEMO_ACCOUNTS.map((account) => [account.id, account.name]),
);

function clampDay(month: IsoMonth, day: number): string {
  const last = Number(monthEnd(month).slice(8));
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export type DemoDataset = {
  accounts: Account[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  importRecord: ImportRecord;
  months: IsoMonth[];
};

/** Builds the demo dataset for the `DEMO_MONTH_COUNT` months ending at `endMonth`. */
export function buildDemoDataset(
  endMonth: IsoMonth = currentMonth(),
  nowIso: string = new Date().toISOString(),
): DemoDataset {
  const random = createRandom(20260401);
  const months: IsoMonth[] = [];
  for (let offset = DEMO_MONTH_COUNT - 1; offset >= 0; offset -= 1) {
    months.push(addMonths(endMonth, -offset));
  }

  const transactions: Transaction[] = [];

  for (const month of months) {
    for (const template of TEMPLATES) {
      const days = template.day === "weekly" ? [4, 11, 18, 25] : [template.day];

      for (const day of days) {
        const jitter =
          template.jitterDollars === 0
            ? 0
            : (random() * 2 - 1) * template.jitterDollars;
        const dollars = template.baseDollars + jitter;
        const amountCents = Math.round(dollars * 100);
        if (amountCents === 0) continue;

        const date = clampDay(month, day);
        const accountName = ACCOUNT_NAMES.get(template.accountId) ?? "Demo Checking";

        transactions.push({
          id: createId("txn_demo"),
          date,
          description: template.description,
          amountCents,
          categoryId: template.categoryId,
          accountId: template.accountId,
          notes: "",
          sourceImportId: DEMO_IMPORT_ID,
          fingerprint: buildFingerprint({
            date,
            description: template.description,
            amountCents,
            account: accountName,
          }),
          isDemo: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }
  }

  const budgets: MonthlyBudget[] = months.flatMap((month) =>
    DEMO_BUDGETS.map((budget) => ({
      id: `bud_demo_${month}_${budget.categoryId}`,
      month,
      categoryId: budget.categoryId,
      limitCents: budget.limitDollars * 100,
      isDemo: true,
    })),
  );

  const importRecord: ImportRecord = {
    id: DEMO_IMPORT_ID,
    filename: "Budgetly demo data",
    importedAt: nowIso,
    importedCount: transactions.length,
    skippedCount: 0,
    duplicateCount: 0,
    mapping: null,
    isDemo: true,
  };

  return { accounts: DEMO_ACCOUNTS, transactions, budgets, importRecord, months };
}

/** Writes the demo dataset into the database, replacing any previous demo data. */
export async function loadDemoData(): Promise<DemoDataset> {
  await ensureSeeded();
  const dataset = buildDemoDataset();
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
      await db.accounts.bulkPut(dataset.accounts);
      await db.transactions.bulkPut(dataset.transactions);
      await db.budgets.bulkPut(dataset.budgets);
      await db.imports.put(dataset.importRecord);
    },
  );

  return dataset;
}
