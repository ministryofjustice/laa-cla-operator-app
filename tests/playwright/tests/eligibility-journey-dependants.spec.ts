import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for the dependant section.
 */
test.describe("Eligibility journey - Dependants", () => {
  const caseId = "ED-0001-0004";

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
  });

  test("saves dependant details and income before continuing to employment", async ({
    page,
    pages,
    checkAccessibility,
  }) => {
    const {
      dependantsDetailsPage,
      dependantIncomePage,
      dependantIncomeDetailsPage,
    } = pages;

    await expect(page).toHaveURL(/\/dependant-details$/);
    await checkAccessibility();
    await dependantsDetailsPage.answer("child_dependants", true);
    await dependantsDetailsPage.answer("adult_dependants", true);
    await dependantsDetailsPage.submit();
    await expect(page).toHaveURL(/\/dependant-details$/);
    await dependantsDetailsPage.enterCount("child_dependants_count", "1");
    await dependantsDetailsPage.enterCount("adult_dependants_count", "1");
    await dependantsDetailsPage.submit();

    await expect(page).toHaveURL(/\/dependant-income$/);
    await checkAccessibility();
    await dependantIncomePage.answer(true);
    await dependantIncomePage.submit();

    await expect(page).toHaveURL(/\/dependant-income-details$/);
    await checkAccessibility();
    await dependantIncomeDetailsPage.fillRow(0, {
      amount: "100",
      frequency: "monthly",
    });
    await dependantIncomeDetailsPage.submit();

    await expect(page).toHaveURL(/\/employment-status$/);
  });

  test("rejects dependant income at the monthly ceiling", async ({
    page,
    pages,
  }) => {
    const {
      dependantsDetailsPage,
      dependantIncomePage,
      dependantIncomeDetailsPage,
    } = pages;

    await dependantsDetailsPage.answer("child_dependants", true);
    await dependantsDetailsPage.answer("adult_dependants", false);
    await dependantsDetailsPage.submit();
    await dependantsDetailsPage.enterCount("child_dependants_count", "1");
    await dependantsDetailsPage.submit();

    await dependantIncomePage.answer(true);
    await dependantIncomePage.submit();

    await dependantIncomeDetailsPage.fillRow(0, {
      amount: "381.86",
      frequency: "monthly",
    });
    await dependantIncomeDetailsPage.submit();

    await expect(dependantIncomeDetailsPage.errorSummary).toContainText(
      "£381.86 or more per month",
    );
    await expect(page).toHaveURL(/\/dependant-income-details$/);
  });
});
