import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, INCOME_ID, UNCATEGORIZED_ID } from "@/lib/db/defaults";
import type { ColumnMapping } from "@/lib/db/schema";
import {
  buildStagedFile,
  collectAccountNames,
  materializeTransactions,
  stagedRowKey,
  FALLBACK_ACCOUNT_NAME,
} from "./buildImport";
import { detectMapping, normalizeHeader, validateMapping } from "./detect";
import { transactionsToCsv } from "./exportCsv";
import { buildFingerprint, normalizeDescription } from "./fingerprint";
import { CsvParseError, parseCsvText } from "./parse";

const DEFAULTS = { signConvention: "negative-is-expense", dateOrder: "mdy" } as const;

function mappingFor(headers: string[]): ColumnMapping {
  return detectMapping(headers, DEFAULTS);
}

const context = {
  categories: DEFAULT_CATEGORIES,
  existingFingerprints: new Set<string>(),
};

describe("parseCsvText", () => {
  it("reads a header row and trims cells", () => {
    const file = parseCsvText(
      "Date,Description,Amount\n2026-03-14, Coffee Shop ,-4.50\n",
      "bank.csv",
    );
    expect(file.headers).toEqual(["Date", "Description", "Amount"]);
    expect(file.rows).toEqual([
      { Date: "2026-03-14", Description: "Coffee Shop", Amount: "-4.50" },
    ]);
  });

  it("strips a UTF-8 BOM from the first header", () => {
    const file = parseCsvText("﻿Date,Amount\n2026-03-14,-1.00\n", "bom.csv");
    expect(file.headers[0]).toBe("Date");
  });

  it("disambiguates duplicate headers", () => {
    const file = parseCsvText("Date,Amount,Amount\n2026-03-14,1,2\n", "dupes.csv");
    expect(file.headers).toEqual(["Date", "Amount", "Amount (2)"]);
  });

  it("names blank headers rather than dropping the column", () => {
    const file = parseCsvText("Date,,Amount\n2026-03-14,x,1\n", "blank.csv");
    expect(file.headers).toEqual(["Date", "Column 2", "Amount"]);
  });

  it("rejects files with no data rows", () => {
    expect(() => parseCsvText("Date,Amount\n", "empty.csv")).toThrow(CsvParseError);
  });
});

describe("column detection", () => {
  it("normalizes headers for matching", () => {
    expect(normalizeHeader("Post Date")).toBe("postdate");
    expect(normalizeHeader(" Transaction_Amount ")).toBe("transactionamount");
  });

  it("detects a single-amount layout", () => {
    const mapping = mappingFor(["Post Date", "Description", "Amount", "Category"]);
    expect(mapping.date).toBe("Post Date");
    expect(mapping.description).toBe("Description");
    expect(mapping.amountMode).toBe("single");
    expect(mapping.amount).toBe("Amount");
    expect(mapping.category).toBe("Category");
  });

  it("switches to debit/credit mode when there is no amount column", () => {
    const mapping = mappingFor(["Date", "Memo", "Withdrawal", "Deposit"]);
    expect(mapping.amountMode).toBe("debit-credit");
    expect(mapping.debit).toBe("Withdrawal");
    expect(mapping.credit).toBe("Deposit");
    expect(mapping.amount).toBeNull();
  });

  it("reports what is missing from an incomplete mapping", () => {
    const mapping = mappingFor(["Foo", "Bar"]);
    const errors = validateMapping(mapping);
    expect(errors).toHaveLength(3);
    expect(validateMapping(mappingFor(["Date", "Description", "Amount"]))).toEqual([]);
  });
});

describe("fingerprints", () => {
  it("ignores case and whitespace in descriptions", () => {
    expect(normalizeDescription("  Blue   HARBOR  Cafe ")).toBe("blue harbor cafe");
  });

  it("matches transactions that differ only in formatting", () => {
    const a = buildFingerprint({
      date: "2026-03-14",
      description: "Blue Harbor Cafe",
      amountCents: -1850,
      account: "Checking",
    });
    const b = buildFingerprint({
      date: "2026-03-14",
      description: "blue   harbor cafe",
      amountCents: -1850,
      account: " checking ",
    });
    expect(a).toBe(b);
  });

  it("separates transactions that differ in any component", () => {
    const base = {
      date: "2026-03-14",
      description: "Blue Harbor Cafe",
      amountCents: -1850,
      account: "Checking",
    };
    expect(buildFingerprint(base)).not.toBe(
      buildFingerprint({ ...base, date: "2026-03-15" }),
    );
    expect(buildFingerprint(base)).not.toBe(
      buildFingerprint({ ...base, amountCents: -1851 }),
    );
    expect(buildFingerprint(base)).not.toBe(
      buildFingerprint({ ...base, account: "Savings" }),
    );
  });
});

describe("buildStagedFile", () => {
  it("stages valid rows with the file's sign convention", () => {
    const file = parseCsvText(
      [
        "Date,Description,Amount",
        "03/14/2026,Northwind Grocers,-118.42",
        "03/15/2026,Lantern Labs Payroll,3120.00",
      ].join("\n"),
      "bank.csv",
    );
    const staged = buildStagedFile(file, mappingFor(file.headers), context);

    expect(staged.readyCount).toBe(2);
    expect(staged.invalidCount).toBe(0);
    expect(staged.rows[0]?.draft).toMatchObject({
      date: "2026-03-14",
      description: "Northwind Grocers",
      amountCents: -11842,
      categoryId: UNCATEGORIZED_ID,
      accountName: FALLBACK_ACCOUNT_NAME,
    });
    // Positive amounts land in Income by default so cash flow is right away correct.
    expect(staged.rows[1]?.draft?.categoryId).toBe(INCOME_ID);
  });

  it("flips the sign for card statements that list expenses as positive", () => {
    const file = parseCsvText(
      "Date,Description,Amount\n03/14/2026,Willowbrook Apparel,88.10",
      "card.csv",
    );
    const mapping: ColumnMapping = {
      ...mappingFor(file.headers),
      signConvention: "positive-is-expense",
    };
    const staged = buildStagedFile(file, mapping, context);
    expect(staged.rows[0]?.draft?.amountCents).toBe(-8810);
  });

  it("reads separate debit and credit columns regardless of their signs", () => {
    const file = parseCsvText(
      [
        "Date,Memo,Withdrawal,Deposit",
        "03/14/2026,Rent,1650.00,",
        "03/16/2026,Refund,,25.00",
        "03/17/2026,Odd row,-40.00,",
      ].join("\n"),
      "checking.csv",
    );
    const staged = buildStagedFile(file, mappingFor(file.headers), context);

    expect(staged.rows[0]?.draft?.amountCents).toBe(-165000);
    expect(staged.rows[1]?.draft?.amountCents).toBe(2500);
    expect(staged.rows[2]?.draft?.amountCents).toBe(-4000);
  });

  it("flags unreadable rows with a reason and never stages them", () => {
    const file = parseCsvText(
      [
        "Date,Description,Amount",
        "not a date,Something,-1.00",
        "03/14/2026,,-1.00",
        "03/14/2026,Zero,0.00",
        "03/14/2026,Bad amount,pending",
      ].join("\n"),
      "messy.csv",
    );
    const staged = buildStagedFile(file, mappingFor(file.headers), context);

    expect(staged.invalidCount).toBe(4);
    expect(staged.readyCount).toBe(0);
    expect(staged.rows[0]?.issues[0]).toContain("date");
    expect(staged.rows[1]?.issues[0]).toContain("Description");
    expect(staged.rows[2]?.issues[0]).toContain("zero");
    expect(staged.rows[3]?.issues[0]).toContain("amount");
    expect(
      staged.rows.every((row) => row.draft === null || row.status !== "invalid"),
    ).toBe(true);
  });

  it("marks rows that already exist in the database as duplicates", () => {
    const file = parseCsvText(
      "Date,Description,Amount\n03/14/2026,Northwind Grocers,-118.42",
      "again.csv",
    );
    const fingerprint = buildFingerprint({
      date: "2026-03-14",
      description: "Northwind Grocers",
      amountCents: -11842,
      account: FALLBACK_ACCOUNT_NAME,
    });
    const staged = buildStagedFile(file, mappingFor(file.headers), {
      ...context,
      existingFingerprints: new Set([fingerprint]),
    });

    expect(staged.duplicateCount).toBe(1);
    expect(staged.readyCount).toBe(0);
    expect(staged.rows[0]?.duplicateOf).toBe("existing");
  });

  it("marks a repeated row inside the same file as a duplicate", () => {
    const file = parseCsvText(
      [
        "Date,Description,Amount",
        "03/14/2026,Fable Coffee Roasters,-6.25",
        "03/14/2026,Fable Coffee Roasters,-6.25",
      ].join("\n"),
      "twice.csv",
    );
    const staged = buildStagedFile(file, mappingFor(file.headers), context);

    expect(staged.readyCount).toBe(1);
    expect(staged.duplicateCount).toBe(1);
    expect(staged.rows[1]?.duplicateOf).toBe("file");
  });

  it("uses the account column when present", () => {
    const file = parseCsvText(
      "Date,Description,Amount,Account\n03/14/2026,Rent,-1650.00,Joint Checking",
      "multi.csv",
    );
    const staged = buildStagedFile(file, mappingFor(file.headers), context);
    expect(staged.rows[0]?.draft?.accountName).toBe("Joint Checking");
    expect(collectAccountNames([staged])).toEqual(["Joint Checking"]);
  });

  it("maps a category column onto existing categories, case-insensitively", () => {
    const file = parseCsvText(
      [
        "Date,Description,Amount,Category",
        "03/14/2026,Northwind Grocers,-118.42,groceries",
        "03/15/2026,Mystery,-10.00,Nonexistent Bucket",
      ].join("\n"),
      "categorized.csv",
    );
    const staged = buildStagedFile(file, mappingFor(file.headers), context);

    expect(staged.rows[0]?.draft?.categoryId).toBe("cat-groceries");
    expect(staged.rows[1]?.draft?.categoryId).toBe(UNCATEGORIZED_ID);
    expect(staged.rows[1]?.issues[0]).toContain("Nonexistent Bucket");
  });
});

describe("materializeTransactions", () => {
  const file = parseCsvText(
    [
      "Date,Description,Amount",
      "03/14/2026,Northwind Grocers,-118.42",
      "03/14/2026,Northwind Grocers,-118.42",
    ].join("\n"),
    "twice.csv",
  );
  const staged = buildStagedFile(file, mappingFor(file.headers), context);
  const accountIdByName = new Map([[FALLBACK_ACCOUNT_NAME, "acct-1"]]);

  it("drops duplicates the user did not opt into", () => {
    const transactions = materializeTransactions([staged], {
      includedDuplicates: new Set(),
      accountIdByName,
      importId: "import-1",
      timestamp: "2026-03-14T00:00:00.000Z",
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      amountCents: -11842,
      sourceImportId: "import-1",
      isDemo: false,
    });
  });

  it("includes duplicates that were explicitly selected", () => {
    const transactions = materializeTransactions([staged], {
      includedDuplicates: new Set([stagedRowKey("twice.csv", 2)]),
      accountIdByName,
      importId: "import-1",
      timestamp: "2026-03-14T00:00:00.000Z",
    });
    expect(transactions).toHaveLength(2);
  });
});

describe("transactionsToCsv", () => {
  const transaction = {
    id: "txn-1",
    date: "2026-03-14",
    description: 'Cafe "Corner", downtown',
    amountCents: -1850,
    categoryId: "cat-dining",
    accountId: "acct-1",
    notes: "split with Sam",
    sourceImportId: null,
    fingerprint: "fp",
    isDemo: false,
    createdAt: "2026-03-14T00:00:00.000Z",
    updatedAt: "2026-03-14T00:00:00.000Z",
  };

  it("writes a header, escapes quotes and commas, and keeps the sign", () => {
    const csv = transactionsToCsv([transaction], {
      categories: DEFAULT_CATEGORIES,
      accounts: [{ id: "acct-1", name: "Checking", isDemo: false }],
    });

    expect(csv.startsWith("﻿Date,Description,Amount,Category,Account,Notes")).toBe(
      true,
    );
    expect(csv).toContain('"Cafe ""Corner"", downtown"');
    expect(csv).toContain("-18.50");
    expect(csv).toContain("Dining");
    expect(csv).toContain("Checking");
  });

  it("round-trips back through the importer", () => {
    const csv = transactionsToCsv([transaction], {
      categories: DEFAULT_CATEGORIES,
      accounts: [{ id: "acct-1", name: "Checking", isDemo: false }],
    });
    const reparsed = parseCsvText(csv, "budgetly-export.csv");
    const staged = buildStagedFile(reparsed, mappingFor(reparsed.headers), context);

    expect(staged.readyCount).toBe(1);
    expect(staged.rows[0]?.draft).toMatchObject({
      date: "2026-03-14",
      description: 'Cafe "Corner", downtown',
      amountCents: -1850,
      categoryId: "cat-dining",
      accountName: "Checking",
    });
  });
});
