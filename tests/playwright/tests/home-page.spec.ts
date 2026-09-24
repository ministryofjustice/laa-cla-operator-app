import { test, expect } from "../fixtures/index.js";

test("homepage should have the correct title", async ({ page }) => {
  // Navigate to the homepage
  await page.goto("/");

  // Check for the title of the application
  await expect(page).toHaveTitle(/Assess and refer for civil legal advice/);
});

test("homepage should display LAA header", async ({ page }) => {
  await page.goto("/");

  // Check for the header with LAA branding
  const header = page.getByRole("banner");
  await expect(header).toBeVisible();
});

test("unauthenticated visitors are redirected to sign in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in$/);
});
