import { expect, test, type Locator } from "@playwright/test";
import { HISTORY_SUMMARY_KEY } from "../../src/lib/storage/workspace";

const definition = (region: Locator, label: string) =>
  region.getByText(label, { exact: true }).locator("xpath=following-sibling::dd[1]");

test("upload shows fee-adjusted statistics immediately and saves only on confirmation", async ({ page }) => {
  await page.goto("/history");
  const stats = page.getByRole("region", { name: "Performance overview" });
  await expect(stats).toHaveCount(0);
  await page.getByLabel("Starting balance", { exact: true }).fill("1000");
  await page.locator('input[type="file"]').setInputFiles("tests/fixtures/performance.csv");

  await expect(stats).toBeFocused();
  await expect(stats.getByText("performance.csv", { exact: true })).toBeVisible();
  await expect(definition(stats, "Net realized P&L")).toHaveText("+50.00");
  await expect(stats.getByText("+5.00%", { exact: true })).toBeVisible();
  await expect(definition(stats, "Win rate")).toContainText("33.3%");
  await expect(definition(stats, "Profit factor")).toContainText("2.00×");
  await expect(definition(stats, "Expectancy")).toContainText("+16.67");
  await expect(definition(stats, "Max balance drawdown")).toContainText("50.00");
  await expect(stats.getByRole("list", { name: "Trade outcome counts" }).getByRole("listitem")).toHaveText([
    "1 win",
    "1 loss",
    "1 break-even",
  ]);
  await expect(stats.getByRole("img", { name: /Cumulative P&L.*ends at \+50.00/ })).toBeVisible();
  await expect(stats.getByText(/3 of 5 rows included\. Excluded: 1 invalid, 1 duplicate/)).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), HISTORY_SUMMARY_KEY)).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByLabel("Starting balance", { exact: true }).fill("2000");
  await expect(stats.getByText("+2.50%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Analyze 3 valid trades" }).click();
  await expect(page.getByRole("heading", { name: "3 closed trades analyzed" })).toBeVisible();
  await page.reload();
  await expect(stats.getByText("Last saved analysis")).toBeVisible();
  await expect(definition(stats, "Net realized P&L")).toHaveText("+50.00");
  await expect(stats.getByText("+2.50%", { exact: true })).toBeVisible();
  await expect(stats.getByRole("img")).toHaveCount(0);
  await expect(stats.getByText(/Re-import the CSV to see the daily P&L curve/)).toBeVisible();
  await stats.getByRole("button", { name: "Clear summary" }).click();
  await expect(stats).toHaveCount(0);
});

test("statistics follow corrected mappings and never show stale or invented ratios", async ({ page }) => {
  await page.goto("/history");
  const stats = page.getByRole("region", { name: "Performance overview" });
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "unmapped.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "symbol,side,openTime,closeTime,result,alternative\nEURUSD,buy,2026-10-05T08:00:00Z,2026-10-05T10:00:00Z,-30,0",
    ),
  });
  await expect(page.getByRole("button", { name: "Analyze 0 valid trades" })).toBeDisabled();
  await expect(stats).toHaveCount(0);
  const profit = page.getByRole("combobox", { name: "Profit / loss" });
  await profit.selectOption({ label: "result" });
  await expect(definition(stats, "Net realized P&L")).toHaveText("-30.00");
  await expect(definition(stats, "Profit factor")).toContainText("0.00×");
  await page.getByRole("button", { name: "Analyze 1 valid trade" }).click();
  await expect(page.getByRole("heading", { name: "1 closed trade analyzed" })).toBeVisible();
  await profit.selectOption({ label: "alternative" });
  await expect(page.getByRole("region", { name: "Trade analysis results" })).toHaveCount(0);
  await expect(definition(stats, "Net realized P&L")).toHaveText("0.00");
  await expect(definition(stats, "Profit factor")).toContainText("—");
  await expect(stats.getByText("1 break-even", { exact: true })).toBeVisible();
  await page.getByLabel("Starting balance", { exact: true }).fill("0");
  await expect(stats.getByText(/Return unavailable/)).toBeVisible();
  await page.getByLabel("Starting balance", { exact: true }).fill("-1");
  await expect(stats).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("non-negative starting balance");
  await page.getByLabel("Starting balance", { exact: true }).fill("1000");
  await expect(definition(stats, "Net realized P&L")).toHaveText("0.00");
  await fileInput.setInputFiles({ name: "empty.csv", mimeType: "text/csv", buffer: Buffer.from("") });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("empty");
  await expect(stats).toHaveCount(0);
});

test("manual entries get the same overview and edits invalidate the previous result", async ({ page }) => {
  await page.goto("/history");
  await page.getByRole("button", { name: "Manual entry", exact: true }).click();
  await page.getByRole("button", { name: "Analyze 4 trades" }).click();
  const stats = page.getByRole("region", { name: "Performance overview" });
  await expect(definition(stats, "Net realized P&L")).toHaveText("+705.00");
  await page.getByLabel("Net profit for trade 1").fill("-240");
  await expect(stats).toHaveCount(0);
  await page.getByRole("button", { name: "Analyze 4 trades" }).click();
  await expect(definition(stats, "Net realized P&L")).toHaveText("+225.00");
});

test("summaries saved by older versions show available metrics without inventing outcome counts", async ({
  page,
}) => {
  await page.goto("/history");
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          tradeCount: 2,
          winRate: 1,
          profitFactor: null,
          expectancy: 25,
          netProfit: 50,
          startingBalance: 1000,
          maximumBalanceDrawdownPct: 0,
        }),
      ),
    HISTORY_SUMMARY_KEY,
  );
  await page.reload();
  const stats = page.getByRole("region", { name: "Performance overview" });
  await expect(definition(stats, "Net realized P&L")).toHaveText("+50.00");
  await expect(definition(stats, "Win rate")).toContainText("100.0%");
  await expect(definition(stats, "Profit factor")).toContainText("Requires at least one losing trade");
  await expect(definition(stats, "Max balance drawdown")).toContainText("0.00%");
  await expect(stats.getByRole("list", { name: "Trade outcome counts" })).toHaveCount(0);
  await expect(stats.getByRole("link", { name: "Use for matching" })).toBeVisible();
});
