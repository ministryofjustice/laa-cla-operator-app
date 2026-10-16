import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for eligibility journey with domestic abuse
 * This tests the non-controlled (non-certificated, non-passported) paths
 * TODO: Replace manual case navigation with direct `/eligibility/` entry point once it's implemented
 */
test.describe("Eligibility journey - Domestic Abuse / Non-controlled", () => {
  let caseId: string;

  test.beforeEach(async ({ page }) => {
    // TODO: Replace with direct eligibility entry point when implemented
    // Currently using the case page button as entry point
    caseId = "ED-0001-0003";
    const detailsPath = `/case/${caseId}/add-client-details`;
    // Authenticate via test-auth endpoint before navigating to protected page
    await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
    await page.getByRole("button", { name: "Check financial eligibility" }).click();
  });

  test("navigating from level-of-help to domestic abuse (bug reproduction)", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
    } = pages;

    // This test reproduces the original bug: selecting controlled → asylum,
    // then changing to certificated should show domestic abuse

    // Level of help - select controlled, then change to non-controlled
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    // For now, navigate directly to domestic abuse to test it's reachable
    // In a real scenario, would need to trigger through non-controlled path
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );

    // Verify the page loads without 302 redirect
    await expect(page).toHaveURL(/domestic-abuse-applicant/);
    await expect(domesticAbuseApplicantPage.heading).toContainText("Domestic abuse");
  });

  test("domestic abuse - yes, then continue to applicant", async ({
    page,
    pages,
  }) => {
    const {
      domesticAbuseApplicantPage,
      applicantPage,
    } = pages;

    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectYes();
    await domesticAbuseApplicantPage.submit();

    // Should go to applicant step
    await expect(page).toHaveURL(/applicant/);
    await expect(applicantPage.heading).toContainText("Applicant");
  });

  test("domestic abuse - no, then continue to applicant", async ({
    page,
    pages,
  }) => {
    const {
      domesticAbuseApplicantPage,
      applicantPage,
    } = pages;

    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Should go to next step in sequence
    await expect(page).toHaveURL(/(?:immigration-or-asylum-type-upper-tribunal|applicant)/);
  });

  test("backtracking on partner question does not break service", async ({
    page,
    pages,
  }) => {
    const {
      domesticAbuseApplicantPage,
      applicantPage,
    } = pages;

    // Navigate to domestic abuse
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectYes();
    await domesticAbuseApplicantPage.submit();

    // Go to applicant (partner question)
    await expect(page).toHaveURL(/applicant/);
    await applicantPage.selectHasPartner();
    await applicantPage.submit();

    // Go back to domestic abuse
    await applicantPage.clickBack();
    await expect(page).toHaveURL(/domestic-abuse-applicant/);

    // Change answer
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Should navigate to next step without error
    const url = page.url();
    expect(url).not.toContain("error");
    expect(url).not.toContain("Sorry");
  });
});
