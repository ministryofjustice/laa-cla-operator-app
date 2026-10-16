import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for certificated work flows
 */
test.describe("Eligibility journey - Certificated work", () => {
  let caseId: string;

  test.beforeEach(async ({ page }) => {
    caseId = "ED-0001-0001";
    const detailsPath = `/case/${caseId}/add-client-details`;
    await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
    await page.getByRole("button", { name: "Check financial eligibility" }).click();
  });

  test("certificated work without partner", async ({ page, pages }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
      propertyPage,
      checkYourAnswersPage,
    } = pages;

    // Level of help - select certificated
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Domestic abuse - select no
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Applicant - select no partner
    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    // Should progress through the journey
    await expect(page).toHaveURL(/property/);
  });

  test("certificated work with partner", async ({ page, pages }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
    } = pages;

    // Level of help - select certificated
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Domestic abuse - select no
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Applicant - select has partner
    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectHasPartner();
    await applicantPage.submit();

    // Should require partner details
    await expect(page).toHaveURL(/partner-details|applicant/);
  });

  test("certificated work with passporting", async ({ page, pages }) => {
    const { levelOfHelpPage, domesticAbuseApplicantPage, applicantPage } = pages;

    // Level of help - select certificated
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Domestic abuse - select no
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await domesticAbuseApplicantPage.selectNo();
    await domesticAbuseApplicantPage.submit();

    // Applicant - select no partner
    await applicantPage.navigate(`/eligibility/${caseId}/applicant`);
    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    // Should proceed with journey
    await expect(page).toHaveURL(/property|applicant/);
  });
});
