"use client";

import { useState } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/AppShell";
import { MonthPicker } from "@/components/layout/MonthPicker";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import {
  Badge,
  ColorDot,
  EmptyState,
  LoadingPanel,
  ProgressBar,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  availableMonths,
  budgetProgress,
  summarizeMonth,
  transactionsInMonth,
} from "@/lib/analytics/selectors";
import { addMonths, currentMonth, formatMonth, type IsoMonth } from "@/lib/date";
import { CATEGORY_COLORS, UNCATEGORIZED_ID } from "@/lib/db/defaults";
import type { Category, CategoryKind } from "@/lib/db/schema";
import {
  copyBudgets,
  createCategory,
  deleteCategory,
  setBudget,
  updateCategory,
} from "@/lib/db/repo";
import { formatCents, formatCentsSigned, parseAmountToCents } from "@/lib/money";

export function BudgetsView() {
  const data = useAppData();
  const { showToast } = useToast();
  const [picked, setPicked] = useState<IsoMonth | null>(null);
  /** The one limit field currently being typed into, if any. */
  const [draft, setDraft] = useState<{ categoryId: string; value: string } | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<{
    category: Category | null;
  } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // These derivations are cheap and the React Compiler memoizes them for us.
  const months = availableMonths(data.transactions);
  const month = picked ?? months.at(-1) ?? currentMonth();
  const previousMonth = addMonths(month, -1);

  const monthTransactions = transactionsInMonth(data.transactions, month);
  const progress = budgetProgress(
    monthTransactions,
    data.budgets,
    data.categories,
    month,
  );
  const summary = summarizeMonth(
    data.transactions,
    data.budgets,
    data.categories,
    month,
  );
  const expenseCategories = data.categories.filter(
    (category) => category.kind === "expense",
  );

  const limitByCategory = new Map(
    data.budgets
      .filter((budget) => budget.month === month)
      .map((budget) => [budget.categoryId, budget.limitCents] as const),
  );
  const spentByCategory = new Map(progress.map((row) => [row.categoryId, row]));

  async function commitLimit(categoryId: string, raw: string) {
    const trimmed = raw.trim();
    const cents = trimmed === "" ? 0 : parseAmountToCents(trimmed);
    if (cents === null) {
      showToast({ tone: "danger", message: "Enter an amount like 450 or 450.00." });
      return;
    }
    await setBudget(month, categoryId, Math.abs(cents));
  }

  async function handleCopyPrevious() {
    const copied = await copyBudgets(previousMonth, month);
    showToast({
      tone: copied > 0 ? "success" : "warning",
      message:
        copied > 0
          ? `Copied ${copied} budget${copied === 1 ? "" : "s"} from ${formatMonth(previousMonth)}.`
          : `${formatMonth(previousMonth)} has no budgets to copy.`,
    });
  }

  if (!data.ready) return <LoadingPanel />;

  const budgetedCount = progress.filter((row) => row.limitCents > 0).length;

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Set a monthly limit per expense category. Income never counts toward these limits."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker value={month} onChange={setPicked} availableMonths={months} />
            <Button onClick={handleCopyPrevious}>
              Copy {formatMonth(previousMonth)}
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line-subtle bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
            Total budgeted
          </p>
          <p className="tabular mt-1 text-2xl font-semibold">
            {formatCents(summary.budgetedCents)}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {budgetedCount} categor{budgetedCount === 1 ? "y" : "ies"} budgeted
          </p>
        </div>
        <div className="rounded-xl border border-line-subtle bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
            Spent against budgets
          </p>
          <p className="tabular mt-1 text-2xl font-semibold">
            {formatCents(summary.budgetedSpendCents)}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {formatCents(summary.expenseCents)} total expenses this month
          </p>
        </div>
        <div className="rounded-xl border border-line-subtle bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
            Remaining
          </p>
          <p
            className={`tabular mt-1 text-2xl font-semibold ${
              summary.remainingBudgetCents < 0 ? "text-danger" : "text-ink"
            }`}
          >
            {formatCentsSigned(summary.remainingBudgetCents)}
          </p>
        </div>
      </div>

      <Card className="mb-5">
        <CardHeader
          title={`Category budgets — ${formatMonth(month)}`}
          description="Leave a limit blank to stop tracking that category this month."
        />
        <CardBody className="p-0 sm:p-0">
          {expenseCategories.length === 0 ? (
            <EmptyState title="No expense categories" />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {expenseCategories.map((category) => {
                const row = spentByCategory.get(category.id);
                const spentCents = row?.spentCents ?? 0;
                const limitCents = limitByCategory.get(category.id) ?? 0;

                return (
                  <li
                    key={category.id}
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-ink">
                          <ColorDot color={category.color} />
                          {category.name}
                        </span>
                        {limitCents > 0 && row ? (
                          <Badge tone={STATUS_TONE[row.status]}>
                            {STATUS_LABEL[row.status]}
                          </Badge>
                        ) : null}
                      </div>

                      <p className="tabular mt-1 text-sm text-ink-muted">
                        {formatCents(spentCents)} spent
                        {limitCents > 0
                          ? ` · ${row?.percent ?? 0}% used · ${
                              (row?.remainingCents ?? 0) >= 0
                                ? `${formatCents(row?.remainingCents ?? 0)} left`
                                : `${formatCents(-(row?.remainingCents ?? 0))} over`
                            }`
                          : " · no budget set"}
                      </p>

                      {limitCents > 0 && row ? (
                        <div className="mt-2 max-w-md">
                          <ProgressBar
                            percent={row.percent}
                            status={row.status}
                            label={`${category.name}: ${row.percent}% of budget used`}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-end gap-2 sm:justify-end">
                      <div className="w-36">
                        <TextField
                          label={`${category.name} monthly limit`}
                          hideLabel
                          inputMode="decimal"
                          placeholder="No limit"
                          value={
                            draft?.categoryId === category.id
                              ? draft.value
                              : limitCents > 0
                                ? (limitCents / 100).toFixed(2)
                                : ""
                          }
                          onChange={(event) =>
                            setDraft({
                              categoryId: category.id,
                              value: event.target.value,
                            })
                          }
                          onBlur={(event) => {
                            setDraft(null);
                            void commitLimit(category.id, event.target.value);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Categories"
          description="Rename, recolor or remove categories. Deleting one moves its transactions somewhere else."
          actions={
            <Button
              size="sm"
              variant="primary"
              onClick={() => setCategoryDialog({ category: null })}
            >
              <PlusIcon className="size-4" />
              New category
            </Button>
          }
        />
        <CardBody className="p-0 sm:p-0">
          <ul className="divide-y divide-line-subtle">
            {data.categories.map((category) => {
              const count = data.transactions.filter(
                (transaction) => transaction.categoryId === category.id,
              ).length;
              return (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <ColorDot color={category.color} />
                    <span className="truncate font-medium text-ink">
                      {category.name}
                    </span>
                    <Badge tone={category.kind === "income" ? "income" : "neutral"}>
                      {category.kind === "income" ? "Income" : "Expense"}
                    </Badge>
                    {category.isSystem ? <Badge>Built in</Badge> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-ink-subtle">
                      {count} transaction{count === 1 ? "" : "s"}
                    </span>
                    <Button size="sm" onClick={() => setCategoryDialog({ category })}>
                      Edit
                    </Button>
                    {category.isSystem ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => setDeletingCategory(category)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {categoryDialog ? (
        <CategoryDialog
          key={categoryDialog.category?.id ?? "new-category"}
          category={categoryDialog.category}
          onClose={() => setCategoryDialog(null)}
          onSaved={(message) => {
            setCategoryDialog(null);
            showToast({ tone: "success", message });
          }}
        />
      ) : null}

      {deletingCategory ? (
        <DeleteCategoryDialog
          key={deletingCategory.id}
          category={deletingCategory}
          onClose={() => setDeletingCategory(null)}
          onDeleted={(message) => {
            setDeletingCategory(null);
            showToast({ tone: "success", message });
          }}
        />
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Mounted fresh for each category (via a `key` in the parent), so the form state
 * is simply initialized from props rather than synchronized in an effect.
 */
function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState<string>(category?.color ?? CATEGORY_COLORS[0]);
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "expense");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Give the category a name.");
      return;
    }
    if (category) {
      await updateCategory(category.id, { name: trimmed, color, kind });
      onSaved(`Updated ${trimmed}.`);
    } else {
      await createCategory({ name: trimmed, color, kind });
      onSaved(`Created ${trimmed}.`);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={category ? "Edit category" : "New category"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            {category ? "Save changes" : "Create category"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <SelectField
          label="Kind"
          hint={category?.isSystem ? "built-in categories keep their kind" : undefined}
          value={kind}
          disabled={category?.isSystem}
          onChange={(event) => setKind(event.target.value as CategoryKind)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </SelectField>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Color</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((option) => (
              <label key={option} className="cursor-pointer">
                <input
                  type="radio"
                  name="category-color"
                  value={option}
                  checked={color === option}
                  onChange={() => setColor(option)}
                  className="sr-only"
                />
                <span
                  aria-label={`Color ${option}`}
                  className={`block size-7 rounded-full border-2 ${
                    color === option ? "border-ink" : "border-transparent"
                  }`}
                  style={{ backgroundColor: option }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */

function DeleteCategoryDialog({
  category,
  onClose,
  onDeleted,
}: {
  category: Category;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const data = useAppData();
  const [target, setTarget] = useState(UNCATEGORIZED_ID);
  const [busy, setBusy] = useState(false);

  const affected = data.transactions.filter(
    (transaction) => transaction.categoryId === category.id,
  ).length;

  async function confirm() {
    setBusy(true);
    try {
      await deleteCategory(category.id, target);
      const targetName = data.categoryById.get(target)?.name ?? "Uncategorized";
      onDeleted(
        affected > 0
          ? `Deleted ${category.name} and moved ${affected} transaction${
              affected === 1 ? "" : "s"
            } to ${targetName}.`
          : `Deleted ${category.name}.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={confirm}
      title={`Delete ${category.name}?`}
      description={
        affected > 0
          ? `${affected} transaction${affected === 1 ? "" : "s"} use this category and must be reassigned.`
          : "No transactions use this category. Its budgets will also be removed."
      }
      confirmLabel="Delete category"
      destructive
      busy={busy}
    >
      {affected > 0 ? (
        <SelectField
          label="Move those transactions to"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          {data.categories
            .filter((item) => item.id !== category.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </SelectField>
      ) : null}
    </ConfirmDialog>
  );
}
