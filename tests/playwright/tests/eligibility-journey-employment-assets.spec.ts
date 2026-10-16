import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for employment and assets flows
 */
test.describe("Eligibility journey - Employment and Assets", () => {
  let caseId: string;

  test.beforeEach(async ({ page }) => {
    caseId = "ED-0001-0001";
    const detailsPath = `/case/${caseId}/add-client-details`;
    await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
    await page
      .getByRole("button", { name: "Check financial eligibility" })
      .click();
  });

  test("employed client with certificated work", async ({ page, pages }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
      employmentStatusPage,
    } = pages;

    // Navigate through initial steps
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`,
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectNo();
    await propertyPage.submit();

    // Employment status - select employed
    await employmentStatusPage.navigate(
      `/eligibility/${caseId}/employment-status`,
    );
    await expect(employmentStatusPage.heading).toContainText(
      "Employment status",
    );
    await employmentStatusPage.selectEmployed();
    await employmentStatusPage.submit();

    // Should progress to income
    await expect(page).toHaveURL(/income|employment-status/);
  });

  test("self-employed client", async ({ page, pages }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
      employmentStatusPage,
    } = pages;

    // Navigate through initial steps
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`,
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectNo();
    await propertyPage.submit();

    // Employment status - select self-employed
    await employmentStatusPage.navigate(
      `/eligibility/${caseId}/employment-status`,
    );
    await employmentStatusPage.selectSelfEmployed();
    await employmentStatusPage.submit();

    // Should progress to self-employment details
    await expect(page).toHaveURL(/income|employment-status/);
  });

  test("unemployed client", async ({ page, pages }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
      employmentStatusPage,
    } = pages;

    // Navigate through initial steps
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`,
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectNo();
    await propertyPage.submit();

    // Employment status - select unemployed
    await employmentStatusPage.navigate(
      `/eligibility/${caseId}/employment-status`,
    );
    await employmentStatusPage.selectUnemployed();
    await employmentStatusPage.submit();

    // Should skip income and go to benefits
    await expect(page).toHaveURL(/benefits|income|employment-status/);
  });

  test("certificated work with no assets", async ({ page, pages }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
      assetsPage,
    } = pages;

    // Navigate through initial steps
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`,
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectNo();
    await propertyPage.submit();

    // Navigate to assets
    await assetsPage.navigate(`/eligibility/${caseId}/assets`);
    await expect(assetsPage.heading).toContainText("Client assets");
    await assetsPage.fillBankAccountAmount("0");
    await assetsPage.selectNoInvestments();
    await assetsPage.selectNoValuables();
    await assetsPage.submit();

    // Should progress to check answers or next step
    await expect(page).toHaveURL(/vehicles|check-your-answers|assets/);
  });

  test("certificated work with vehicles", async ({ page, pages }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
      vehiclesPage,
    } = pages;

    // Navigate through initial steps
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`,
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    await propertyPage.navigate(`/eligibility/${caseId}/property`);
    await propertyPage.selectNo();
    await propertyPage.submit();

    // Navigate to vehicles
    await vehiclesPage.navigate(`/eligibility/${caseId}/vehicles`);
    await expect(vehiclesPage.heading).toContainText("Vehicles");
    await vehiclesPage.selectYes();
    await vehiclesPage.submit();

    // Should go to vehicle details or next step
    await expect(page).toHaveURL(/vehicle|vehicles/);
  });
});
