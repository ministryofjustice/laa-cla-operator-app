import { test, expect } from "../fixtures/index.js";

const demoPath = "/dev/cfe-synthetic-assessment";

test.describe("synthetic CFE demonstration", () => {
  test("submits only on POST and displays the returned result after refresh", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(`/test-auth/login?next=${encodeURIComponent(demoPath)}`);

    await expect(page).toHaveURL(demoPath);
    await expect(
      page.getByRole("heading", {
        name: "Synthetic test assessment - not a client assessment",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("No assessment result is available yet."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Run synthetic assessment" }),
    ).toBeVisible();
    await checkAccessibility();

    await page
      .getByRole("button", { name: "Run synthetic assessment" })
      .click();
    await expect(page).toHaveURL(demoPath);
    await expect(
      page.getByRole("heading", { name: "eligible", exact: true }),
    ).toBeVisible();
    const grossIncomeValue = page
      .locator(".govuk-summary-list__row")
      .filter({ hasText: "Applicant total gross income per month" })
      .locator(".govuk-summary-list__value");
    await expect(grossIncomeValue).toHaveText(/£[\d,]+\.\d{2}/u);
    const returnedGrossIncome = await grossIncomeValue.textContent();
    await expect(page.getByText("£1,100.00")).toBeVisible();
    await expect(
      page
        .locator(".govuk-summary-list__row")
        .filter({ hasText: "Assessed capital" })
        .locator(".govuk-summary-list__value"),
    ).toHaveText("£125.00");
    await expect(
      page.getByText(/client_outgoings_housing_cost/u),
    ).toBeVisible();
    await expect(page.getByText(/not saved to the case/u)).toBeVisible();
    await checkAccessibility();
    await page.reload();
    await page.reload();
    await expect(grossIncomeValue).toHaveText(returnedGrossIncome ?? "");
  });

  test("requires authentication", async ({ page }) => {
    await page.goto(demoPath);
    await expect(page).toHaveURL(/\/sign-in$/u);
  });

  test("rejects a POST without a CSRF token", async ({ page }) => {
    await page.goto(`/test-auth/login?next=${encodeURIComponent(demoPath)}`);

    const response = await page.request.post(demoPath, { form: {} });

    expect(response.status()).toBe(403);
  });
});
