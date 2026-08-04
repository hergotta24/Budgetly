import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, INCOME_ID, UNCATEGORIZED_ID } from "@/lib/db/defaults";
import type { MonthlyBudget, Transaction } from "@/lib/db/schema";
import {
  availableMonths,
  budgetProgress,
  filterTransactions,
  hasActiveFilters,
  monthlyTrend,
  sortTransactions,
  spendByCategory,
  summarizeMonth,
  topMerchants,
  totals,
  transactionsInMonth,
  DEFAULT_SORT,
  EMPTY_FILTERS,
} from "./selectors";

let counter = 0;

function txn(partial: Partial<Transaction> & { date: string; amountCents: number }) {
  counter += 1;
  return {
    id: `txn-${String(counter).padStart(3, "0")}`,
    description: "Test merchant",
    categoryId: UNCATEGORIZED_ID,
    accountId: "acct-1",
    notes: "",
    sourceImportId: null,
    fingerprint: `fp-${counter}`,
    isDemo: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  } satisfies Transaction;
}

function budget(month: string, categoryId: string, limitCents: number): MonthlyBudget {
  return { id: `${month}-${categoryId}`, month, categoryId, limitCents, isDemo: false };
}

const TRANSACTIONS: Transaction[] = [
  txn({
    date: "2026-03-01",
    description: "Lantern Labs Payroll",
    amountCents: 312000,
    categoryId: INCOME_ID,
  }),
  txn({
    date: "2026-03-02",
    description: "Summit Ridge Apartments",
    amountCents: -165000,
    categoryId: "cat-housing",
  }),
  txn({
    date: "2026-03-05",
    description: "Northwind Grocers",
    amountCents: -12000,
    categoryId: "cat-groceries",
  }),
  txn({
    date: "2026-03-12",
    description: "Northwind Grocers",
    amountCents: -8000,
    categoryId: "cat-groceries",
  }),
  txn({
    date: "2026-03-18",
    description: "Blue Harbor Cafe",
    amountCents: -2500,
    categoryId: "cat-dining",
    accountId: "acct-2",
  }),
  txn({
    date: "2026-02-10",
    description: "Northwind Grocers",
    amountCents: -9000,
    categoryId: "cat-groceries",
  }),
];

describe("filtering", () => {
  it("returns everything with the empty filter", () => {
    expect(filterTransactions(TRANSACTIONS, EMPTY_FILTERS)).toHaveLength(6);
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("searches descriptions case-insensitively", () => {
    const rows = filterTransactions(TRANSACTIONS, {
      ...EMPTY_FILTERS,
      search: "  NORTHWIND  ",
    });
    expect(rows).toHaveLength(3);
  });

  it("applies an inclusive date range", () => {
    const rows = filterTransactions(TRANSACTIONS, {
      ...EMPTY_FILTERS,
      from: "2026-03-01",
      to: "2026-03-05",
    });
    expect(rows.map((row) => row.date)).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-05",
    ]);
  });

  it("filters by category, account and flow", () => {
    expect(
      filterTransactions(TRANSACTIONS, {
        ...EMPTY_FILTERS,
        categoryIds: ["cat-groceries"],
      }),
    ).toHaveLength(3);
    expect(
      filterTransactions(TRANSACTIONS, { ...EMPTY_FILTERS, accountIds: ["acct-2"] }),
    ).toHaveLength(1);
    expect(
      filterTransactions(TRANSACTIONS, { ...EMPTY_FILTERS, flow: "income" }),
    ).toHaveLength(1);
    expect(
      filterTransactions(TRANSACTIONS, { ...EMPTY_FILTERS, flow: "expense" }),
    ).toHaveLength(5);
  });

  it("recognizes an active filter set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: "x" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, flow: "income" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: "   " })).toBe(false);
  });
});

describe("sorting", () => {
  it("sorts newest first by default", () => {
    const rows = sortTransactions(TRANSACTIONS, DEFAULT_SORT);
    expect(rows[0]?.date).toBe("2026-03-18");
    expect(rows.at(-1)?.date).toBe("2026-02-10");
  });

  it("sorts by signed amount", () => {
    const rows = sortTransactions(TRANSACTIONS, { field: "amount", direction: "asc" });
    expect(rows[0]?.amountCents).toBe(-165000);
    expect(rows.at(-1)?.amountCents).toBe(312000);
  });

  it("is stable for ties", () => {
    const tied = [
      txn({ date: "2026-03-01", amountCents: -100 }),
      txn({ date: "2026-03-01", amountCents: -100 }),
    ];
    const a = sortTransactions(tied, DEFAULT_SORT).map((row) => row.id);
    const b = sortTransactions([...tied].reverse(), DEFAULT_SORT).map((row) => row.id);
    expect(a).toEqual(b);
  });
});

describe("totals", () => {
  it("separates income from expenses and nets them", () => {
    const march = transactionsInMonth(TRANSACTIONS, "2026-03");
    const result = totals(march);
    expect(result.incomeCents).toBe(312000);
    expect(result.expenseCents).toBe(187500);
    expect(result.netCents).toBe(124500);
    expect(result.transactionCount).toBe(5);
  });

  it("lists the months that have data", () => {
    expect(availableMonths(TRANSACTIONS)).toEqual(["2026-02", "2026-03"]);
  });
});

describe("spendByCategory", () => {
  const march = transactionsInMonth(TRANSACTIONS, "2026-03");

  it("aggregates expenses per category and excludes income", () => {
    const rows = spendByCategory(march, DEFAULT_CATEGORIES);
    expect(rows.map((row) => [row.name, row.spentCents])).toEqual([
      ["Housing", 165000],
      ["Groceries", 20000],
      ["Dining", 2500],
    ]);
    expect(rows.some((row) => row.name === "Income")).toBe(false);
  });

  it("nets refunds inside a category and never goes below zero", () => {
    const rows = spendByCategory(
      [
        txn({ date: "2026-03-01", amountCents: -5000, categoryId: "cat-shopping" }),
        txn({ date: "2026-03-02", amountCents: 2000, categoryId: "cat-shopping" }),
        txn({ date: "2026-03-03", amountCents: 9000, categoryId: "cat-health" }),
      ],
      DEFAULT_CATEGORIES,
    );
    expect(rows).toEqual([
      expect.objectContaining({ name: "Shopping", spentCents: 3000, share: 1 }),
    ]);
  });

  it("computes each category's share of total spending", () => {
    const rows = spendByCategory(march, DEFAULT_CATEGORIES);
    const total = rows.reduce((sum, row) => sum + row.share, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("budgetProgress", () => {
  const march = transactionsInMonth(TRANSACTIONS, "2026-03");
  const budgets = [
    budget("2026-03", "cat-groceries", 25000),
    budget("2026-03", "cat-housing", 160000),
    budget("2026-03", "cat-utilities", 20000),
    budget("2026-02", "cat-groceries", 99900),
  ];

  it("compares spend against the limit for the selected month only", () => {
    const rows = budgetProgress(march, budgets, DEFAULT_CATEGORIES, "2026-03");
    const groceries = rows.find((row) => row.name === "Groceries");
    expect(groceries).toMatchObject({
      limitCents: 25000,
      spentCents: 20000,
      remainingCents: 5000,
      percent: 80,
      status: "near-limit",
    });
  });

  it("flags an overspent category", () => {
    const rows = budgetProgress(march, budgets, DEFAULT_CATEGORIES, "2026-03");
    expect(rows.find((row) => row.name === "Housing")).toMatchObject({
      spentCents: 165000,
      remainingCents: -5000,
      status: "over-budget",
    });
  });

  it("keeps budgeted categories with no spending", () => {
    const rows = budgetProgress(march, budgets, DEFAULT_CATEGORIES, "2026-03");
    expect(rows.find((row) => row.name === "Utilities")).toMatchObject({
      spentCents: 0,
      percent: 0,
      status: "on-track",
    });
  });

  it("still surfaces unbudgeted spending", () => {
    const rows = budgetProgress(march, budgets, DEFAULT_CATEGORIES, "2026-03");
    expect(rows.find((row) => row.name === "Dining")).toMatchObject({
      limitCents: 0,
      spentCents: 2500,
      budgetId: null,
    });
  });

  it("never counts income toward an expense budget", () => {
    const withIncomeBudget = budgetProgress(
      march,
      [...budgets, budget("2026-03", INCOME_ID, 500000)],
      DEFAULT_CATEGORIES,
      "2026-03",
    );
    expect(withIncomeBudget.some((row) => row.categoryId === INCOME_ID)).toBe(false);
  });
});

describe("summarizeMonth", () => {
  const budgets = [
    budget("2026-03", "cat-groceries", 25000),
    budget("2026-03", "cat-housing", 160000),
  ];

  it("reports income, expenses, budgeted and remaining together", () => {
    const summary = summarizeMonth(
      TRANSACTIONS,
      budgets,
      DEFAULT_CATEGORIES,
      "2026-03",
    );
    expect(summary).toMatchObject({
      month: "2026-03",
      incomeCents: 312000,
      expenseCents: 187500,
      netCents: 124500,
      budgetedCents: 185000,
      budgetedSpendCents: 185000,
      remainingBudgetCents: 0,
    });
  });

  it("excludes unbudgeted spending from the remaining figure", () => {
    const summary = summarizeMonth(
      TRANSACTIONS,
      [budget("2026-03", "cat-groceries", 25000)],
      DEFAULT_CATEGORIES,
      "2026-03",
    );
    expect(summary.budgetedCents).toBe(25000);
    expect(summary.budgetedSpendCents).toBe(20000);
    expect(summary.remainingBudgetCents).toBe(5000);
  });

  it("returns zeros for a month with no data", () => {
    const summary = summarizeMonth(
      TRANSACTIONS,
      budgets,
      DEFAULT_CATEGORIES,
      "2025-01",
    );
    expect(summary).toMatchObject({
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      budgetedCents: 0,
      transactionCount: 0,
    });
  });
});

describe("monthlyTrend", () => {
  it("returns one point per month, including empty ones", () => {
    const points = monthlyTrend(TRANSACTIONS, "2026-03", 3);
    expect(points.map((point) => point.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(points[0]).toMatchObject({ incomeCents: 0, expenseCents: 0 });
    expect(points[1]).toMatchObject({ expenseCents: 9000 });
    expect(points[2]).toMatchObject({ incomeCents: 312000, expenseCents: 187500 });
  });
});

describe("topMerchants", () => {
  it("groups by normalized description and ranks by spend", () => {
    const rows = topMerchants(TRANSACTIONS);
    expect(rows[0]).toMatchObject({
      label: "Summit Ridge Apartments",
      spentCents: 165000,
      transactionCount: 1,
    });
    expect(rows[1]).toMatchObject({
      label: "Northwind Grocers",
      spentCents: 29000,
      transactionCount: 3,
    });
    expect(rows.some((row) => row.label === "Lantern Labs Payroll")).toBe(false);
  });

  it("honors the limit", () => {
    expect(topMerchants(TRANSACTIONS, 2)).toHaveLength(2);
  });
});
