import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for the outgoings section: outgoings and housing costs.
 */
test.describe("Eligibility journey - Outgoings", () => {
  const caseId = "ED-0001-0003";

  // Walks to outgoings as a controlled work client with no partner,
  // passporting benefit, dependants, employment or other income.
  test.beforeEach(async ({ page }) => {
    const detailsPath = `/case/${caseId}/add-client-details`;
    await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
    await page
      .getByRole("button", { name: "Check financial eligibility" })
      .click();

    const answer = async (name: string, value: string): Promise<void> => {
      await page.locator(`input[name="${name}"][value="${value}"]`).check();
      await page.getByRole("button", { name: "Continue" }).click();
    };

    await page.goto(`/eligibility/${caseId}/level-of-help`);
    await answer("level_of_help", "controlled");
    await answer("immigration_or_asylum", "false");
    await page.locator('input[name="partner"][value="false"]').check();
    await answer("passporting", "false");
    await answer("child_dependants", "false");
    await answer("adult_dependants", "false");
    await answer("employment_status", "unemployed");
    await answer("receives_benefits", "false");
    for (const type of [
      "friends_or_family",
      "maintenance",
      "property_or_lodger",
      "pension",
      "student_finance",
    ]) {
      await page
        .locator(`input[name="${type}_relevant"][value="false"]`)
        .check();
    }
    await answer("other_relevant", "false");
  });

  test("records outgoings and housing costs for a client who rents", async ({
    page,
    pages,
    checkAccessibility,
  }) => {
    const { outgoingsPage, propertyPage, housingCostsPage } = pages;

    await expect(page).toHaveURL(/\/outgoings$/);
    await expect(outgoingsPage.heading).toContainText("outgoings");
    await expect(
      page.locator('input[name="childcare_payments_relevant"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('input[name="maintenance_payments_frequency"][value="total"]'),
    ).toHaveCount(0);
    await checkAccessibility();
    await outgoingsPage.answer("maintenance", {
      amount: "120.50",
      frequency: "every_four_weeks",
    });
    await outgoingsPage.answer("legal_aid");
    await outgoingsPage.submit();

    await expect(page).toHaveURL(/\/property$/);
    await propertyPage.selectOwnership("none");
    await propertyPage.submit();

    await expect(page).toHaveURL(/\/housing-costs$/);
    await expect(housingCostsPage.heading).toContainText("Housing costs");
    await checkAccessibility();
    await housingCostsPage.fillPayments("600", "monthly");
    await housingCostsPage.answerHousingBenefit({
      amount: "100",
      frequency: "every_two_weeks",
    });
    await housingCostsPage.submit();

    await expect(page).toHaveURL(/additional-property$/);
  });

  test("rejects Housing Benefit higher than housing costs", async ({
    page,
    pages,
  }) => {
    const { outgoingsPage, propertyPage, housingCostsPage } = pages;

    await outgoingsPage.answer("maintenance");
    await outgoingsPage.answer("legal_aid");
    await outgoingsPage.submit();
    await propertyPage.selectOwnership("none");
    await propertyPage.submit();

    await housingCostsPage.fillPayments("100", "monthly");
    await housingCostsPage.answerHousingBenefit({
      amount: "200",
      frequency: "monthly",
    });
    await housingCostsPage.submit();

    await expect(housingCostsPage.errorSummary).toContainText(
      "Housing Benefit cannot be higher than housing costs",
    );
    await expect(page).toHaveURL(/\/housing-costs$/);
  });
});
