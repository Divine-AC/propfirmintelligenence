import { expect, test, type Page } from "@playwright/test";

async function openTool(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  const compact = await menu.isVisible();
  if (compact) await menu.click();
  await page
    .getByRole("navigation", { name: compact ? "Mobile navigation" : "Primary", exact: true })
    .getByRole("link", { name, exact: true })
    .click();
}

async function submitProfile(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Choose your account preferences" }).waitFor();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Search prop firms", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your match report" })).toBeVisible();
}

test("the production build loads its styles and hydrates its controls", async ({ page }) => {
  const assetErrors: string[] = [];
  const runtimeErrors: string[] = [];
  page.on("response", (response) => {
    const type = response.request().resourceType();
    if (["stylesheet", "script", "font", "image"].includes(type) && response.status() >= 400) {
      assetErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/");
  // Checking visible text alone would pass even if the entire stylesheet was missing.
  await expect(page.locator(".overview-hero")).toHaveCSS("display", "grid");
  await expect(page.locator(".research-globe")).toBeVisible();
  await expect.poll(() => page.locator(".research-globe").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await openTool(page, "Trade history");
  // This layout is supplied by Tailwind utilities, not the custom overview CSS.
  await expect(page.locator(".history-layout")).toHaveCSS("display", "grid");
  await page.getByRole("button", { name: "Manual entry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Manual trade log" })).toBeVisible();
  expect(assetErrors).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

test("a consultation can be saved, reopened, and deleted deliberately", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Find my matches", exact: true }).click();
  await page.getByRole("button", { name: "Day trader", exact: true }).click();
  await expect(page.getByLabel("Markets you trade")).toHaveValue("EUR/USD, GBP/USD");
  await submitProfile(page);
  await page.getByRole("textbox", { name: "Report name" }).fill("London session review");
  await page.getByRole("button", { name: "Save report", exact: true }).click();
  await page.getByRole("link", { name: "View saved reports" }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "London session review" })).toBeVisible();
  await page.getByRole("button", { name: "Delete London session review" }).click();
  await page.getByRole("button", { name: "Keep report" }).click();
  await page.getByRole("button", { name: "Delete London session review" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your reports start here" })).toBeVisible();
});

test("the picker respects the four-account limit and recovers from an empty filter", async ({ page }) => {
  await page.goto("/compare");
  await page.getByRole("button", { name: "Edit selection" }).click();
  const options = page.getByRole("group", { name: "Available accounts" });
  const catalogueSize = await options.getByRole("button").count();
  await expect(options.getByRole("button", { pressed: true })).toHaveCount(4);
  await expect(options.getByRole("button", { pressed: false }).first()).toBeDisabled();
  await page.getByRole("group", { name: "Selected accounts" }).getByRole("button").first().click();
  await options.getByRole("button", { pressed: false }).first().click();
  await expect(options.getByRole("button", { pressed: true })).toHaveCount(4);
  await page.getByRole("combobox", { name: "Firm", exact: true }).selectOption("FundedNext");
  await page.getByRole("combobox", { name: "Account size", exact: true }).selectOption("2500");
  await expect(page.getByText("No accounts match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(options.getByRole("button")).toHaveCount(catalogueSize);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  );
});

test("linked trade history opens an editable profile, not the last cached report", async ({ page }) => {
  await page.goto("/matches");
  await submitProfile(page);
  await openTool(page, "Trade history");
  await page.getByRole("button", { name: "Load sample CSV" }).click();
  const stats = page.getByRole("region", { name: "Performance overview" });
  await expect(stats.getByText("+1,427.50", { exact: true })).toBeVisible();
  await expect(stats.getByText("+14.28%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Analyze 12 valid trades" }).click();
  await expect(page.getByRole("heading", { name: "12 closed trades analyzed" })).toBeVisible();
  await page.getByRole("link", { name: "Search prop firms using this history" }).click();
  await expect(page.getByRole("heading", { name: "Trade history for this consultation" })).toBeVisible();
  await expect(page.getByText(/12 closed trades are linked to this profile/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tell us how you trade" })).toBeVisible();
});
