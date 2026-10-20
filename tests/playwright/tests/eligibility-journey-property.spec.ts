import { test, expect } from "../fixtures/index.js";

test.describe("Eligibility journey - Property", () => {
  const caseId = "ED-0001-0002";

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
    await answer("passporting", "true");
  });

  test("records the client's home and skips additional-property details", async ({
    page,
    pages,
    checkAccessibility,
  }) => {
    const { propertyPage, propertyEntryPage, additionalPropertyPage } = pages;

    await expect(page).toHaveURL(/\/property$/);
    await expect(propertyPage.heading).toContainText(
      "Does your client own the home",
    );
    await checkAccessibility();
    await propertyPage.selectOwnership("outright");
    await propertyPage.submit();

    await expect(page).toHaveURL(/property-entry$/);
    await expect(propertyEntryPage.heading).toContainText(
      "The home your client usually lives in",
    );
    await checkAccessibility();
    await propertyEntryPage.fill({
      homeValue: "250000",
      percentageOwned: "100",
    });
    await propertyEntryPage.submit();

    await expect(page).toHaveURL(/additional-property$/);
    await checkAccessibility();
    await additionalPropertyPage.selectOwnership("none");
    await additionalPropertyPage.submit();

    await expect(page).toHaveURL(/\/assets$/);
  });

  test("adds a second property and records its mortgage ownership answer", async ({
    page,
    pages,
    checkAccessibility,
  }) => {
    const {
      propertyPage,
      propertyEntryPage,
      additionalPropertyPage,
      additionalPropertyDetailsPage,
    } = pages;

    await propertyPage.selectOwnership("outright");
    await propertyPage.submit();
    await propertyEntryPage.fill({
      homeValue: "250000",
      percentageOwned: "100",
    });
    await propertyEntryPage.submit();

    await additionalPropertyPage.selectOwnership("outright");
    await additionalPropertyPage.submit();
    await expect(page).toHaveURL(/additional-property-details$/);
    await checkAccessibility();

    await additionalPropertyDetailsPage.fillRow(0, {
      value: "80000",
      percentageOwned: "100",
    });
    await additionalPropertyDetailsPage.addAnother();
    await expect(
      page.locator("#additional_properties_1_house_value"),
    ).toBeVisible();
    await checkAccessibility();

    await additionalPropertyDetailsPage.fillRow(1, {
      value: "40000",
      percentageOwned: "50",
      inlineMortgage: false,
    });
    await additionalPropertyDetailsPage.submit();

    await expect(page).toHaveURL(/\/assets$/);
  });

  test("keeps the landlord back link fixed on the property question", async ({
    page,
    pages,
    checkAccessibility,
  }) => {
    const { propertyPage } = pages;

    await propertyPage.selectOwnership("shared_ownership");
    await propertyPage.submit();
    await expect(page).toHaveURL(/property-landlord$/);
    await checkAccessibility();
    await expect(
      page.getByRole("link", { name: "Back", exact: true }),
    ).toHaveAttribute("href", `/eligibility/${caseId}/property`);
  });
});
