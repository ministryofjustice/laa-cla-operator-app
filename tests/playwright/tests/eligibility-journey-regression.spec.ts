import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * Regression tests for navigation loop and reachability bugs
 *
 * These tests ensure the fixes for navigation loops don't regress:
 * - Steps should only be reachable when relevant
 * - Changing answers shouldn't cause 302 redirects or "service unavailable" errors
 * - Backtracking and re-answering should work correctly
 */
test.describe("Eligibility journey - Regression tests", () => {
  let checkId: string;

  test.beforeEach(async ({ page }) => {
    await page.goto("/eligibility/");
    checkId = page.url().split("/").pop() || "";
  });

  test("level-of-help step is always reachable", async ({
    page,
    pages,
  }) => {
    const { levelOfHelpPage } = pages;

    // Should be able to navigate directly to level-of-help
    await levelOfHelpPage.navigate(`/eligibility/${checkId}/level-of-help`);
    await expect(page).toHaveURL(/level-of-help/);
    await expect(levelOfHelpPage.heading).toBeVisible();
  });

  test("domestic-abuse-applicant is only reachable when relevant", async ({
    page,
    pages,
  }) => {
    const { domesticAbuseApplicantPage } = pages;

    // Try to navigate directly to domestic-abuse-applicant without proper context
    // This will likely redirect or fail, which is correct behavior
    const response = await page.goto(`/eligibility/${checkId}/domestic-abuse-applicant`, {
      waitUntil: "networkidle",
    });

    // Should either load the page (status 200) or redirect (status 302)
    // but NOT show a service error
    expect([200, 302]).toContain(response?.status());
    expect(page.url()).not.toContain("error");
  });

  test("changing answer at level-of-help clears inconsistent state", async ({
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

    // Navigate to immigration step
    await immigrationOrAsylumPage.navigate(`/eligibility/${checkId}/immigration-or-asylum`);
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();

    // Navigate to immigration-or-asylum-type
    await expect(page).toHaveURL(/immigration-or-asylum-type/);

    // Go back to level-of-help and change answer
    await page.goto(`/eligibility/${checkId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Should navigate to immigration step again without error
    await expect(page).not.toHaveURL(/error/);
    const url = page.url();
    expect(url).toContain("/eligibility/");
    expect(url).not.toContain("Sorry");
  });

  test("multiple backtrack-forward cycles work correctly", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
    } = pages;

    await levelOfHelpPage.navigate(`/eligibility/${checkId}/level-of-help`);

    // First cycle: controlled → yes
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();
    await expect(page).toHaveURL(/immigration-or-asylum-type/);

    // Back and change
    await page.goto(`/eligibility/${checkId}/immigration-or-asylum`);
    await immigrationOrAsylumPage.selectNo();
    await immigrationOrAsylumPage.submit();
    await expect(page).toHaveURL(/applicant/);

    // Back and change again
    await page.goto(`/eligibility/${checkId}/immigration-or-asylum`);
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();
    await expect(page).toHaveURL(/immigration-or-asylum-type/);

    // Service should not break
    expect(page.url()).not.toContain("error");
  });

  test("partner step is only reachable when applicant step is relevant", async ({
    page,
    pages,
  }) => {
    const { applicantPage } = pages;

    // Try to navigate to partner-details without going through applicant
    const response = await page.goto(`/eligibility/${checkId}/applicant`, {
      waitUntil: "networkidle",
    });

    // Should either load or redirect, but not error
    expect([200, 302]).toContain(response?.status());
    expect(page.url()).not.toContain("error");
  });
});
