import { addMonths, monthOf, type IsoDate, type IsoMonth } from "@/lib/date";
import type { Category, MonthlyBudget, Transaction } from "@/lib/db/schema";
import {
  budgetStatus,
  expenseMagnitude,
  incomeMagnitude,
  percentUsed,
  type BudgetStatus,
} from "@/lib/money";
import { normalizeDescription } from "@/lib/csv/fingerprint";

/**
 * Pure derivations over the persisted transaction/budget data.
 *
 * The dashboard, transactions table and reports all read the same arrays through
 * these functions, so every screen is guaranteed to agree.
 */

export type FlowFilter = "all" | "income" | "expense";

export type TransactionFilters = {
  search: string;
  from: IsoDate | null;
  to: IsoDate | null;
  categoryIds: string[];
  accountIds: string[];
  flow: FlowFilter;
};

export const EMPTY_FILTERS: TransactionFilters = {
  search: "",
  from: null,
  to: null,
  categoryIds: [],
  accountIds: [],
  flow: "all",
};

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.from !== null ||
    filters.to !== null ||
    filters.categoryIds.length > 0 ||
    filters.accountIds.length > 0 ||
    filters.flow !== "all"
  );
}

export function filterTransactions(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const search = normalizeDescription(filters.search);
  const categories = new Set(filters.categoryIds);
  const accounts = new Set(filters.accountIds);

  return transactions.filter((transaction) => {
    if (
      search !== "" &&
      !normalizeDescription(transaction.description).includes(search)
    ) {
      return false;
    }
    if (filters.from && transaction.date < filters.from) return false;
    if (filters.to && transaction.date > filters.to) return false;
    if (categories.size > 0 && !categories.has(transaction.categoryId)) return false;
    if (accounts.size > 0 && !accounts.has(transaction.accountId)) return false;
    if (filters.flow === "income" && transaction.amountCents <= 0) return false;
    if (filters.flow === "expense" && transaction.amountCents >= 0) return false;
    return true;
  });
}

export type SortField = "date" | "amount" | "description";
export type SortDirection = "asc" | "desc";
export type TransactionSort = { field: SortField; direction: SortDirection };

export const DEFAULT_SORT: TransactionSort = { field: "date", direction: "desc" };

export function sortTransactions(
  transactions: readonly Transaction[],
  sort: TransactionSort,
): Transaction[] {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...transactions].sort((a, b) => {
    let comparison: number;
    if (sort.field === "amount") {
      comparison = a.amountCents - b.amountCents;
    } else if (sort.field === "description") {
      comparison = a.description.localeCompare(b.description);
    } else {
      comparison = a.date.localeCompare(b.date);
    }
    // Stable, predictable ordering for ties.
    if (comparison === 0) comparison = a.id.localeCompare(b.id);
    return comparison * factor;
  });
}

export function transactionsInMonth(
  transactions: readonly Transaction[],
  month: IsoMonth,
): Transaction[] {
  return transactions.filter((transaction) => monthOf(transaction.date) === month);
}

/** Every month that has at least one transaction, oldest first. */
export function availableMonths(transactions: readonly Transaction[]): IsoMonth[] {
  const months = new Set<IsoMonth>();
  for (const transaction of transactions) months.add(monthOf(transaction.date));
  return Array.from(months).sort();
}

export type MonthTotals = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  transactionCount: number;
};

/** Income, expenses and net cash flow for an already-scoped set of transactions. */
export function totals(transactions: readonly Transaction[]): MonthTotals {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const transaction of transactions) {
    incomeCents += incomeMagnitude(transaction.amountCents);
    expenseCents += expenseMagnitude(transaction.amountCents);
  }
  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    transactionCount: transactions.length,
  };
}

export type CategorySpend = {
  categoryId: string;
  name: string;
  color: string;
  /** Net expense magnitude for the category, never below zero. */
  spentCents: number;
  /** Share of total expense spending, 0-1. */
  share: number;
};

/**
 * Net spending per expense category.
 *
 * Refunds inside a category reduce that category's spend. Income-kind categories
 * are excluded entirely so a paycheck never appears as "spending".
 */
export function spendByCategory(
  transactions: readonly Transaction[],
  categories: readonly Category[],
): CategorySpend[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const netByCategory = new Map<string, number>();

  for (const transaction of transactions) {
    const category = byId.get(transaction.categoryId);
    if (category?.kind === "income") continue;
    const current = netByCategory.get(transaction.categoryId) ?? 0;
    netByCategory.set(transaction.categoryId, current - transaction.amountCents);
  }

  const rows: CategorySpend[] = [];
  let total = 0;
  for (const [categoryId, net] of netByCategory) {
    const spentCents = Math.max(0, net);
    if (spentCents === 0) continue;
    const category = byId.get(categoryId);
    rows.push({
      categoryId,
      name: category?.name ?? "Unknown category",
      color: category?.color ?? "#8a8f98",
      spentCents,
      share: 0,
    });
    total += spentCents;
  }

  return rows
    .map((row) => ({ ...row, share: total === 0 ? 0 : row.spentCents / total }))
    .sort((a, b) => b.spentCents - a.spentCents);
}

export type BudgetProgressRow = {
  categoryId: string;
  name: string;
  color: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  percent: number;
  status: BudgetStatus;
  budgetId: string | null;
};

/**
 * Budget-versus-actual for one month.
 *
 * Includes every budgeted category plus any expense category with spending but no
 * budget, so overspending outside the plan stays visible.
 */
export function budgetProgress(
  monthTransactions: readonly Transaction[],
  budgets: readonly MonthlyBudget[],
  categories: readonly Category[],
  month: IsoMonth,
): BudgetProgressRow[] {
  const monthBudgets = budgets.filter((budget) => budget.month === month);
  const limitByCategory = new Map(
    monthBudgets.map((budget) => [budget.categoryId, budget]),
  );
  const spendByCategoryId = new Map(
    spendByCategory(monthTransactions, categories).map((row) => [
      row.categoryId,
      row.spentCents,
    ]),
  );

  const relevant = categories.filter(
    (category) =>
      category.kind === "expense" &&
      (limitByCategory.has(category.id) ||
        (spendByCategoryId.get(category.id) ?? 0) > 0),
  );

  return relevant
    .map((category) => {
      const budget = limitByCategory.get(category.id);
      const limitCents = budget?.limitCents ?? 0;
      const spentCents = spendByCategoryId.get(category.id) ?? 0;
      return {
        categoryId: category.id,
        name: category.name,
        color: category.color,
        limitCents,
        spentCents,
        remainingCents: limitCents - spentCents,
        percent: percentUsed(spentCents, limitCents),
        status: budgetStatus(spentCents, limitCents),
        budgetId: budget?.id ?? null,
      };
    })
    .sort((a, b) => {
      if (a.limitCents > 0 !== b.limitCents > 0) return a.limitCents > 0 ? -1 : 1;
      return b.spentCents - a.spentCents;
    });
}

export type MonthSummary = MonthTotals & {
  month: IsoMonth;
  budgetedCents: number;
  /** Spending that lands inside a budgeted category. */
  budgetedSpendCents: number;
  remainingBudgetCents: number;
};

export function summarizeMonth(
  transactions: readonly Transaction[],
  budgets: readonly MonthlyBudget[],
  categories: readonly Category[],
  month: IsoMonth,
): MonthSummary {
  const monthTransactions = transactionsInMonth(transactions, month);
  const base = totals(monthTransactions);
  const progress = budgetProgress(monthTransactions, budgets, categories, month);

  let budgetedCents = 0;
  let budgetedSpendCents = 0;
  for (const row of progress) {
    if (row.limitCents <= 0) continue;
    budgetedCents += row.limitCents;
    budgetedSpendCents += row.spentCents;
  }

  return {
    ...base,
    month,
    budgetedCents,
    budgetedSpendCents,
    remainingBudgetCents: budgetedCents - budgetedSpendCents,
  };
}

export type TrendPoint = {
  month: IsoMonth;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

/** Income/expense totals for the `count` months ending at `endMonth`. */
export function monthlyTrend(
  transactions: readonly Transaction[],
  endMonth: IsoMonth,
  count: number,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const month = addMonths(endMonth, -offset);
    const monthTotals = totals(transactionsInMonth(transactions, month));
    points.push({
      month,
      incomeCents: monthTotals.incomeCents,
      expenseCents: monthTotals.expenseCents,
      netCents: monthTotals.netCents,
    });
  }
  return points;
}

export type MerchantTotal = {
  label: string;
  spentCents: number;
  transactionCount: number;
};

/** Highest-spend merchants/descriptions in the given transactions. */
export function topMerchants(
  transactions: readonly Transaction[],
  limit = 8,
): MerchantTotal[] {
  const groups = new Map<string, MerchantTotal>();

  for (const transaction of transactions) {
    const spend = expenseMagnitude(transaction.amountCents);
    if (spend === 0) continue;
    const key = normalizeDescription(transaction.description);
    const existing = groups.get(key);
    if (existing) {
      existing.spentCents += spend;
      existing.transactionCount += 1;
    } else {
      groups.set(key, {
        label: transaction.description.trim(),
        spentCents: spend,
        transactionCount: 1,
      });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => b.spentCents - a.spentCents)
    .slice(0, limit);
}
