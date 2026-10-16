import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for asylum and immigration flows
 */
test.describe("Eligibility journey - Asylum and Immigration", () => {
  let caseId: string;

  test.beforeEach(async ({ page }) => {
    caseId = "ED-0001-0001";
    const detailsPath = `/case/${caseId}/add-client-details`;
    await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
    await page.getByRole("button", { name: "Check financial eligibility" }).click();
  });

  test("certificated work with immigration", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
      immigrationOrAsylumTypePage,
    } = pages;

    // Level of help - select certificated
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Immigration or asylum - select yes
    await immigrationOrAsylumPage.navigate(
      `/eligibility/${caseId}/immigration-or-asylum`
    );
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();

    // Should go to immigration-or-asylum-type
    await expect(page).toHaveURL(/immigration-or-asylum-type/);
  });

  test("certificated work with asylum", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
      immigrationOrAsylumTypePage,
    } = pages;

    // Level of help - select certificated
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Immigration or asylum - select yes
    await immigrationOrAsylumPage.navigate(
      `/eligibility/${caseId}/immigration-or-asylum`
    );
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();

    // Immigration or asylum type - select asylum
    await immigrationOrAsylumTypePage.navigate(
      `/eligibility/${caseId}/immigration-or-asylum-type`
    );
    await immigrationOrAsylumTypePage.selectAsylum();
    await immigrationOrAsylumTypePage.submit();

    // Should go to asylum support step
    await expect(page).toHaveURL(/asylum-support/);
  });

  test("certificated work with asylum support", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
      immigrationOrAsylumTypePage,
      asylumSupportPage,
    } = pages;

    // Level of help - select certificated
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectCertificated();
    await levelOfHelpPage.submit();

    // Immigration or asylum - select yes
    await immigrationOrAsylumPage.navigate(
      `/eligibility/${caseId}/immigration-or-asylum`
    );
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();

    // Immigration or asylum type - select asylum
    await immigrationOrAsylumTypePage.navigate(
      `/eligibility/${caseId}/immigration-or-asylum-type`
    );
    await immigrationOrAsylumTypePage.selectAsylum();
    await immigrationOrAsylumTypePage.submit();

    // Asylum support - select yes
    await asylumSupportPage.navigate(`/eligibility/${caseId}/asylum-support`);
    await expect(asylumSupportPage.heading).toContainText("Asylum support");
    await asylumSupportPage.selectYes();
    await asylumSupportPage.submit();

    // Should progress to applicant
    await expect(page).toHaveURL(/applicant|domestic-abuse/);
  });

  test("controlled work with immigration appeal", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      immigrationOrAsylumPage,
      immigrationOrAsylumTypePage,
    } = pages;

    // Level of help - select controlled
    await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Immigration or asylum - select yes
    await immigrationOrAsylumPage.navigate(
      `/eligibility/${caseId}/immigration-or-asylum`
    );
    await immigrationOrAsylumPage.selectYes();
    await immigrationOrAsylumPage.submit();

    // Immigration or asylum type - select immigration appeal
    await immigrationOrAsylumTypePage.navigate(
      `/eligibility/${caseId}/immigration-or-asylum-type`
    );
    await immigrationOrAsylumTypePage.selectImmigrationAppeal();
    await immigrationOrAsylumTypePage.submit();

    // Should progress
    await expect(page).toHaveURL(/applicant|domestic-abuse/);
  });
});
