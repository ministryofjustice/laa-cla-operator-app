import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for eligibility journey with controlled work and immigration/asylum
 * TODO: Replace manual case navigation with direct `/eligibility/` entry point once it's implemented
 */
test.describe("Eligibility journey - Controlled work with Immigration/Asylum", () => {
  let caseId: string;

  test.beforeEach(async ({ page }) => {
    // TODO: Replace with direct eligibility entry point when implemented
    // Currently using the case page button as entry point
    caseId = "ED-0001-0001";
    const detailsPath = `/case/${caseId}/add-client-details`;
    // Authenticate via test-auth endpoint before navigating to protected page
    await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
    await page.getByRole("button", { name: "Check financial eligibility" }).click();
  });

  test("adult - controlled work with immigration", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
    } = pages;

    // Level of help - select controlled
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Immigration or asylum - select yes
    await immigrationOrAsylumPage.navigate(`/eligibility/${caseId}/immigration-or-asylum`);
    await expect(immigrationOrAsylumPage.heading).toContainText("Immigration or asylum");
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();

    // Should go to immigration-or-asylum-type step
    await expect(page).toHaveURL(/immigration-or-asylum-type/);
  });

  test("adult - controlled work without immigration/asylum", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
      applicantPage,
    } = pages;

    // Level of help - select controlled
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Immigration or asylum - select no
    await immigrationOrAsylumPage.navigate(`/eligibility/${caseId}/immigration-or-asylum`);
    await immigrationOrAsylumPage.selectNo();
    await immigrationOrAsylumPage.submit();

    // Should go directly to applicant step (no matter-type question)
    await expect(page).toHaveURL(/applicant/);
    await expect(applicantPage.heading).toContainText("Applicant");
  });

  test("backtracking and changing answer - controlled to immigration", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
    } = pages;

    // Navigate to level-of-help, select controlled
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Navigate to immigration, select yes
    await immigrationOrAsylumPage.navigate(`/eligibility/${caseId}/immigration-or-asylum`);
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();

    // Go to immigration-or-asylum-type
    await expect(page).toHaveURL(/immigration-or-asylum-type/);

    // Go back
    await immigrationOrAsylumPage.clickBack();
    await expect(page).toHaveURL(/immigration-or-asylum/);

    // Change answer to no
    await immigrationOrAsylumPage.selectNo();
    await immigrationOrAsylumPage.submit();

    // Should now go to applicant (not immigration-or-asylum-type)
    await expect(page).toHaveURL(/applicant/);
  });
});
