import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for changing answers and backtracking
 */
test.describe("Eligibility journey - Change Answers Flow", () => {
  let caseId: string;

  test.beforeEach(async ({ page }) => {
    caseId = "ED-0001-0001";
    const detailsPath = `/case/${caseId}/add-client-details`;
    await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
    await page.getByRole("button", { name: "Check financial eligibility" }).click();
  });

  test("change level of help from certificated to controlled", async ({
    page,
    pages,
  }) => {
    const { levelOfHelpPage, domesticAbuseApplicantPage } = pages;

    // Level of help - select certificated
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Domestic abuse screen appears
    await domesticAbuseApplicantPage.navigate(
      `/eligibility/${caseId}/domestic-abuse-applicant`
    );
    await expect(page).toHaveURL(/domestic-abuse-applicant/);

    // Go back to level of help
    await levelOfHelpPage.clickBack();
    await expect(page).toHaveURL(/level-of-help/);

    // Change to controlled
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Should go to immigration screen (not domestic abuse)
    await expect(page).toHaveURL(/immigration-or-asylum/);
  });

  test("change immigration answer and path", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
      immigrationOrAsylumTypePage,
      applicantPage,
    } = pages;

    // Level of help - select controlled
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Immigration - select yes
    await immigrationOrAsylumPage.navigate(
      `/eligibility/${caseId}/immigration-or-asylum`
    );
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();

    // Should go to immigration-or-asylum-type
    await expect(page).toHaveURL(/immigration-or-asylum-type/);

    // Go back and change to no
    await immigrationOrAsylumPage.clickBack();
    await expect(page).toHaveURL(/immigration-or-asylum/);

    await immigrationOrAsylumPage.selectNo();
    await immigrationOrAsylumPage.submit();

    // Should now go to applicant (skipping immigration-or-asylum-type)
    await expect(page).toHaveURL(/applicant|domestic-abuse/);
  });

  test("multiple backtrack cycles", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
      applicantPage,
    } = pages;

    // First path: controlled -> yes immigration
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    await immigrationOrAsylumPage.navigate(
      `/eligibility/${caseId}/immigration-or-asylum`
    );
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();
    await expect(page).toHaveURL(/immigration-or-asylum-type/);

    // Go back 2 steps
    await immigrationOrAsylumPage.clickBack();
    await levelOfHelpPage.clickBack();
    await expect(page).toHaveURL(/level-of-help/);

    // Change to certificated
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Different path: no domestic abuse, no partner
    await expect(page).toHaveURL(/domestic-abuse-applicant/);

    // Go back to domestic abuse
    await levelOfHelpPage.clickBack();
    await expect(page).toHaveURL(/level-of-help/);

    // Go forward again with same answer
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Should still show domestic abuse
    await expect(page).toHaveURL(/domestic-abuse-applicant/);
  });

  test("change partner answer", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      domesticAbuseApplicantPage,
      applicantPage,
    } = pages;

    // Navigate to applicant
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

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
    await expect(page).toHaveURL(/partner-details|applicant|property/);

    // Go back and change to no partner
    await applicantPage.clickBack();
    await expect(page).toHaveURL(/applicant/);

    await applicantPage.selectNoPartner();
    await applicantPage.submit();

    // Should skip partner details and go directly to property
    await expect(page).toHaveURL(/property|applicant/);
  });
});
