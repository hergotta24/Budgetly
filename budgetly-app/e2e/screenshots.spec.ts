import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * Not an assertion suite — this captures the app at mobile and desktop widths so
 * the layout can be reviewed. Run with `pnpm test:e2e screenshots`.
 */

const OUT = fileURLToPath(new URL("../screenshots/", import.meta.url));

const ROUTES: [string, string][] = [
  ["/", "dashboard"],
  ["/transactions", "transactions"],
  ["/import", "import"],
  ["/budgets", "budgets"],
  ["/reports", "reports"],
  ["/export", "export"],
  ["/settings", "settings"],
];

async function seedDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try demo data" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("capture desktop light", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedDemo(page);
  for (const [route, name] of ROUTES) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(OUT, `desktop-${name}.png`),
      fullPage: true,
    });
  }
});

test("capture desktop dark", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedDemo(page);
  await page.getByRole("radio", { name: "Dark theme" }).first().click();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(OUT, "desktop-dark-dashboard.png"),
    fullPage: true,
  });
  await page.goto("/budgets");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: path.join(OUT, "desktop-dark-budgets.png"),
    fullPage: true,
  });
});

test("capture mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await seedDemo(page);
  for (const [route, name] of ROUTES) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(150);
    // Viewport-only: a full-page capture of a long list is unreadable when scaled.
    await page.screenshot({ path: path.join(OUT, `mobile-${name}.png`) });
  }
});

test("capture onboarding", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: path.join(OUT, "desktop-onboarding.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: path.join(OUT, "mobile-onboarding.png"),
    fullPage: true,
  });
});
