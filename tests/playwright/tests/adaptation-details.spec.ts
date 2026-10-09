import { test, expect } from "../fixtures/index.js";
const TEST_AUTH_NEXT_PATH = "/case/JT-4272-9443/adaptation-details";

test.describe("select client support needs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `/test-auth/login?next=${encodeURIComponent(TEST_AUTH_NEXT_PATH)}`,
    );
  });

  test("correct text and checkboxes display", async ({ page, pages }) => {
    const { AdaptationDetailPage } = pages;

    await expect(
      page.getByText(/A client may need translation services/i),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Is there anything we can do to make it easier to communicate with us?",
      ),
    ).toBeVisible();

    await expect(AdaptationDetailPage.languageHeading).toBeVisible();
    await expect(AdaptationDetailPage.welshCheckbox).toBeVisible();
    await expect(AdaptationDetailPage.otherLanguageCheckbox).toBeVisible();

    await expect(AdaptationDetailPage.communicationHeading).toBeVisible();
    await expect(
      AdaptationDetailPage.britishSignLanguageCheckBox,
    ).toBeVisible();
    await expect(AdaptationDetailPage.relayUKCheckbox).toBeVisible();
    await expect(AdaptationDetailPage.otherSupportCheckbox).toBeVisible();

    await expect(AdaptationDetailPage.continueButton).toBeVisible();
  });

  test("checkboxes are unchecked by default", async ({ pages }) => {
    const { AdaptationDetailPage } = pages;

    await expect(AdaptationDetailPage.welshCheckbox).not.toBeChecked();
    await expect(AdaptationDetailPage.otherLanguageCheckbox).not.toBeChecked();
    await expect(
      AdaptationDetailPage.britishSignLanguageCheckBox,
    ).not.toBeChecked();
    await expect(AdaptationDetailPage.relayUKCheckbox).not.toBeChecked();
    await expect(AdaptationDetailPage.otherSupportCheckbox).not.toBeChecked();
  });

  test("conditional inputs are hidden until their checkbox is selected", async ({
    pages,
  }) => {
    const { AdaptationDetailPage } = pages;

    await expect(AdaptationDetailPage.otherLanguageInput).toBeHidden();
    await expect(AdaptationDetailPage.otherSupportTextarea).toBeHidden();

    await AdaptationDetailPage.otherLanguageCheckbox.check();
    await expect(AdaptationDetailPage.otherLanguageInput).toBeVisible();

    await AdaptationDetailPage.otherSupportCheckbox.check();
    await expect(AdaptationDetailPage.otherSupportTextarea).toBeVisible();

    await AdaptationDetailPage.otherLanguageCheckbox.uncheck();
    await expect(AdaptationDetailPage.otherLanguageInput).toBeHidden();
  });

  test("shows an error when other language is selected without a language", async ({
    pages,
  }) => {
    const { AdaptationDetailPage } = pages;

    await AdaptationDetailPage.otherLanguageCheckbox.check();
    await AdaptationDetailPage.clickContinue();

    await expect(AdaptationDetailPage.errorSummary).toBeVisible();
    await expect(
      AdaptationDetailPage.errorSummaryLink("Enter a language"),
    ).toBeVisible();
  });

  test("shows an error when the language is longer than 30 characters", async ({
    pages,
  }) => {
    const { AdaptationDetailPage } = pages;

    await AdaptationDetailPage.selectOtherLanguage("a".repeat(31));
    await AdaptationDetailPage.clickContinue();

    await expect(
      AdaptationDetailPage.errorSummaryLink(
        "Language must be 30 characters or fewer",
      ),
    ).toBeVisible();
  });

  test("shows an error when other support is selected without details", async ({
    pages,
  }) => {
    const { AdaptationDetailPage } = pages;

    await AdaptationDetailPage.otherSupportCheckbox.check();
    await AdaptationDetailPage.clickContinue();

    await expect(
      AdaptationDetailPage.errorSummaryLink("Enter the client’s support needs"),
    ).toBeVisible();
  });

  test("shows an error when more than one communication or support need is selected", async ({
    pages,
  }) => {
    const { AdaptationDetailPage } = pages;

    await AdaptationDetailPage.selectBritishSignLanguage();
    await AdaptationDetailPage.selectRelayUK();
    await AdaptationDetailPage.clickContinue();

    await expect(
      AdaptationDetailPage.errorSummaryLink(
        "Select only one communication or support need",
      ),
    ).toBeVisible();
  });

  test("a single language and a single support need pass validation", async ({
    pages,
  }) => {
    const { AdaptationDetailPage } = pages;

    await AdaptationDetailPage.selectWelsh();
    await AdaptationDetailPage.selectBritishSignLanguage();
    await AdaptationDetailPage.clickContinue();

    await expect(AdaptationDetailPage.errorSummary).toBeHidden();
  });

  test("can continue without selecting anything (both sections are optional)", async ({
    pages,
  }) => {
    const { AdaptationDetailPage } = pages;

    await AdaptationDetailPage.clickContinue();

    await expect(AdaptationDetailPage.errorSummary).toBeHidden();
  });
});
