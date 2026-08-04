import { describe, expect, it } from "vitest";
import {
  budgetStatus,
  centsToDecimalString,
  expenseMagnitude,
  formatCents,
  formatCentsSigned,
  incomeMagnitude,
  isExpense,
  isIncome,
  parseAmountToCents,
  percentUsed,
  sumCents,
} from "./money";

describe("parseAmountToCents", () => {
  it("parses plain decimals into integer cents", () => {
    expect(parseAmountToCents("12.34")).toBe(1234);
    expect(parseAmountToCents("12")).toBe(1200);
    expect(parseAmountToCents("12.3")).toBe(1230);
    expect(parseAmountToCents("0.05")).toBe(5);
    expect(parseAmountToCents(".99")).toBe(99);
  });

  it("strips currency symbols, codes and thousands separators", () => {
    expect(parseAmountToCents("$1,234.56")).toBe(123456);
    expect(parseAmountToCents("USD 1,234.56")).toBe(123456);
    expect(parseAmountToCents("1,234,567.89")).toBe(123456789);
    expect(parseAmountToCents(" $ 45.00 ")).toBe(4500);
  });

  it("understands every common way a CSV marks a negative", () => {
    expect(parseAmountToCents("-24.50")).toBe(-2450);
    expect(parseAmountToCents("(24.50)")).toBe(-2450);
    expect(parseAmountToCents("24.50-")).toBe(-2450);
    expect(parseAmountToCents("−24.50")).toBe(-2450); // unicode minus
    expect(parseAmountToCents("($1,024.50)")).toBe(-102450);
  });

  it("treats a lone comma with two decimals as a European decimal point", () => {
    expect(parseAmountToCents("1,50")).toBe(150);
    expect(parseAmountToCents("1.234,56")).toBe(123456);
  });

  it("treats a lone comma with three digits as a thousands separator", () => {
    expect(parseAmountToCents("1,234")).toBe(123400);
  });

  it("rounds half-up beyond two decimal places", () => {
    expect(parseAmountToCents("1.005")).toBe(101);
    expect(parseAmountToCents("1.004")).toBe(100);
    expect(parseAmountToCents("0.125")).toBe(13);
  });

  it("accepts numbers as well as strings", () => {
    expect(parseAmountToCents(19.99)).toBe(1999);
    expect(parseAmountToCents(-19.99)).toBe(-1999);
    expect(parseAmountToCents(0)).toBe(0);
  });

  it("rejects anything that is not an amount", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("   ")).toBeNull();
    expect(parseAmountToCents("pending")).toBeNull();
    expect(parseAmountToCents("12.34.56.78")).not.toBeNull(); // grouped digits
    expect(parseAmountToCents("$-")).toBeNull();
    expect(parseAmountToCents(null)).toBeNull();
    expect(parseAmountToCents(undefined)).toBeNull();
    expect(parseAmountToCents(Number.NaN)).toBeNull();
    expect(parseAmountToCents(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("integer-cent arithmetic", () => {
  it("sums amounts that would drift as floats", () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point; in cents it is exact.
    const cents = [10, 20].map((value) => value);
    expect(sumCents(cents)).toBe(30);

    const many = Array.from({ length: 1000 }, () => 1); // 1000 x $0.01
    expect(sumCents(many)).toBe(1000);
    expect(centsToDecimalString(sumCents(many))).toBe("10.00");
  });

  it("keeps a long ledger exact", () => {
    const amounts = ["-19.99", "-0.01", "1234.56", "-1000.00", "0.45"].map(
      (value) => parseAmountToCents(value) ?? 0,
    );
    expect(sumCents(amounts)).toBe(21501);
    expect(centsToDecimalString(sumCents(amounts))).toBe("215.01");
  });
});

describe("sign convention", () => {
  it("treats negative amounts as money leaving the account", () => {
    expect(isExpense(-2450)).toBe(true);
    expect(isIncome(-2450)).toBe(false);
    expect(expenseMagnitude(-2450)).toBe(2450);
    expect(incomeMagnitude(-2450)).toBe(0);
  });

  it("treats positive amounts as money entering the account", () => {
    expect(isIncome(312000)).toBe(true);
    expect(isExpense(312000)).toBe(false);
    expect(incomeMagnitude(312000)).toBe(312000);
    expect(expenseMagnitude(312000)).toBe(0);
  });
});

describe("formatting", () => {
  it("formats USD consistently", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(-2450)).toBe("-$24.50");
  });

  it("adds an explicit sign when direction matters", () => {
    expect(formatCentsSigned(312000)).toBe("+$3,120.00");
    expect(formatCentsSigned(-2450)).toBe("-$24.50");
    expect(formatCentsSigned(0)).toBe("$0.00");
  });

  it("renders bare decimals for CSV export", () => {
    expect(centsToDecimalString(123456)).toBe("1234.56");
    expect(centsToDecimalString(-5)).toBe("-0.05");
    expect(centsToDecimalString(0)).toBe("0.00");
  });
});

describe("budget progress", () => {
  it("computes the percentage of a limit that has been used", () => {
    expect(percentUsed(5000, 10000)).toBe(50);
    expect(percentUsed(10000, 10000)).toBe(100);
    expect(percentUsed(12500, 10000)).toBe(125);
    expect(percentUsed(0, 10000)).toBe(0);
  });

  it("never divides by zero", () => {
    expect(percentUsed(0, 0)).toBe(0);
    expect(percentUsed(500, 0)).toBe(100);
  });

  it("classifies budget health", () => {
    expect(budgetStatus(1000, 10000)).toBe("on-track");
    expect(budgetStatus(7900, 10000)).toBe("on-track");
    expect(budgetStatus(8000, 10000)).toBe("near-limit");
    expect(budgetStatus(10000, 10000)).toBe("near-limit");
    expect(budgetStatus(10001, 10000)).toBe("over-budget");
  });
});
