import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for property and household flows
 */
test.describe("Eligibility journey - Property and Household", () => {
  let caseId: string;

  test.beforeEach(async ({ page }) => {
    caseId = "ED-0001-0001";
    const detailsPath = `/case/${caseId}/add-client-details`;
    await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
    await page.getByRole("button", { name: "Check financial eligibility" }).click();
  });

  test("certificated work with property owned outright", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
      propertyEntryPage,
    } = pages;

    // Navigate to level of help
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Domestic abuse
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Applicant
    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    // Property - select outright
    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectOutright();
    await propertyPage.submit();

    // Should go to property-entry
    await expect(page).toHaveURL(/property-entry/);
  });

  test("certificated work with property with mortgage", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
      propertyEntryPage,
    } = pages;

    // Navigate to level of help
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Domestic abuse
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Applicant
    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    // Property - select with mortgage
    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectWithMortgage();
    await propertyPage.submit();

    // Should go to property-entry
    await expect(page).toHaveURL(/property-entry/);
  });

  test("certificated work with shared ownership property", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
    } = pages;

    // Navigate to level of help
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Domestic abuse
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Applicant
    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    // Property - select shared ownership
    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectSharedOwnership();
    await propertyPage.submit();

    // Should go to property-landlord
    await expect(page).toHaveURL(/property-landlord/);
  });

  test("certificated work with no property", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
    } = pages;

    // Navigate to level of help
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Domestic abuse
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Applicant
    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    // Property - select no
    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectNo();
    await propertyPage.submit();

    // Should skip property-entry and go to next step
    await expect(page).toHaveURL(/assets|additional-property|vehicles/);
  });

  test("backtracking property questions", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
    } = pages;

    // Navigate to level of help
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Domestic abuse
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Applicant
    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    // Property - select outright
    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectOutright();
    await propertyPage.submit();

    // Go back to property
    await expect(page).toHaveURL(/property-entry/);
    await propertyPage.clickBack();
    await expect(page).toHaveURL(/property/);

    // Change answer to no property
    await propertyPage.selectNo();
    await propertyPage.submit();

    // Should now skip to assets/vehicles
    await expect(page).toHaveURL(/assets|additional-property|vehicles/);
  });
});
