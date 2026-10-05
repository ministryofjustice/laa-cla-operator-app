import { test, expect } from "../fixtures/index.js";

const TEST_AUTH_NEXT_PATH = "/case/ED-0001-0002/support-needs";

test.describe("select client support needs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `/test-auth/login?next=${encodeURIComponent(TEST_AUTH_NEXT_PATH)}`,
    );
  });

  test("correct text and checkboxes display", async ({ page, pages }) => {
    const { ClientSupportPage } = pages;

    await expect(
      page.getByText(/A client may need translation services/i),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Is there anything we can do to make it easier to communicate with us?",
      ),
    ).toBeVisible();

    await expect(ClientSupportPage.languageHeading).toBeVisible();
    await expect(ClientSupportPage.welshCheckbox).toBeVisible();
    await expect(ClientSupportPage.otherLanguageCheckbox).toBeVisible();

    await expect(ClientSupportPage.communicationHeading).toBeVisible();
    await expect(ClientSupportPage.britishSignLanguageCheckBox).toBeVisible();
    await expect(ClientSupportPage.relayUKCheckbox).toBeVisible();
    await expect(ClientSupportPage.otherSupportCheckbox).toBeVisible();

    await expect(ClientSupportPage.continueButton).toBeVisible();
  });

  test("checkboxes are unchecked by default", async ({ pages }) => {
    const { ClientSupportPage } = pages;

    await expect(ClientSupportPage.welshCheckbox).not.toBeChecked();
    await expect(ClientSupportPage.otherLanguageCheckbox).not.toBeChecked();
    await expect(
      ClientSupportPage.britishSignLanguageCheckBox,
    ).not.toBeChecked();
    await expect(ClientSupportPage.relayUKCheckbox).not.toBeChecked();
    await expect(ClientSupportPage.otherSupportCheckbox).not.toBeChecked();
  });

  test("conditional inputs are hidden until their checkbox is selected", async ({
    pages,
  }) => {
    const { ClientSupportPage } = pages;

    await expect(ClientSupportPage.otherLanguageInput).toBeHidden();
    await expect(ClientSupportPage.otherSupportTextarea).toBeHidden();

    await ClientSupportPage.otherLanguageCheckbox.check();
    await expect(ClientSupportPage.otherLanguageInput).toBeVisible();

    await ClientSupportPage.otherSupportCheckbox.check();
    await expect(ClientSupportPage.otherSupportTextarea).toBeVisible();

    await ClientSupportPage.otherLanguageCheckbox.uncheck();
    await expect(ClientSupportPage.otherLanguageInput).toBeHidden();
  });

  test("shows an error when other language is selected without a language", async ({
    pages,
  }) => {
    const { ClientSupportPage } = pages;

    await ClientSupportPage.otherLanguageCheckbox.check();
    await ClientSupportPage.clickContinue();

    await expect(ClientSupportPage.errorSummary).toBeVisible();
    await expect(
      ClientSupportPage.errorSummaryLink("Enter a language"),
    ).toBeVisible();
  });

  test("shows an error when the language is longer than 30 characters", async ({
    pages,
  }) => {
    const { ClientSupportPage } = pages;

    await ClientSupportPage.selectOtherLanguage("a".repeat(31));
    await ClientSupportPage.clickContinue();

    await expect(
      ClientSupportPage.errorSummaryLink(
        "Language must be 30 characters or fewer",
      ),
    ).toBeVisible();
  });

  test("shows an error when other support is selected without details", async ({
    pages,
  }) => {
    const { ClientSupportPage } = pages;

    await ClientSupportPage.otherSupportCheckbox.check();
    await ClientSupportPage.clickContinue();

    await expect(
      ClientSupportPage.errorSummaryLink("Enter the client’s support needs"),
    ).toBeVisible();
  });

  // NOTE: this will fail until the languageChoice validation in the form is
  // changed to check "welsh" instead of "britishSignLanguage".
  test("shows an error when more than one language option is selected", async ({
    pages,
  }) => {
    const { ClientSupportPage } = pages;

    await ClientSupportPage.selectWelsh();
    await ClientSupportPage.selectOtherLanguage("French");
    await ClientSupportPage.clickContinue();

    await expect(
      ClientSupportPage.errorSummaryLink("Select only one language option"),
    ).toBeVisible();
  });

  test("shows an error when more than one communication or support need is selected", async ({
    pages,
  }) => {
    const { ClientSupportPage } = pages;

    await ClientSupportPage.selectBritishSignLanguage();
    await ClientSupportPage.selectRelayUK();
    await ClientSupportPage.clickContinue();

    await expect(
      ClientSupportPage.errorSummaryLink(
        "Select only one communication or support need",
      ),
    ).toBeVisible();
  });

  test("a single language and a single support need pass validation", async ({
    pages,
  }) => {
    const { ClientSupportPage } = pages;

    await ClientSupportPage.selectWelsh();
    await ClientSupportPage.selectBritishSignLanguage();
    await ClientSupportPage.clickContinue();

    await expect(ClientSupportPage.errorSummary).toBeHidden();
  });

  test("can continue without selecting anything (both sections are optional)", async ({
    pages,
  }) => {
    const { ClientSupportPage } = pages;

    await ClientSupportPage.clickContinue();

    await expect(ClientSupportPage.errorSummary).toBeHidden();
  });
});
