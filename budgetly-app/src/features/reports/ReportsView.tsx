"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { BarList } from "@/components/charts/BarList";
import { TrendChart } from "@/components/charts/TrendChart";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { EmptyState, LoadingPanel, StatTile } from "@/components/ui/Primitives";
import {
  availableMonths,
  filterTransactions,
  monthlyTrend,
  spendByCategory,
  topMerchants,
  totals,
  EMPTY_FILTERS,
  type TransactionFilters,
} from "@/lib/analytics/selectors";
import {
  addMonths,
  currentMonth,
  formatDate,
  isIsoDate,
  monthEnd,
  monthOf,
  monthStart,
  today,
} from "@/lib/date";
import { formatCents, formatCentsSigned } from "@/lib/money";

type RangePreset = "3m" | "6m" | "12m" | "all" | "custom";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export function ReportsView() {
  const data = useAppData();
  const [preset, setPreset] = useState<RangePreset>("6m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [accountId, setAccountId] = useState("");

  const months = useMemo(() => availableMonths(data.transactions), [data.transactions]);

  const range = useMemo(() => {
    if (preset === "custom") {
      return {
        from: isIsoDate(customFrom) ? customFrom : null,
        to: isIsoDate(customTo) ? customTo : null,
      };
    }
    if (preset === "all") return { from: null, to: null };

    const monthCount = preset === "3m" ? 3 : preset === "6m" ? 6 : 12;
    const lastMonth = months.at(-1) ?? currentMonth();
    return {
      from: monthStart(addMonths(lastMonth, -(monthCount - 1))),
      to: monthEnd(lastMonth),
    };
  }, [preset, customFrom, customTo, months]);

  const filters: TransactionFilters = useMemo(
    () => ({
      ...EMPTY_FILTERS,
      from: range.from,
      to: range.to,
      accountIds: accountId ? [accountId] : [],
    }),
    [range.from, range.to, accountId],
  );

  const scoped = useMemo(
    () => filterTransactions(data.transactions, filters),
    [data.transactions, filters],
  );

  const scopedTotals = useMemo(() => totals(scoped), [scoped]);
  const categorySpend = useMemo(
    () => spendByCategory(scoped, data.categories),
    [scoped, data.categories],
  );
  const merchants = useMemo(() => topMerchants(scoped, 8), [scoped]);

  const trend = useMemo(() => {
    if (scoped.length === 0) return [];
    const dates = scoped.map((transaction) => transaction.date).sort();
    const firstMonth = monthOf(dates[0] ?? today());
    const lastMonth = monthOf(dates.at(-1) ?? today());
    let count = 1;
    let cursor = firstMonth;
    while (cursor < lastMonth && count < 24) {
      cursor = addMonths(cursor, 1);
      count += 1;
    }
    return monthlyTrend(scoped, lastMonth, count);
  }, [scoped]);

  if (!data.ready) return <LoadingPanel />;

  const rangeLabel =
    range.from && range.to
      ? `${formatDate(range.from)} – ${formatDate(range.to)}`
      : "All transactions";

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${scoped.length} transactions · ${rangeLabel}`}
      />

      <Card className="mb-5">
        <CardBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="Date range"
            value={preset}
            onChange={(event) => setPreset(event.target.value as RangePreset)}
          >
            {PRESETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          {preset === "custom" ? (
            <>
              <TextField
                label="From"
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
              <TextField
                label="To"
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </>
          ) : null}

          <SelectField
            label="Account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            <option value="">All accounts</option>
            {data.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setPreset("6m");
                setCustomFrom("");
                setCustomTo("");
                setAccountId("");
              }}
            >
              Reset filters
            </Button>
          </div>
        </CardBody>
      </Card>

      {scoped.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Nothing to report yet"
              description={
                data.transactions.length === 0
                  ? "Import a CSV or load the demo data, and your reports will build themselves."
                  : "No transactions fall inside this range. Try a wider date range or a different account."
              }
              action={
                data.transactions.length === 0 ? (
                  <Link
                    href="/import"
                    className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink hover:bg-brand-hover"
                  >
                    Import a CSV
                  </Link>
                ) : (
                  <Button onClick={() => setPreset("all")}>Show all time</Button>
                )
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Income"
              value={formatCents(scopedTotals.incomeCents)}
              tone="income"
            />
            <StatTile label="Expenses" value={formatCents(scopedTotals.expenseCents)} />
            <StatTile
              label="Net"
              value={formatCentsSigned(scopedTotals.netCents)}
              tone={scopedTotals.netCents >= 0 ? "income" : "danger"}
            />
          </div>

          <Card>
            <CardHeader title="Income vs. expenses by month" description={rangeLabel} />
            <CardBody>
              {trend.length < 2 ? (
                <EmptyState
                  title="Only one month in range"
                  description="Widen the date range to compare months."
                />
              ) : (
                <TrendChart points={trend} />
              )}
            </CardBody>
          </Card>

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Spending by category" description={rangeLabel} />
              <CardBody>
                <BarList
                  items={categorySpend.map((row) => ({
                    key: row.categoryId,
                    label: row.name,
                    valueCents: row.spentCents,
                    color: row.color,
                    meta: `${Math.round(row.share * 100)}% of spending`,
                  }))}
                  emptyLabel="No expenses in this range."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Top merchants" description={rangeLabel} />
              <CardBody>
                <BarList
                  items={merchants.map((merchant) => ({
                    key: merchant.label,
                    label: merchant.label,
                    valueCents: merchant.spentCents,
                    meta: `${merchant.transactionCount} transaction${
                      merchant.transactionCount === 1 ? "" : "s"
                    }`,
                  }))}
                  emptyLabel="No merchant spending in this range."
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
