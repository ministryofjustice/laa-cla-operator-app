import { test, expect } from "../fixtures/index.js";

test.describe("Add new client page", () => {
  test("renders heading and back link", async ({ pages }) => {
    const { addClientDetailsPage } = pages;
    await addClientDetailsPage.navigate();

    await expect(addClientDetailsPage.heading).toBeVisible();
    await expect(addClientDetailsPage.backLink).toHaveAttribute(
      "href",
      "/receive-call/search-client",
    );
  });

  test("submitting with valid details redirects to add-client-address", async ({
    page,
    pages,
  }) => {
    const { addClientDetailsPage } = pages;
    await addClientDetailsPage.navigate();

    await addClientDetailsPage.fillValidForm();
    await addClientDetailsPage.submit();

    await expect(page).toHaveURL(/\/receive-call\/add-client-address$/);
  });

  test("submitting with everything blank shows all expected error messages", async ({
    pages,
  }) => {
    const { addClientDetailsPage } = pages;
    await addClientDetailsPage.navigate();

    await addClientDetailsPage.submit();

    await expect(addClientDetailsPage.errorSummary).toBeVisible();
    await expect(addClientDetailsPage.errorSummary).toContainText(
      "There is a problem",
    );
    await expect(addClientDetailsPage.errorSummary).toContainText(
      "Enter the client’s name",
    );
    await expect(addClientDetailsPage.errorSummary).toContainText(
      "Enter a valid day",
    );
    await expect(addClientDetailsPage.errorSummary).toContainText(
      "Enter a valid month",
    );
    await expect(addClientDetailsPage.errorSummary).toContainText(
      "Enter a valid year",
    );
    await expect(addClientDetailsPage.errorSummary).toContainText(
      "Enter a valid phone number",
    );
  });

  test("invalid date of birth shows date error only", async ({ pages }) => {
    const { addClientDetailsPage } = pages;
    await addClientDetailsPage.navigate();

    await addClientDetailsPage.fullNameInput.fill("Jane Doe");
    await addClientDetailsPage.dateOfBirthDayInput.fill("32");
    await addClientDetailsPage.dateOfBirthMonthInput.fill("13");
    await addClientDetailsPage.dateOfBirthYearInput.fill("1990");
    await addClientDetailsPage.phoneNumberInput.fill("07123456789");
    await addClientDetailsPage
      .radioYes("Is it safe to call this number?")
      .check();
    await addClientDetailsPage
      .radioYes("Is it safe to leave a message?")
      .check();
    await addClientDetailsPage
      .radioYes(
        "If safe to call, does your phone accept calls from a withheld number?",
      )
      .check();
    await addClientDetailsPage.submit();

    await expect(addClientDetailsPage.errorSummary).toContainText(
      "Enter a valid day",
    );
    await expect(addClientDetailsPage.errorSummary).toContainText(
      "Enter a valid month",
    );
    await expect(addClientDetailsPage.errorSummary).not.toContainText(
      "Enter a valid year",
    );
    await expect(addClientDetailsPage.errorSummary).not.toContainText(
      "Enter a valid phone number",
    );
  });

  test("invalid phone number shows phone error only", async ({ pages }) => {
    const { addClientDetailsPage } = pages;
    await addClientDetailsPage.navigate();

    await addClientDetailsPage.fullNameInput.fill("Jane Doe");
    await addClientDetailsPage.dateOfBirthDayInput.fill("27");
    await addClientDetailsPage.dateOfBirthMonthInput.fill("3");
    await addClientDetailsPage.dateOfBirthYearInput.fill("1990");
    await addClientDetailsPage.phoneNumberInput.fill("abc");
    await addClientDetailsPage
      .radioYes("Is it safe to call this number?")
      .check();
    await addClientDetailsPage
      .radioYes("Is it safe to leave a message?")
      .check();
    await addClientDetailsPage
      .radioYes(
        "If safe to call, does your phone accept calls from a withheld number?",
      )
      .check();
    await addClientDetailsPage.submit();

    await expect(addClientDetailsPage.errorSummary).toContainText(
      "Enter a valid phone number",
    );
    await expect(addClientDetailsPage.errorSummary).not.toContainText(
      "Enter a valid day",
    );
    await expect(addClientDetailsPage.errorSummary).not.toContainText(
      "Enter a valid month",
    );
    await expect(addClientDetailsPage.errorSummary).not.toContainText(
      "Enter a valid year",
    );
  });

  test("email is optional and does not block submission when blank", async ({
    page,
    pages,
  }) => {
    const { addClientDetailsPage } = pages;
    await addClientDetailsPage.navigate();

    await addClientDetailsPage.fillValidForm();
    // emailInput intentionally left blank
    await addClientDetailsPage.submit();

    await expect(page).toHaveURL(/\/receive-call\/add-client-address$/);
  });

  test('selecting "Yes" for withheld number question reveals prompt text', async ({
    pages,
  }) => {
    const { addClientDetailsPage } = pages;
    await addClientDetailsPage.navigate();

    await addClientDetailsPage
      .radioYes(
        "If safe to call, does your phone accept calls from a withheld number?",
      )
      .check();

    await expect(addClientDetailsPage.withheldNumberPrompt).toBeVisible();
  });

  test('selecting "No" for withheld number question reveals callback text', async ({
    pages,
  }) => {
    const { addClientDetailsPage } = pages;
    await addClientDetailsPage.navigate();

    await addClientDetailsPage
      .radioNo(
        "If safe to call, does your phone accept calls from a withheld number?",
      )
      .check();

    await expect(addClientDetailsPage.withheldNumberCallback).toBeVisible();
  });

  test("page has no accessibility violations in default state", async ({
    pages,
    checkAccessibility,
  }) => {
    await pages.addClientDetailsPage.navigate();
    await checkAccessibility();
  });

  test("page has no accessibility violations in error state", async ({
    pages,
    checkAccessibility,
  }) => {
    const { addClientDetailsPage } = pages;
    await addClientDetailsPage.navigate();
    await addClientDetailsPage.submit();
    await checkAccessibility();
  });
});
