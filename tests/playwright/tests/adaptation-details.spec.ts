import { test, expect } from "../fixtures/index.js";
const TEST_AUTH_NEXT_PATH = "/case/JT-4272-9443/adaptation-details";

test.describe("select client support needs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `/test-auth/login?next=${encodeURIComponent(TEST_AUTH_NEXT_PATH)}`,
    );
  });

  test("correct text and checkboxes display", async ({ page, pages }) => {
    const { adaptationDetailsWebPage } = pages;

    await expect(
      page.getByText(/A client may need translation services/i),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Is there anything we can do to make it easier to communicate with us?",
      ),
    ).toBeVisible();

    await expect(adaptationDetailsWebPage.languageHeading).toBeVisible();
    await expect(adaptationDetailsWebPage.welshCheckbox).toBeVisible();
    await expect(adaptationDetailsWebPage.otherLanguageCheckbox).toBeVisible();

    await expect(adaptationDetailsWebPage.communicationHeading).toBeVisible();
    await expect(
      adaptationDetailsWebPage.britishSignLanguageCheckBox,
    ).toBeVisible();
    await expect(adaptationDetailsWebPage.relayUKCheckbox).toBeVisible();
    await expect(adaptationDetailsWebPage.otherSupportCheckbox).toBeVisible();

    await expect(adaptationDetailsWebPage.continueButton).toBeVisible();
  });

  test("checkboxes are unchecked by default", async ({ pages }) => {
    const { adaptationDetailsWebPage } = pages;

    await expect(adaptationDetailsWebPage.welshCheckbox).not.toBeChecked();
    await expect(
      adaptationDetailsWebPage.otherLanguageCheckbox,
    ).not.toBeChecked();
    await expect(
      adaptationDetailsWebPage.britishSignLanguageCheckBox,
    ).not.toBeChecked();
    await expect(adaptationDetailsWebPage.relayUKCheckbox).not.toBeChecked();
    await expect(
      adaptationDetailsWebPage.otherSupportCheckbox,
    ).not.toBeChecked();
  });

  test("conditional inputs are hidden until their checkbox is selected", async ({
    pages,
  }) => {
    const { adaptationDetailsWebPage } = pages;

    await expect(adaptationDetailsWebPage.otherLanguageInput).toBeHidden();
    await expect(adaptationDetailsWebPage.otherSupportTextarea).toBeHidden();

    await adaptationDetailsWebPage.otherLanguageCheckbox.check();
    await expect(adaptationDetailsWebPage.otherLanguageInput).toBeVisible();

    await adaptationDetailsWebPage.otherSupportCheckbox.check();
    await expect(adaptationDetailsWebPage.otherSupportTextarea).toBeVisible();

    await adaptationDetailsWebPage.otherLanguageCheckbox.uncheck();
    await expect(adaptationDetailsWebPage.otherLanguageInput).toBeHidden();
  });

  test("shows an error when other language is selected without a language", async ({
    pages,
  }) => {
    const { adaptationDetailsWebPage } = pages;

    await adaptationDetailsWebPage.otherLanguageCheckbox.check();
    await adaptationDetailsWebPage.clickContinue();

    await expect(adaptationDetailsWebPage.errorSummary).toBeVisible();
    await expect(
      adaptationDetailsWebPage.errorSummaryLink("Enter a language"),
    ).toBeVisible();
  });

  test("shows an error when the language is longer than 30 characters", async ({
    pages,
  }) => {
    const { adaptationDetailsWebPage } = pages;

    await adaptationDetailsWebPage.selectOtherLanguage("a".repeat(31));
    await adaptationDetailsWebPage.clickContinue();

    await expect(
      adaptationDetailsWebPage.errorSummaryLink(
        "Language must be 30 characters or fewer",
      ),
    ).toBeVisible();
  });

  test("shows an error when other support is selected without details", async ({
    pages,
  }) => {
    const { adaptationDetailsWebPage } = pages;

    await adaptationDetailsWebPage.otherSupportCheckbox.check();
    await adaptationDetailsWebPage.clickContinue();

    await expect(
      adaptationDetailsWebPage.errorSummaryLink(
        "Enter the client’s support needs",
      ),
    ).toBeVisible();
  });

  // NOTE: this will fail until the languageChoice validation in the form is
  // changed to check "welsh" instead of "britishSignLanguage".
  test("shows an error when more than one language option is selected", async ({
    pages,
  }) => {
    const { adaptationDetailsWebPage } = pages;

    await adaptationDetailsWebPage.selectWelsh();
    await adaptationDetailsWebPage.selectOtherLanguage("French");
    await adaptationDetailsWebPage.clickContinue();

    await expect(
      adaptationDetailsWebPage.errorSummaryLink(
        "Select only one language option",
      ),
    ).toBeVisible();
  });

  test("shows an error when more than one communication or support need is selected", async ({
    pages,
  }) => {
    const { adaptationDetailsWebPage } = pages;

    await adaptationDetailsWebPage.selectBritishSignLanguage();
    await adaptationDetailsWebPage.selectRelayUK();
    await adaptationDetailsWebPage.clickContinue();

    await expect(
      adaptationDetailsWebPage.errorSummaryLink(
        "Select only one communication or support need",
      ),
    ).toBeVisible();
  });

  test("a single language and a single support need pass validation", async ({
    pages,
  }) => {
    const { adaptationDetailsWebPage } = pages;

    await adaptationDetailsWebPage.selectWelsh();
    await adaptationDetailsWebPage.selectBritishSignLanguage();
    await adaptationDetailsWebPage.clickContinue();

    await expect(adaptationDetailsWebPage.errorSummary).toBeHidden();
  });

  test("can continue without selecting anything (both sections are optional)", async ({
    pages,
  }) => {
    const { adaptationDetailsWebPage } = pages;

    await adaptationDetailsWebPage.clickContinue();

    await expect(adaptationDetailsWebPage.errorSummary).toBeHidden();
  });
});
