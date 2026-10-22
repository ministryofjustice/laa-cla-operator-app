import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for the assets and vehicles section.
 */
test.describe("Eligibility journey - Assets and vehicles", () => {
  const caseId = "ED-0001-0005";

  // Certificated work for a passported client with no property: the shortest
  // route that asks about both assets and vehicles.
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
    await answer("level_of_help", "certificated");
    await answer("domestic_abuse_applicant", "false");
    await answer("immigration_or_asylum_type_upper_tribunal", "other");
    await page.locator('input[name="partner"][value="false"]').check();
    await answer("passporting", "true");
    await answer("property_owned", "none");
    await answer("additional_property_owned", "none");
  });

  test("records bank accounts, investments and a financed vehicle", async ({
    page,
    pages,
    checkAccessibility,
  }) => {
    const { assetsPage, vehiclePage, vehiclesDetailsPage } = pages;

    await expect(page).toHaveURL(/\/assets$/);
    await checkAccessibility();
    await assetsPage.fillBankAccount(0, "1250.75");
    await assetsPage.addBankAccount();
    await expect(page.locator("#bank_accounts_1_amount")).toBeVisible();
    await expect(page.locator("#bank_accounts_0_amount")).toHaveValue(
      "1250.75",
    );
    await assetsPage.fillBankAccount(1, "300");
    await assetsPage.answer("investments", "2000");
    await assetsPage.answer("valuables", undefined);
    await assetsPage.submit();

    await expect(page).toHaveURL(/\/vehicle$/);
    await checkAccessibility();
    await vehiclePage.answer(true);
    await vehiclePage.submit();

    await expect(page).toHaveURL(/\/vehicles-details$/);
    await checkAccessibility();
    await vehiclesDetailsPage.fillRow(0, {
      value: "8000",
      finance: "1500",
      overThreeYearsOld: false,
      inRegularUse: true,
    });
    await vehiclesDetailsPage.submit();

    await expect(page).toHaveURL(/\/check-your-answers$/);
    const summary = page.locator(".govuk-summary-list");
    await expect(summary).toContainText("£1,250.75");
    await expect(summary).toContainText("£300.00");
    await expect(summary).toContainText("Vehicle 1: Value of payments left");
    await expect(summary).toContainText("£1,500.00");
  });

  test("shows the error summary for valuables under £500", async ({
    page,
    pages,
    checkAccessibility,
  }) => {
    const { assetsPage } = pages;

    await assetsPage.fillBankAccount(0, "0");
    await assetsPage.answer("investments", undefined);
    await assetsPage.answer("valuables", "400");
    await assetsPage.submit();

    await expect(page).toHaveURL(/\/assets$/);
    await expect(assetsPage.errorSummary).toContainText(
      "Valuable items must be £500 or more.",
    );
    await checkAccessibility();
  });
});
