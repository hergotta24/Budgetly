import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BudgetStatus } from "@/lib/money";

export type BadgeTone = "neutral" | "brand" | "income" | "warning" | "danger";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-ink-muted border-line-subtle",
  brand: "bg-brand-soft text-brand border-brand/25",
  income: "bg-income-soft text-income border-income/30",
  warning: "bg-warning-soft text-warning border-warning/30",
  danger: "bg-danger-soft text-danger border-danger/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small round swatch showing a category's color. */
export function ColorDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

export const STATUS_TONE: Record<BudgetStatus, BadgeTone> = {
  "on-track": "income",
  "near-limit": "warning",
  "over-budget": "danger",
};

export const STATUS_LABEL: Record<BudgetStatus, string> = {
  "on-track": "On track",
  "near-limit": "Near limit",
  "over-budget": "Over budget",
};

const STATUS_BAR: Record<BudgetStatus, string> = {
  "on-track": "bg-income",
  "near-limit": "bg-warning",
  "over-budget": "bg-danger",
};

/** Accessible budget progress bar; the numeric value is always shown nearby. */
export function ProgressBar({
  percent,
  status,
  label,
}: {
  percent: number;
  status: BudgetStatus;
  label: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <div
        className={cn("h-full rounded-full transition-[width]", STATUS_BAR[status])}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "neutral" | "income" | "danger" | "brand";
}) {
  const valueTone =
    tone === "income"
      ? "text-income"
      : tone === "danger"
        ? "text-danger"
        : tone === "brand"
          ? "text-brand"
          : "text-ink";

  return (
    <div className="rounded-xl border border-line-subtle bg-surface p-4 shadow-card">
      <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
        {label}
      </p>
      <p className={cn("tabular mt-1.5 text-2xl font-semibold", valueTone)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon ? <div className="text-ink-subtle">{icon}</div> : null}
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-subtle">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-subtle">
      <svg viewBox="0 0 24 24" className="size-4 animate-spin" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.25"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}

export function LoadingPanel({ label = "Loading your data…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-line-subtle bg-surface px-6 py-16">
      <Spinner label={label} />
    </div>
  );
}

export type SegmentedOption<T extends string> = { value: T; label: string };

/** Radio-group styled as a segmented control. */
export function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
  name,
}: {
  legend: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const selected = option.value === value;
          return (
            <div key={option.value} className="contents">
              <input
                type="radio"
                id={id}
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <label
                htmlFor={id}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "bg-surface text-ink shadow-card"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
