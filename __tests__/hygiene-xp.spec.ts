import { test, expect } from "@playwright/test";

test("hygiene xp increments by 1 after a successful scan", async ({ page }) => {
  await page.goto("http://localhost:3000/");

  // Mock scan to always succeed (so the test is deterministic)
  await page.route("**/api/scan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ allowances: [], error: null }),
    });
  });

  const before = await page.evaluate(() => Number(localStorage.getItem("hygiene_xp") || "0"));

  // Click your scan button (adjust the name/text if yours differs)
  await page.getByRole("button", { name: /scan/i }).click();

  // wait a moment for state updates
  await page.waitForTimeout(200);

  const after = await page.evaluate(() => Number(localStorage.getItem("hygiene_xp") || "0"));
  expect(after).toBe(before + 1);
});
