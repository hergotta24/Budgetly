import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const FIXTURE = fileURLToPath(
  new URL("./fixtures/sample-transactions.csv", import.meta.url),
);

/**
 * The fixture holds nine data rows for March 2026: seven importable, one exact
 * duplicate of an earlier row, and one row with no description.
 */
const READY_ROWS = 7;

async function importFixture(page: Page) {
  await page.getByLabel("Choose CSV files").setInputFiles(FIXTURE);

  // Step 2: the mapping is detected from the headers.
  await expect(
    page.getByRole("heading", { name: "sample-transactions.csv" }),
  ).toBeVisible();
  await expect(page.getByLabel("Date column")).toHaveValue("Post Date");
  await expect(page.getByLabel("Description / merchant column")).toHaveValue(
    "Description",
  );
  await expect(page.getByLabel("Amount column")).toHaveValue("Amount");
  await expect(page.getByLabel("Account column")).toHaveValue("Account");

  await page.getByRole("button", { name: "Preview import" }).click();

  // Step 3: the preview separates importable rows, duplicates and bad rows.
  await expect(page.getByText("Ready to import")).toBeVisible();
  await expect(page.locator("p", { hasText: /^7$/ }).first()).toBeVisible();
  await expect(
    page
      .getByRole("cell", { name: "Existing transaction" })
      .or(page.getByText("Earlier row in file")),
  ).toBeVisible();
  await expect(page.getByText("Description is empty.")).toBeVisible();

  await page.getByRole("button", { name: `Import ${READY_ROWS} transactions` }).click();

  await expect(
    page.getByRole("heading", { name: `${READY_ROWS} transactions saved` }),
  ).toBeVisible();
}

test("import, categorize, budget, persist, back up, reset and restore", async ({
  page,
}) => {
  // 1. An empty app starts on the onboarding screen.
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Turn a CSV export into a budget you actually use.",
    }),
  ).toBeVisible();

  // 2 & 3. Import the fixture through mapping and preview.
  await page.getByRole("link", { name: "Import a CSV" }).click();
  await expect(page).toHaveURL(/\/import$/);
  await importFixture(page);

  // 4. Categorize one transaction.
  await page.getByRole("link", { name: "View transactions" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(
    page.getByText(`${READY_ROWS} of ${READY_ROWS} transactions shown.`),
  ).toBeVisible();

  const table = page.getByRole("table");
  await table
    .getByRole("combobox", { name: "Category for Northwind Grocers" })
    .selectOption({ label: "Groceries" });

  // 5. Give that category a budget in the transaction's month.
  await page.getByRole("link", { name: "Budgets" }).click();
  await expect(page).toHaveURL(/\/budgets$/);
  await expect(page.getByRole("combobox", { name: "Month" })).toHaveValue("2026-03");

  const limit = page.getByLabel("Groceries monthly limit");
  await limit.fill("200");
  await limit.blur();
  await expect(page.getByText("$118.42 spent · 59% used · $81.58 left")).toBeVisible();

  // 6. The dashboard reflects both the transactions and the budget.
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("$3,120.00")).toBeVisible();
  await expect(page.getByText("$118.42 of $200.00")).toBeVisible();

  // 7. The data survives a full reload.
  await page.reload();
  await expect(page.getByText("$118.42 of $200.00")).toBeVisible();
  await expect(page.getByText("$3,120.00")).toBeVisible();

  // 8. Download a JSON backup.
  await page.getByRole("link", { name: "Export" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^budgetly-backup_.*\.json$/);

  const backupDir = await mkdtemp(path.join(tmpdir(), "budgetly-e2e-"));
  const backupPath = path.join(backupDir, download.suggestedFilename());
  await download.saveAs(backupPath);

  // 9. Reset every local record.
  await page.getByRole("link", { name: "Settings & data" }).click();
  await page.getByRole("button", { name: "Reset all data" }).click();
  await page.getByRole("button", { name: "Erase everything" }).click();
  await expect(page.getByText("All local data has been erased.")).toBeVisible();

  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(page.getByText("No transactions yet")).toBeVisible();

  // 10. Restoring the backup brings everything back.
  await page.getByRole("link", { name: "Export" }).click();
  await page.getByLabel("Choose a backup file").setInputFiles(backupPath);
  await expect(
    page.getByRole("heading", { name: "Restore this backup?" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByText(String(READY_ROWS))).toBeVisible();
  await page.getByRole("button", { name: "Replace my data" }).click();

  await expect(
    page.getByText(`Restored ${READY_ROWS} transactions from`),
  ).toBeVisible();

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByText("$118.42 of $200.00")).toBeVisible();
  await expect(page.getByText("$3,120.00")).toBeVisible();

  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(
    page.getByText(`${READY_ROWS} of ${READY_ROWS} transactions shown.`),
  ).toBeVisible();
});

test("demo data can be loaded and removed without leaving traces", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try demo data" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Spending by category")).toBeVisible();

  await page.getByRole("link", { name: "Settings & data" }).click();
  await page.getByRole("button", { name: "Remove demo data" }).click();
  await page.getByRole("button", { name: "Remove demo data" }).last().click();
  await expect(page.getByText("Demo data removed.")).toBeVisible();

  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(page.getByText("No transactions yet")).toBeVisible();
});

test("navigation reaches every route at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const routes: [string, RegExp][] = [
    ["Transactions", /\/transactions$/],
    ["Import", /\/import$/],
    ["Budgets", /\/budgets$/],
    ["Reports", /\/reports$/],
    ["Export", /\/export$/],
    ["Settings & data", /\/settings$/],
  ];

  for (const [label, url] of routes) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: label })
      .click();
    await expect(page).toHaveURL(url);
    // The page must render a heading, not a blank shell.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  // The page never scrolls sideways at 375px.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
