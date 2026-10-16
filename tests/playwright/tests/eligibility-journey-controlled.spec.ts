import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for eligibility journey with controlled work and immigration/asylum
 */
test.describe("Eligibility journey - Controlled work with Immigration/Asylum", () => {
  let checkId: string;

  test.beforeEach(async ({ page }) => {
    await page.goto("/eligibility/");
    checkId = page.url().split("/").pop() || "";
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
    await levelOfHelpPage.navigate(`/eligibility/${checkId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Immigration or asylum - select yes
    await immigrationOrAsylumPage.navigate(`/eligibility/${checkId}/immigration-or-asylum`);
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
    await levelOfHelpPage.navigate(`/eligibility/${checkId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Immigration or asylum - select no
    await immigrationOrAsylumPage.navigate(`/eligibility/${checkId}/immigration-or-asylum`);
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
    await levelOfHelpPage.navigate(`/eligibility/${checkId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Navigate to immigration, select yes
    await immigrationOrAsylumPage.navigate(`/eligibility/${checkId}/immigration-or-asylum`);
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
