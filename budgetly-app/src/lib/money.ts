/**
 * Money handling for Budgetly.
 *
 * Every monetary value in the app is stored and computed as an **integer number
 * of cents**. Floating point dollars are never persisted and never summed.
 *
 * ## Sign convention
 *
 * `amountCents` on a transaction is signed from the account holder's point of view:
 *
 * - **negative** => money left the account (an expense / debit / withdrawal)
 * - **positive** => money entered the account (income / credit / deposit)
 *
 * Budgets, category spend totals and report figures are all expressed as
 * positive "spend" magnitudes derived from negative transaction amounts.
 */

/** Smallest and largest amounts we accept, guarding against nonsense CSV values. */
const MAX_ABS_CENTS = 1_000_000_000_00; // $1B

export type ParsedAmount = number;

/**
 * Converts a plain decimal string (`"12"`, `"12.3"`, `"12.345"`) to integer cents
 * without going through binary floating point for the fractional part.
 */
function decimalStringToCents(value: string): number | null {
  const match = /^(\d*)(?:\.(\d*))?$/.exec(value);
  if (!match) return null;

  const intPart = match[1] ?? "";
  const fracPart = match[2] ?? "";
  if (intPart === "" && fracPart === "") return null;

  const whole = intPart === "" ? 0 : Number(intPart);
  if (!Number.isSafeInteger(whole)) return null;

  const frac2 = (fracPart + "00").slice(0, 2);
  let cents = whole * 100 + Number(frac2);

  // Round half-up on the third decimal place.
  const third = fracPart[2];
  if (third !== undefined && Number(third) >= 5) cents += 1;

  return Number.isSafeInteger(cents) ? cents : null;
}

/**
 * Decides which of `.` / `,` acts as the decimal separator in a numeric string.
 * Returns `null` when every separator is a grouping separator.
 */
function detectDecimalSeparator(value: string): "." | "," | null {
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    return lastComma > lastDot ? "," : ".";
  }

  if (lastComma !== -1) {
    const commaCount = (value.match(/,/g) ?? []).length;
    const digitsAfter = value.length - lastComma - 1;
    // "1,234" is grouping; "1,50" is a European decimal.
    if (commaCount === 1 && digitsAfter !== 3) return ",";
    return null;
  }

  if (lastDot !== -1) {
    const dotCount = (value.match(/\./g) ?? []).length;
    // "1.234.567" is grouping; a single dot is a decimal point.
    if (dotCount === 1) return ".";
    return null;
  }

  return null;
}

/**
 * Parses a raw CSV cell into integer cents.
 *
 * Handles `$`, `USD`, thousands separators, `(123.45)` accounting negatives,
 * leading and trailing minus signs, unicode minus, and non-breaking spaces.
 * Returns `null` when the cell cannot be understood as an amount.
 */
export function parseAmountToCents(input: unknown): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    const cents = Math.round(input * 100);
    return Number.isSafeInteger(cents) && Math.abs(cents) <= MAX_ABS_CENTS
      ? cents
      : null;
  }

  if (typeof input !== "string") return null;

  let text = input
    .replace(/−/g, "-")
    .replace(/[ \s]/g, "")
    .trim();
  if (text === "") return null;

  let negative = false;

  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  text = text.replace(/usd/gi, "").replace(/[$€£]/g, "");

  while (text.startsWith("-") || text.startsWith("+")) {
    if (text.startsWith("-")) negative = !negative;
    text = text.slice(1);
  }
  while (text.endsWith("-") || text.endsWith("+")) {
    if (text.endsWith("-")) negative = !negative;
    text = text.slice(0, -1);
  }

  if (text === "" || !/^[\d.,]+$/.test(text)) return null;

  const separator = detectDecimalSeparator(text);
  let normalized: string;
  if (separator === ",") {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (separator === ".") {
    normalized = text.replace(/,/g, "");
  } else {
    normalized = text.replace(/[.,]/g, "");
  }

  const cents = decimalStringToCents(normalized);
  if (cents === null || Math.abs(cents) > MAX_ABS_CENTS) return null;

  return negative ? -cents : cents;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formats integer cents as `$1,234.56` (negatives render as `-$1,234.56`). */
export function formatCents(cents: number): string {
  return usdFormatter.format(cents / 100);
}

/** Formats integer cents compactly (`$1.2K`) for tight chart labels. */
export function formatCentsCompact(cents: number): string {
  if (Math.abs(cents) < 100_000) return usdFormatter.format(cents / 100);
  return usdCompactFormatter.format(cents / 100);
}

/** Formats integer cents with an explicit sign, e.g. `+$40.00` / `-$40.00`. */
export function formatCentsSigned(cents: number): string {
  const formatted = usdFormatter.format(Math.abs(cents) / 100);
  if (cents > 0) return `+${formatted}`;
  if (cents < 0) return `-${formatted}`;
  return formatted;
}

/** Renders integer cents as a bare decimal string for CSV output (`-12.34`). */
export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

/** Sums integer cents; safe because every term is already an integer. */
export function sumCents(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

/** `true` when the transaction represents money leaving the account. */
export function isExpense(amountCents: number): boolean {
  return amountCents < 0;
}

/** `true` when the transaction represents money entering the account. */
export function isIncome(amountCents: number): boolean {
  return amountCents > 0;
}

/** Positive spend magnitude of an expense; `0` for income. */
export function expenseMagnitude(amountCents: number): number {
  return amountCents < 0 ? -amountCents : 0;
}

/** Positive magnitude of income; `0` for expenses. */
export function incomeMagnitude(amountCents: number): number {
  return amountCents > 0 ? amountCents : 0;
}

/**
 * Percentage of `limit` consumed by `spent`, clamped at 0 and rounded to a whole
 * number. A zero or negative limit yields `0` when nothing is spent and `100`
 * otherwise, so progress bars never divide by zero.
 */
export function percentUsed(spentCents: number, limitCents: number): number {
  if (limitCents <= 0) return spentCents > 0 ? 100 : 0;
  return Math.max(0, Math.round((spentCents / limitCents) * 100));
}

export type BudgetStatus = "on-track" | "near-limit" | "over-budget";

/** Budget health for a category: >=100% is over, >=80% is near the limit. */
export function budgetStatus(spentCents: number, limitCents: number): BudgetStatus {
  const pct = percentUsed(spentCents, limitCents);
  if (limitCents > 0 && spentCents > limitCents) return "over-budget";
  if (pct >= 100) return spentCents > limitCents ? "over-budget" : "near-limit";
  if (pct >= 80) return "near-limit";
  return "on-track";
}
