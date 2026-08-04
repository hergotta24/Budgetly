/**
 * Date helpers.
 *
 * Transaction dates are stored as plain `YYYY-MM-DD` calendar strings — never as
 * timestamps — so a transaction never drifts across a day boundary because of the
 * viewer's timezone. All formatting is done in UTC against a synthetic `Date`.
 */

export type IsoDate = string; // YYYY-MM-DD
export type IsoMonth = string; // YYYY-MM

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const ISO_DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const ISO_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const SLASHED_RE = /^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/;
const TEXTUAL_MDY_RE = /^([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{2,4})$/i;
const TEXTUAL_DMY_RE = /^(\d{1,2})\s+([a-z]{3,9})\.?,?\s+(\d{2,4})$/i;

function isValidYmd(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function toIso(year: number, month: number, day: number): IsoDate | null {
  if (!isValidYmd(year, month, day)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
}

function expandYear(value: number): number {
  if (value >= 100) return value;
  // Two-digit years: 70-99 => 1970-1999, 00-69 => 2000-2069.
  return value >= 70 ? 1900 + value : 2000 + value;
}

function monthFromName(name: string): number | null {
  const lower = name.toLowerCase();
  const index = MONTH_NAMES.findIndex(
    (month) => month === lower || month.slice(0, 3) === lower.slice(0, 3),
  );
  return index === -1 ? null : index + 1;
}

export type DateOrder = "auto" | "mdy" | "dmy";

/**
 * Parses a raw CSV date cell into a `YYYY-MM-DD` string, or `null` if it cannot
 * be understood.
 *
 * `order` controls how ambiguous numeric dates like `03/04/2026` are read:
 * `"mdy"` (US, the default) or `"dmy"`. `"auto"` uses month-first unless the
 * first component is greater than 12, which can only be a day.
 */
export function parseDateToIso(input: unknown, order: DateOrder = "auto"): IsoDate | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return toIso(input.getFullYear(), input.getMonth() + 1, input.getDate());
  }

  if (typeof input !== "string") return null;

  // Trim, drop any trailing time-of-day component.
  const text = input.trim().replace(/[T\s]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i, "");
  if (text === "") return null;

  const isoMatch = ISO_DATE_RE.exec(text);
  if (isoMatch) {
    return toIso(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const textualMdy = TEXTUAL_MDY_RE.exec(text);
  if (textualMdy) {
    const month = monthFromName(textualMdy[1] ?? "");
    if (month === null) return null;
    return toIso(expandYear(Number(textualMdy[3])), month, Number(textualMdy[2]));
  }

  const textualDmy = TEXTUAL_DMY_RE.exec(text);
  if (textualDmy) {
    const month = monthFromName(textualDmy[2] ?? "");
    if (month === null) return null;
    return toIso(expandYear(Number(textualDmy[3])), month, Number(textualDmy[1]));
  }

  const slashed = SLASHED_RE.exec(text);
  if (slashed) {
    const a = Number(slashed[1]);
    const b = Number(slashed[2]);
    const c = Number(slashed[3]);

    // YYYY/MM/DD
    if ((slashed[1] ?? "").length === 4) return toIso(a, b, c);

    const year = expandYear(c);
    if (order === "dmy") return toIso(year, b, a);
    if (order === "mdy") return toIso(year, a, b);
    // auto: month-first unless impossible.
    if (a > 12 && b <= 12) return toIso(year, b, a);
    return toIso(year, a, b);
  }

  return null;
}

/** `"2026-03-14"` => `"2026-03"`. */
export function monthOf(date: IsoDate): IsoMonth {
  return date.slice(0, 7);
}

/** `true` when the string is a well-formed `YYYY-MM` month key. */
export function isIsoMonth(value: string): value is IsoMonth {
  return ISO_MONTH_RE.test(value);
}

/** `true` when the string is a well-formed `YYYY-MM-DD` calendar date. */
export function isIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  return isValidYmd(Number(match[1]), Number(match[2]), Number(match[3]));
}

function utcDate(date: IsoDate): Date {
  const [year = "1970", month = "01", day = "01"] = date.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});

const shortMonthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

/** `"2026-03-14"` => `"Mar 14, 2026"`. */
export function formatDate(date: IsoDate): string {
  return shortDateFormatter.format(utcDate(date));
}

/** `"2026-03"` => `"March 2026"`. */
export function formatMonth(month: IsoMonth): string {
  return monthLabelFormatter.format(utcDate(`${month}-01`));
}

/** `"2026-03"` => `"Mar"`, for compact chart axes. */
export function formatMonthShort(month: IsoMonth): string {
  return shortMonthLabelFormatter.format(utcDate(`${month}-01`));
}

/** Formats an ISO timestamp for display in import history and backups. */
export function formatTimestamp(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

/** Shifts a `YYYY-MM` key by `delta` months. */
export function addMonths(month: IsoMonth, delta: number): IsoMonth {
  const [yearRaw = "1970", monthRaw = "01"] = month.split("-");
  const base = new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1 + delta, 1));
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** First calendar day of a month, as `YYYY-MM-DD`. */
export function monthStart(month: IsoMonth): IsoDate {
  return `${month}-01`;
}

/** Last calendar day of a month, as `YYYY-MM-DD`. */
export function monthEnd(month: IsoMonth): IsoDate {
  const [yearRaw = "1970", monthRaw = "01"] = month.split("-");
  const last = new Date(Date.UTC(Number(yearRaw), Number(monthRaw), 0));
  return `${month}-${String(last.getUTCDate()).padStart(2, "0")}`;
}

/** The current month in the viewer's local timezone. */
export function currentMonth(now: Date = new Date()): IsoMonth {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Today's calendar date in the viewer's local timezone. */
export function today(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/** Inclusive list of month keys from `from` to `to`. */
export function monthRange(from: IsoMonth, to: IsoMonth): IsoMonth[] {
  const months: IsoMonth[] = [];
  let cursor = from;
  // Guard against a reversed range or runaway loops.
  for (let i = 0; i < 600 && cursor <= to; i += 1) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

/** Filename-friendly timestamp such as `2026-03-14_0915`. */
export function fileTimestamp(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}`;
}
