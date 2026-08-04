"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { Onboarding } from "@/components/Onboarding";
import { BarList } from "@/components/charts/BarList";
import { TrendChart } from "@/components/charts/TrendChart";
import { PageHeader } from "@/components/layout/AppShell";
import { MonthPicker } from "@/components/layout/MonthPicker";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  Badge,
  ColorDot,
  EmptyState,
  LoadingPanel,
  ProgressBar,
  StatTile,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/components/ui/Primitives";
import {
  availableMonths,
  budgetProgress,
  monthlyTrend,
  sortTransactions,
  spendByCategory,
  summarizeMonth,
  transactionsInMonth,
  DEFAULT_SORT,
} from "@/lib/analytics/selectors";
import { currentMonth, formatDate, formatMonth, type IsoMonth } from "@/lib/date";
import { formatCents, formatCentsSigned } from "@/lib/money";

const TREND_MONTHS = 6;

export function DashboardView() {
  const data = useAppData();
  const [picked, setPicked] = useState<IsoMonth | null>(null);

  const months = useMemo(
    () => availableMonths(data.transactions),
    [data.transactions],
  );
  const month = picked ?? months.at(-1) ?? currentMonth();

  const summary = useMemo(
    () => summarizeMonth(data.transactions, data.budgets, data.categories, month),
    [data.transactions, data.budgets, data.categories, month],
  );

  const monthTransactions = useMemo(
    () => transactionsInMonth(data.transactions, month),
    [data.transactions, month],
  );

  const categorySpend = useMemo(
    () => spendByCategory(monthTransactions, data.categories),
    [monthTransactions, data.categories],
  );

  const progress = useMemo(
    () => budgetProgress(monthTransactions, data.budgets, data.categories, month),
    [monthTransactions, data.budgets, data.categories, month],
  );

  const recent = useMemo(
    () => sortTransactions(monthTransactions, DEFAULT_SORT).slice(0, 6),
    [monthTransactions],
  );

  const trend = useMemo(
    () => monthlyTrend(data.transactions, month, TREND_MONTHS),
    [data.transactions, month],
  );

  const monthsWithData = trend.filter(
    (point) => point.incomeCents > 0 || point.expenseCents > 0,
  ).length;

  if (data.error) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-danger">{data.error}</p>
        </CardBody>
      </Card>
    );
  }

  if (!data.ready) return <LoadingPanel />;

  if (data.transactions.length === 0 && !data.settings.onboardingCompleted) {
    return <Onboarding />;
  }

  const budgetedRows = progress.filter((row) => row.limitCents > 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`A summary of ${formatMonth(month)}, calculated from your saved transactions.`}
        actions={
          <MonthPicker value={month} onChange={setPicked} availableMonths={months} />
        }
      />

      {data.transactions.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="No transactions yet"
              description="Import a CSV export from your bank or load the demo dataset to see the dashboard fill in."
              action={
                <div className="flex gap-2">
                  <Link
                    href="/import"
                    className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink hover:bg-brand-hover"
                  >
                    Import a CSV
                  </Link>
                  <Link
                    href="/settings"
                    className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
                  >
                    Load demo data
                  </Link>
                </div>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile
              label="Income"
              value={formatCents(summary.incomeCents)}
              tone="income"
              hint={`${summary.transactionCount} transactions this month`}
            />
            <StatTile label="Expenses" value={formatCents(summary.expenseCents)} />
            <StatTile
              label="Net cash flow"
              value={formatCentsSigned(summary.netCents)}
              tone={summary.netCents >= 0 ? "income" : "danger"}
              hint={summary.netCents >= 0 ? "You spent less than you earned" : "You spent more than you earned"}
            />
            <StatTile
              label="Budgeted"
              value={formatCents(summary.budgetedCents)}
              hint={
                budgetedRows.length === 0
                  ? "No budgets set for this month"
                  : `${budgetedRows.length} categories budgeted`
              }
            />
            <StatTile
              label="Remaining budget"
              value={formatCentsSigned(summary.remainingBudgetCents)}
              tone={summary.remainingBudgetCents < 0 ? "danger" : "brand"}
              hint={`${formatCents(summary.budgetedSpendCents)} spent against budgets`}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Spending by category"
                description={formatMonth(month)}
                actions={
                  <Link
                    href="/reports"
                    className="text-sm font-medium text-brand underline-offset-2 hover:underline"
                  >
                    Reports
                  </Link>
                }
              />
              <CardBody>
                <BarList
                  items={categorySpend.map((row) => ({
                    key: row.categoryId,
                    label: row.name,
                    valueCents: row.spentCents,
                    color: row.color,
                    meta: `${Math.round(row.share * 100)}% of spending`,
                  }))}
                  emptyLabel="No expenses recorded in this month."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Budget vs. actual"
                description={formatMonth(month)}
                actions={
                  <Link
                    href="/budgets"
                    className="text-sm font-medium text-brand underline-offset-2 hover:underline"
                  >
                    Edit budgets
                  </Link>
                }
              />
              <CardBody>
                {progress.length === 0 ? (
                  <EmptyState
                    title="No budgets or spending yet"
                    description="Set a monthly limit for a category to track it here."
                    action={
                      <Link
                        href="/budgets"
                        className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
                      >
                        Set a budget
                      </Link>
                    }
                  />
                ) : (
                  <ul className="flex flex-col gap-4">
                    {progress.map((row) => (
                      <li key={row.categoryId} className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium text-ink">
                            <ColorDot color={row.color} />
                            {row.name}
                          </span>
                          <span className="tabular text-sm text-ink-muted">
                            {formatCents(row.spentCents)}
                            {row.limitCents > 0
                              ? ` of ${formatCents(row.limitCents)}`
                              : " · no budget set"}
                          </span>
                        </div>
                        {row.limitCents > 0 ? (
                          <>
                            <ProgressBar
                              percent={row.percent}
                              status={row.status}
                              label={`${row.name}: ${row.percent}% of budget used`}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={STATUS_TONE[row.status]}>
                                {STATUS_LABEL[row.status]}
                              </Badge>
                              <span className="tabular text-xs text-ink-subtle">
                                {row.percent}% used ·{" "}
                                {row.remainingCents >= 0
                                  ? `${formatCents(row.remainingCents)} left`
                                  : `${formatCents(-row.remainingCents)} over`}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Spending trend"
                description={`Last ${TREND_MONTHS} months ending ${formatMonth(month)}`}
              />
              <CardBody>
                {monthsWithData < 2 ? (
                  <EmptyState
                    title="Not enough history yet"
                    description="Import at least two months of transactions to compare month over month."
                  />
                ) : (
                  <TrendChart points={trend} />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Recent transactions"
                description={formatMonth(month)}
                actions={
                  <Link
                    href="/transactions"
                    className="text-sm font-medium text-brand underline-offset-2 hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              <CardBody className="p-0 sm:p-0">
                {recent.length === 0 ? (
                  <EmptyState title="No transactions in this month" />
                ) : (
                  <ul className="divide-y divide-line-subtle">
                    {recent.map((transaction) => {
                      const category = data.categoryById.get(transaction.categoryId);
                      return (
                        <li
                          key={transaction.id}
                          className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                              {transaction.description}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-subtle">
                              <ColorDot color={category?.color ?? "#8a8f98"} />
                              {category?.name ?? "Uncategorized"} ·{" "}
                              {formatDate(transaction.date)}
                            </p>
                          </div>
                          <span
                            className={`tabular shrink-0 text-sm font-medium ${
                              transaction.amountCents > 0 ? "text-income" : "text-ink"
                            }`}
                          >
                            {formatCentsSigned(transaction.amountCents)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
