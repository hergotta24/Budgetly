"use client";

import { useId, useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import {
  addMonths,
  currentMonth,
  formatMonth,
  monthRange,
  type IsoMonth,
} from "@/lib/date";

/**
 * Month selector shared by the dashboard and budgets.
 *
 * The option list always spans a year either side of today so budgets can be set
 * ahead of time, and stretches further when transactions exist outside that window.
 */
export function MonthPicker({
  value,
  onChange,
  availableMonths,
  label = "Month",
}: {
  value: IsoMonth;
  onChange: (month: IsoMonth) => void;
  availableMonths: IsoMonth[];
  label?: string;
}) {
  const id = useId();

  const options = useMemo(() => {
    const today = currentMonth();
    const candidates = [...availableMonths, value, today];
    const earliest = candidates.reduce(
      (min, month) => (month < min ? month : min),
      addMonths(today, -11),
    );
    const latest = candidates.reduce(
      (max, month) => (month > max ? month : max),
      addMonths(today, 11),
    );
    return monthRange(earliest, latest).reverse();
  }, [availableMonths, value]);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(addMonths(value, -1))}
        aria-label="Previous month"
        className="rounded-lg border border-line bg-surface p-2 text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-[10.5rem] rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink"
      >
        {options.map((month) => (
          <option key={month} value={month}>
            {formatMonth(month)}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onChange(addMonths(value, 1))}
        aria-label="Next month"
        className="rounded-lg border border-line bg-surface p-2 text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
