import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for the income section: employment status, employment
 * income, benefits, benefit details and other income.
 */
test.describe("Eligibility journey - Income", () => {
  let caseId: string;

  // Walks the questions before the income section, as a controlled work client
  // with no partner, passporting benefit or dependants.
  test.beforeEach(async ({ page }) => {
    caseId = "ED-0001-0001";
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
  });

  test("employed client with a benefit and no other income", async ({
    page,
    pages,
    checkAccessibility,
  }) => {
    const {
      employmentStatusPage,
      incomePage,
      benefitsPage,
      benefitDetailsPage,
      otherIncomePage,
    } = pages;

    await expect(page).toHaveURL(/employment-status/);
    await employmentStatusPage.selectEmployed();
    await employmentStatusPage.submit();

    await expect(page).toHaveURL(/\/income$/);
    await expect(incomePage.heading).toContainText("employment income");
    await checkAccessibility();
    await incomePage.fillRow(0, {
      type: "employment",
      frequency: "monthly",
      gross: "2000",
      tax: "300",
      nationalInsurance: "100",
    });
    await incomePage.submit();

    await expect(page).toHaveURL(/benefits$/);
    await benefitsPage.selectYes();
    await benefitsPage.submit();

    await expect(page).toHaveURL(/benefit-details/);
    await expect(
      page.locator("#benefits_0_benefit_type option", {
        hasText: "Child Benefit",
      }),
    ).toHaveCount(1);
    await expect(
      page.locator("#benefits_0_benefit_type option", {
        hasText: "Housing Benefit",
      }),
    ).toHaveCount(0);
    await benefitDetailsPage.fillRow(0, {
      type: "Child Benefit",
      amount: "25.60",
      frequency: "every_four_weeks",
    });
    await benefitDetailsPage.submit();

    await expect(page).toHaveURL(/other-income/);
    await expect(
      page.locator('input[name="pension_frequency"][value="total"]'),
    ).toHaveCount(0);
    await otherIncomePage.answerNoToAll();
    await otherIncomePage.submit();

    await expect(page).toHaveURL(/outgoings/);
  });

  test("shows errors for an income that leaves nothing after deductions", async ({
    page,
    pages,
  }) => {
    const { employmentStatusPage, incomePage } = pages;

    await employmentStatusPage.selectEmployed();
    await employmentStatusPage.submit();
    await incomePage.fillRow(0, {
      type: "employment",
      frequency: "monthly",
      gross: "400",
      tax: "300",
      nationalInsurance: "100",
    });
    await incomePage.submit();

    await expect(incomePage.errorSummary).toContainText(
      "must be more than income tax and National Insurance combined",
    );
    await expect(page).toHaveURL(/\/income$/);
  });

  test("adds a second employment income", async ({ page, pages }) => {
    const { employmentStatusPage, incomePage } = pages;

    await employmentStatusPage.selectEmployed();
    await employmentStatusPage.submit();
    await incomePage.addAnother();

    await expect(page.locator("#incomes_1_income_type")).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(1);
  });

  test("skips income for an unemployed client", async ({ page, pages }) => {
    const { employmentStatusPage } = pages;

    await employmentStatusPage.selectUnemployed();
    await employmentStatusPage.submit();

    await expect(page).toHaveURL(/benefits$/);
  });
});
