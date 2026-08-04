import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentMonth,
  fileTimestamp,
  formatDate,
  formatMonth,
  isIsoDate,
  isIsoMonth,
  monthEnd,
  monthOf,
  monthRange,
  monthStart,
  parseDateToIso,
} from "./date";

describe("parseDateToIso", () => {
  it("passes ISO dates through", () => {
    expect(parseDateToIso("2026-03-14")).toBe("2026-03-14");
    expect(parseDateToIso("2026-3-4")).toBe("2026-03-04");
  });

  it("drops a trailing time component", () => {
    expect(parseDateToIso("2026-03-14T00:00:00Z")).toBe("2026-03-14");
    expect(parseDateToIso("2026-03-14 13:45")).toBe("2026-03-14");
  });

  it("reads US month-first dates by default", () => {
    expect(parseDateToIso("03/14/2026")).toBe("2026-03-14");
    expect(parseDateToIso("3/4/2026", "mdy")).toBe("2026-03-04");
    expect(parseDateToIso("03-14-2026")).toBe("2026-03-14");
  });

  it("honors an explicit day-first order", () => {
    expect(parseDateToIso("03/04/2026", "dmy")).toBe("2026-04-03");
    expect(parseDateToIso("14/03/2026", "dmy")).toBe("2026-03-14");
  });

  it("falls back to day-first when month-first is impossible in auto mode", () => {
    expect(parseDateToIso("14/03/2026", "auto")).toBe("2026-03-14");
    expect(parseDateToIso("03/04/2026", "auto")).toBe("2026-03-04");
  });

  it("expands two-digit years", () => {
    expect(parseDateToIso("03/14/26")).toBe("2026-03-14");
    expect(parseDateToIso("03/14/98")).toBe("1998-03-14");
  });

  it("reads textual dates in both orders", () => {
    expect(parseDateToIso("Mar 14, 2026")).toBe("2026-03-14");
    expect(parseDateToIso("March 14 2026")).toBe("2026-03-14");
    expect(parseDateToIso("14 Mar 2026")).toBe("2026-03-14");
    expect(parseDateToIso("Sept 1, 2026")).toBe("2026-09-01");
  });

  it("reads year-first slashed dates", () => {
    expect(parseDateToIso("2026/03/14")).toBe("2026-03-14");
  });

  it("rejects impossible and unreadable dates", () => {
    expect(parseDateToIso("2026-02-30")).toBeNull();
    expect(parseDateToIso("13/14/2026", "mdy")).toBeNull();
    expect(parseDateToIso("not a date")).toBeNull();
    expect(parseDateToIso("")).toBeNull();
    expect(parseDateToIso(null)).toBeNull();
  });

  it("keeps leap days", () => {
    expect(parseDateToIso("02/29/2024")).toBe("2024-02-29");
    expect(parseDateToIso("02/29/2026")).toBeNull();
  });
});

describe("month helpers", () => {
  it("derives the month key from a date", () => {
    expect(monthOf("2026-03-14")).toBe("2026-03");
  });

  it("shifts months across year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-03", -6)).toBe("2025-09");
  });

  it("finds month bounds, including leap years", () => {
    expect(monthStart("2026-03")).toBe("2026-03-01");
    expect(monthEnd("2026-03")).toBe("2026-03-31");
    expect(monthEnd("2026-02")).toBe("2026-02-28");
    expect(monthEnd("2024-02")).toBe("2024-02-29");
  });

  it("builds inclusive month ranges", () => {
    expect(monthRange("2026-01", "2026-04")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
    expect(monthRange("2026-04", "2026-01")).toEqual([]);
  });

  it("validates month and date strings", () => {
    expect(isIsoMonth("2026-03")).toBe(true);
    expect(isIsoMonth("2026-13")).toBe(false);
    expect(isIsoDate("2026-03-14")).toBe(true);
    expect(isIsoDate("2026-03-32")).toBe(false);
  });
});

describe("formatting", () => {
  it("formats dates in UTC so they never shift a day", () => {
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDate("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("formats month labels", () => {
    expect(formatMonth("2026-03")).toBe("March 2026");
  });

  it("builds filename-safe timestamps", () => {
    expect(fileTimestamp(new Date(2026, 2, 14, 9, 5))).toBe("2026-03-14_0905");
  });

  it("reports the current month for a given clock", () => {
    expect(currentMonth(new Date(2026, 7, 4))).toBe("2026-08");
  });
});
