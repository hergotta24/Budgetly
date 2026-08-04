import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFingerprint } from "@/lib/csv/fingerprint";
import { BudgetlyDatabase, setDb } from "@/lib/db/db";
import { UNCATEGORIZED_ID } from "@/lib/db/defaults";
import { addTransactions, ensureSeeded } from "@/lib/db/repo";
import type { Transaction } from "@/lib/db/schema";
import { renderWithProviders } from "@/test/renderWithProviders";
import { TransactionsView } from "./TransactionsView";

vi.mock("next/navigation", () => ({
  usePathname: () => "/transactions",
}));

let database: BudgetlyDatabase;
let dbIndex = 0;

function makeTransaction(
  id: string,
  date: string,
  description: string,
  amountCents: number,
): Transaction {
  return {
    id,
    date,
    description,
    amountCents,
    categoryId: UNCATEGORIZED_ID,
    accountId: "acct-default",
    notes: "",
    sourceImportId: null,
    fingerprint: buildFingerprint({
      date,
      description,
      amountCents,
      account: "Primary account",
    }),
    isDemo: false,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };
}

beforeEach(async () => {
  dbIndex += 1;
  database = new BudgetlyDatabase(`budgetly-view-test-${dbIndex}`);
  setDb(database);
  await ensureSeeded();
  await addTransactions([
    makeTransaction("t1", "2026-03-02", "Northwind Grocers", -11842),
    makeTransaction("t2", "2026-03-05", "Blue Harbor Cafe", -1850),
    makeTransaction("t3", "2026-03-10", "Lantern Labs Payroll", 312000),
  ]);
});

afterEach(async () => {
  await database.delete();
  setDb(null);
});

/**
 * The desktop table and the mobile list are both in the DOM and shown or hidden
 * with CSS, which jsdom does not evaluate — so row assertions are scoped to the
 * table to avoid matching the same transaction twice.
 */
async function findTableRows() {
  const table = await screen.findByRole("table");
  return within(table);
}

describe("TransactionsView", () => {
  it("lists persisted transactions with formatted amounts", async () => {
    renderWithProviders(<TransactionsView />);
    const table = await findTableRows();

    expect(table.getByText("Northwind Grocers")).toBeInTheDocument();
    expect(table.getByText("-$118.42")).toBeInTheDocument();
    expect(table.getByText("+$3,120.00")).toBeInTheDocument();
    expect(screen.getByText("3 of 3 transactions shown.")).toBeInTheDocument();
  });

  it("filters by search text and offers a way back", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsView />);
    expect((await findTableRows()).getByText("Northwind Grocers")).toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: /search descriptions/i }),
      "harbor",
    );

    await waitFor(async () =>
      expect(
        (await findTableRows()).queryByText("Northwind Grocers"),
      ).not.toBeInTheDocument(),
    );
    expect((await findTableRows()).getByText("Blue Harbor Cafe")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Clear filters" })[0]!);
    await waitFor(async () =>
      expect(
        (await findTableRows()).getByText("Northwind Grocers"),
      ).toBeInTheDocument(),
    );
  });

  it("shows an empty state when no transaction matches", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsView />);
    await findTableRows();

    await user.type(
      screen.getByRole("searchbox", { name: /search descriptions/i }),
      "zzzz",
    );

    expect(
      await screen.findByText("No transactions match these filters"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("filters to income only", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsView />);
    await findTableRows();

    await user.selectOptions(screen.getByRole("combobox", { name: "Type" }), "income");

    await waitFor(async () =>
      expect(
        (await findTableRows()).queryByText("Northwind Grocers"),
      ).not.toBeInTheDocument(),
    );
    expect(
      (await findTableRows()).getByText("Lantern Labs Payroll"),
    ).toBeInTheDocument();
  });

  it("persists an inline category change", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsView />);
    await findTableRows();

    const [select] = screen.getAllByRole("combobox", {
      name: "Category for Northwind Grocers",
    });
    await user.selectOptions(select!, "cat-groceries");

    await waitFor(async () => {
      const stored = await database.transactions.get("t1");
      expect(stored?.categoryId).toBe("cat-groceries");
    });
  });

  it("bulk-assigns a category to the selected rows", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsView />);
    await findTableRows();

    await user.click(
      screen.getAllByRole("checkbox", { name: "Select Northwind Grocers" })[0]!,
    );
    await user.click(
      screen.getAllByRole("checkbox", { name: "Select Blue Harbor Cafe" })[0]!,
    );

    expect(await screen.findByText("2 selected")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: "Assign category to selected transactions",
      }),
      "cat-dining",
    );

    await waitFor(async () => {
      const rows = await database.transactions.bulkGet(["t1", "t2"]);
      expect(rows.map((row) => row?.categoryId)).toEqual(["cat-dining", "cat-dining"]);
    });
  });

  it("deletes a transaction and restores it from the undo toast", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsView />);
    await findTableRows();

    await user.click(
      screen.getAllByRole("button", { name: "Delete Blue Harbor Cafe" })[0]!,
    );

    await waitFor(async () =>
      expect(await database.transactions.get("t2")).toBeUndefined(),
    );

    const toast = await screen.findByRole("status");
    await user.click(within(toast).getByRole("button", { name: "Undo" }));

    await waitFor(async () =>
      expect(await database.transactions.get("t2")).toBeDefined(),
    );
  });
});
