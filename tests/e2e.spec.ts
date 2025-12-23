import { test, expect } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Permit2 Panic Button")).toBeVisible();
  await expect(page.getByText("Review spender and token before signing.")).toBeVisible();
});
