import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFingerprint } from "@/lib/csv/fingerprint";
import { BudgetlyDatabase, setDb } from "@/lib/db/db";
import { addTransactions, ensureSeeded, setBudget } from "@/lib/db/repo";
import type { Transaction } from "@/lib/db/schema";
import { renderWithProviders } from "@/test/renderWithProviders";
import { BudgetsView } from "./BudgetsView";

vi.mock("next/navigation", () => ({
  usePathname: () => "/budgets",
}));

let database: BudgetlyDatabase;
let dbIndex = 0;

function makeTransaction(
  id: string,
  date: string,
  description: string,
  amountCents: number,
  categoryId: string,
): Transaction {
  return {
    id,
    date,
    description,
    amountCents,
    categoryId,
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
  database = new BudgetlyDatabase(`budgetly-budgets-test-${dbIndex}`);
  setDb(database);
  await ensureSeeded();
  await addTransactions([
    makeTransaction("t1", "2026-03-02", "Northwind Grocers", -12000, "cat-groceries"),
    makeTransaction("t2", "2026-03-12", "Northwind Grocers", -8000, "cat-groceries"),
    makeTransaction("t3", "2026-03-01", "Lantern Labs Payroll", 312000, "cat-income"),
  ]);
});

afterEach(async () => {
  await database.delete();
  setDb(null);
});

describe("BudgetsView", () => {
  it("defaults to the latest month that has transactions", async () => {
    renderWithProviders(<BudgetsView />);
    expect(await screen.findByDisplayValue("March 2026")).toBeInTheDocument();
  });

  it("saves a budget limit and shows actual-versus-budget", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BudgetsView />);

    const input = await screen.findByLabelText("Groceries monthly limit");
    await user.type(input, "250");
    await user.tab();

    await waitFor(async () => {
      const budgets = await database.budgets.toArray();
      expect(budgets).toEqual([
        expect.objectContaining({
          month: "2026-03",
          categoryId: "cat-groceries",
          limitCents: 25000,
        }),
      ]);
    });

    expect(
      await screen.findByText(/\$200\.00 spent · 80% used · \$50\.00 left/),
    ).toBeInTheDocument();
    expect(await screen.findByText("Near limit")).toBeInTheDocument();
  });

  it("never counts income toward an expense budget", async () => {
    renderWithProviders(<BudgetsView />);
    await screen.findByLabelText("Groceries monthly limit");

    // Income has its own kind, so it gets no limit field on the budgets list.
    expect(screen.queryByLabelText("Income monthly limit")).not.toBeInTheDocument();
  });

  it("copies the previous month's budgets into the selected month", async () => {
    const user = userEvent.setup();
    await setBudget("2026-02", "cat-groceries", 30000);
    await setBudget("2026-02", "cat-dining", 12000);

    renderWithProviders(<BudgetsView />);

    await user.click(await screen.findByRole("button", { name: /Copy February 2026/ }));

    await waitFor(async () => {
      const march = await database.budgets.where("month").equals("2026-03").toArray();
      expect(march).toHaveLength(2);
    });
    expect(await screen.findByDisplayValue("300.00")).toBeInTheDocument();
  });

  it("clearing a limit removes the budget", async () => {
    const user = userEvent.setup();
    await setBudget("2026-03", "cat-groceries", 25000);

    renderWithProviders(<BudgetsView />);

    const input = await screen.findByLabelText("Groceries monthly limit");
    await waitFor(() => expect(input).toHaveValue("250.00"));

    await user.clear(input);
    await user.tab();

    await waitFor(async () => expect(await database.budgets.count()).toBe(0));
  });
});
