"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { EditIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Dialog";
import { ColorDot, EmptyState, LoadingPanel } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  filterTransactions,
  hasActiveFilters,
  sortTransactions,
  type FlowFilter,
  type SortField,
  type TransactionFilters,
  type TransactionSort,
} from "@/lib/analytics/selectors";
import { formatDate, isIsoDate } from "@/lib/date";
import type { Transaction } from "@/lib/db/schema";
import {
  bulkDeleteTransactions,
  bulkSetCategory,
  deleteTransaction,
  restoreTransactions,
  setTransactionCategory,
  updateTransaction,
} from "@/lib/db/repo";
import { formatCentsSigned, parseAmountToCents } from "@/lib/money";

const PAGE_SIZE = 100;

export function TransactionsView() {
  const data = useAppData();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<TransactionSort>(DEFAULT_SORT);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  const rows = useMemo(
    () => sortTransactions(filterTransactions(data.transactions, filters), sort),
    [data.transactions, filters, sort],
  );

  // Paging resets itself whenever the query changes, without an effect: the page
  // count is only honored while it belongs to the current filter/sort combination.
  const queryKey = useMemo(
    () => JSON.stringify([filters, sort]),
    [filters, sort],
  );
  const [page, setPage] = useState({ key: queryKey, count: PAGE_SIZE });
  const visible = page.key === queryKey ? page.count : PAGE_SIZE;

  // A selection only counts while the row is still in the result set, so filtering
  // never leaves invisible rows selected.
  const selected = useMemo(() => {
    if (checked.size === 0) return checked;
    const available = new Set(rows.map((row) => row.id));
    return new Set([...checked].filter((id) => available.has(id)));
  }, [checked, rows]);

  const pageRows = rows.slice(0, visible);
  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selected.has(row.id));

  function patchFilters(patch: Partial<TransactionFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  }

  async function handleDelete(transaction: Transaction) {
    const removed = await deleteTransaction(transaction.id);
    if (!removed) return;
    showToast({
      message: `Deleted “${removed.description}”.`,
      action: {
        label: "Undo",
        onClick: () => void restoreTransactions([removed]),
      },
      duration: 8000,
    });
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    const removed = await bulkDeleteTransactions(ids);
    setChecked(new Set());
    showToast({
      message: `Deleted ${removed.length} transaction${removed.length === 1 ? "" : "s"}.`,
      action: {
        label: "Undo",
        onClick: () => void restoreTransactions(removed),
      },
      duration: 8000,
    });
  }

  async function handleBulkCategory(categoryId: string) {
    if (!categoryId) return;
    const count = await bulkSetCategory([...selected], categoryId);
    const name = data.categoryById.get(categoryId)?.name ?? "the category";
    setChecked(new Set());
    setBulkCategoryId("");
    showToast({
      tone: "success",
      message: `Moved ${count} transaction${count === 1 ? "" : "s"} to ${name}.`,
    });
  }

  if (!data.ready) return <LoadingPanel />;

  const filtersActive = hasActiveFilters(filters);

  return (
    <>
      <PageHeader
        title="Transactions"
        description={
          data.transactions.length === 0
            ? "Nothing saved yet."
            : `${rows.length} of ${data.transactions.length} transactions shown.`
        }
        actions={
          <Link
            href="/import"
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink hover:bg-brand-hover"
          >
            Import CSV
          </Link>
        }
      />

      <Card className="mb-5">
        <CardBody className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
              <TextField
                label="Search descriptions"
                hideLabel
                type="search"
                placeholder="Search merchant or description"
                className="pl-9"
                value={filters.search}
                onChange={(event) => patchFilters({ search: event.target.value })}
              />
            </div>

            <TextField
              label="From date"
              type="date"
              value={filters.from ?? ""}
              onChange={(event) =>
                patchFilters({
                  from: isIsoDate(event.target.value) ? event.target.value : null,
                })
              }
            />
            <TextField
              label="To date"
              type="date"
              value={filters.to ?? ""}
              onChange={(event) =>
                patchFilters({
                  to: isIsoDate(event.target.value) ? event.target.value : null,
                })
              }
            />

            <SelectField
              label="Category"
              value={filters.categoryIds[0] ?? ""}
              onChange={(event) =>
                patchFilters({
                  categoryIds: event.target.value ? [event.target.value] : [],
                })
              }
            >
              <option value="">All categories</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Account"
              value={filters.accountIds[0] ?? ""}
              onChange={(event) =>
                patchFilters({
                  accountIds: event.target.value ? [event.target.value] : [],
                })
              }
            >
              <option value="">All accounts</option>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Type"
              value={filters.flow}
              onChange={(event) =>
                patchFilters({ flow: event.target.value as FlowFilter })
              }
            >
              <option value="all">Income and expenses</option>
              <option value="expense">Expenses only</option>
              <option value="income">Income only</option>
            </SelectField>

            <SelectField
              label="Sort by"
              value={`${sort.field}:${sort.direction}`}
              onChange={(event) => {
                const [field, direction] = event.target.value.split(":");
                setSort({
                  field: field as SortField,
                  direction: direction === "asc" ? "asc" : "desc",
                });
              }}
            >
              <option value="date:desc">Newest first</option>
              <option value="date:asc">Oldest first</option>
              <option value="amount:asc">Amount: lowest first</option>
              <option value="amount:desc">Amount: highest first</option>
              <option value="description:asc">Description A–Z</option>
            </SelectField>
          </div>

          {filtersActive ? (
            <div>
              <Button onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {selected.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3">
          <p className="text-sm font-medium text-ink">
            {selected.size} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="bulk-category" className="sr-only">
              Assign category to selected transactions
            </label>
            <select
              id="bulk-category"
              className="h-9 rounded-lg border border-line bg-surface px-3 text-sm"
              value={bulkCategoryId}
              onChange={(event) => {
                setBulkCategoryId(event.target.value);
                void handleBulkCategory(event.target.value);
              }}
            >
              <option value="">Assign category…</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>
              Delete selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>
              Clear selection
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <CardBody>
            <EmptyState
              title={
                data.transactions.length === 0
                  ? "No transactions yet"
                  : "No transactions match these filters"
              }
              description={
                data.transactions.length === 0
                  ? "Import a CSV export from your bank, or load the demo data from Settings."
                  : "Try widening the date range or clearing the filters."
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
                  <Button onClick={() => setFilters(EMPTY_FILTERS)}>
                    Clear filters
                  </Button>
                )
              }
            />
          </CardBody>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <caption className="sr-only">
                  Transactions, sorted by {sort.field} {sort.direction}ending
                </caption>
                <thead className="bg-surface-muted text-xs text-ink-subtle uppercase">
                  <tr>
                    <th scope="col" className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--brand)]"
                        checked={allPageSelected}
                        onChange={() => {
                          const next = new Set(selected);
                          if (allPageSelected) {
                            pageRows.forEach((row) => next.delete(row.id));
                          } else {
                            pageRows.forEach((row) => next.add(row.id));
                          }
                          setChecked(next);
                        }}
                        aria-label={
                          allPageSelected
                            ? "Deselect all shown transactions"
                            : "Select all shown transactions"
                        }
                      />
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Description
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Category
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Account
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {pageRows.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-surface-muted/60">
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--brand)]"
                          checked={selected.has(transaction.id)}
                          onChange={() => toggleRow(transaction.id)}
                          aria-label={`Select ${transaction.description}`}
                        />
                      </td>
                      <td className="tabular px-4 py-2.5 whitespace-nowrap text-ink-muted">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="max-w-[24rem] px-4 py-2.5">
                        <span className="block truncate text-ink">
                          {transaction.description}
                        </span>
                        {transaction.notes ? (
                          <span className="block truncate text-xs text-ink-subtle">
                            {transaction.notes}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">
                        <CategorySelect
                          transaction={transaction}
                          categories={data.categories}
                        />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-ink-muted">
                        {data.accountById.get(transaction.accountId)?.name ?? "—"}
                      </td>
                      <td
                        className={`tabular px-4 py-2.5 text-right font-medium whitespace-nowrap ${
                          transaction.amountCents > 0 ? "text-income" : "text-ink"
                        }`}
                      >
                        {formatCentsSigned(transaction.amountCents)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(transaction)}
                            aria-label={`Edit ${transaction.description}`}
                            className="rounded-lg p-1.5 text-ink-subtle hover:bg-surface-muted hover:text-ink"
                          >
                            <EditIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(transaction)}
                            aria-label={`Delete ${transaction.description}`}
                            className="rounded-lg p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-line-subtle md:hidden">
              {pageRows.map((transaction) => (
                <li key={transaction.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex min-w-0 flex-1 items-start gap-2.5">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
                        checked={selected.has(transaction.id)}
                        onChange={() => toggleRow(transaction.id)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">
                          {transaction.description}
                        </span>
                        <span className="tabular block text-xs text-ink-subtle">
                          {formatDate(transaction.date)} ·{" "}
                          {data.accountById.get(transaction.accountId)?.name ?? "—"}
                        </span>
                      </span>
                    </label>
                    <span
                      className={`tabular shrink-0 text-sm font-semibold ${
                        transaction.amountCents > 0 ? "text-income" : "text-ink"
                      }`}
                    >
                      {formatCentsSigned(transaction.amountCents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <CategorySelect
                      transaction={transaction}
                      categories={data.categories}
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(transaction)}
                        aria-label={`Edit ${transaction.description}`}
                        className="rounded-lg p-2 text-ink-subtle hover:bg-surface-muted hover:text-ink"
                      >
                        <EditIcon className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(transaction)}
                        aria-label={`Delete ${transaction.description}`}
                        className="rounded-lg p-2 text-ink-subtle hover:bg-danger-soft hover:text-danger"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {rows.length > visible ? (
              <div className="border-t border-line-subtle px-4 py-3 text-center">
                <Button
                  onClick={() =>
                    setPage({ key: queryKey, count: visible + PAGE_SIZE })
                  }
                >
                  Show {Math.min(PAGE_SIZE, rows.length - visible)} more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      {editing ? (
        <EditTransactionDialog
          key={editing.id}
          transaction={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            showToast({ tone: "success", message: "Transaction updated." });
          }}
        />
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */

function CategorySelect({
  transaction,
  categories,
}: {
  transaction: Transaction;
  categories: ReturnType<typeof useAppData>["categories"];
}) {
  const category = categories.find((item) => item.id === transaction.categoryId);
  return (
    <span className="flex items-center gap-2">
      <ColorDot color={category?.color ?? "#8a8f98"} />
      <select
        aria-label={`Category for ${transaction.description}`}
        className="h-8 max-w-[11rem] rounded-lg border border-line bg-surface px-2 text-sm text-ink"
        value={transaction.categoryId}
        onChange={(event) =>
          void setTransactionCategory(transaction.id, event.target.value)
        }
      >
        {categories.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </span>
  );
}

/* -------------------------------------------------------------------------- */

/** Mounted per transaction (keyed by id), so the form starts from its props. */
function EditTransactionDialog({
  transaction,
  onClose,
  onSaved,
}: {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const data = useAppData();
  const [form, setForm] = useState({
    date: transaction.date,
    description: transaction.description,
    amount: (transaction.amountCents / 100).toFixed(2),
    categoryId: transaction.categoryId,
    accountId: transaction.accountId,
    notes: transaction.notes,
  });
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!isIsoDate(form.date)) {
      setError("Enter a valid date.");
      return;
    }
    if (form.description.trim() === "") {
      setError("Enter a description.");
      return;
    }
    const amountCents = parseAmountToCents(form.amount);
    if (amountCents === null) {
      setError("Enter a valid amount, for example -24.50.");
      return;
    }

    await updateTransaction(transaction.id, {
      date: form.date,
      description: form.description.trim(),
      amountCents,
      categoryId: form.categoryId,
      accountId: form.accountId,
      notes: form.notes.trim(),
    });
    onSaved();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit transaction"
      description="Negative amounts are expenses; positive amounts are income."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Date"
          type="date"
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <TextField
          label="Amount"
          inputMode="decimal"
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
        />
        <SelectField
          label="Category"
          value={form.categoryId}
          onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
        >
          {data.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Account"
          value={form.accountId}
          onChange={(event) => setForm({ ...form, accountId: event.target.value })}
        >
          {data.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Notes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Dialog>
  );
}
