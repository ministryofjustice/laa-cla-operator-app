import { test, expect } from "../fixtures/index.js";

const TEST_AUTH_NEXT_PATH = "/receive-call/add-address";

test.describe("add client address", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `/test-auth/login?next=${encodeURIComponent(TEST_AUTH_NEXT_PATH)}`,
    );
  });

  test("correct form is displayed", async ({ pages }) => {
    const { AddAddressPage } = pages;

    await expect(AddAddressPage.heading).toBeVisible();
    await expect(AddAddressPage.addressInput).toBeVisible();
    await expect(AddAddressPage.postcodeInput).toBeVisible();
    await expect(AddAddressPage.continueButton).toBeVisible();
  });

  test("Enter the details and submit the form", async ({ page, pages }) => {
  const { AddAddressPage } = pages;

  await AddAddressPage.addressInput.fill("12 Test Street\nTest Town");
  await AddAddressPage.postcodeInput.fill("AB1 2CD");

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        r.url().includes("/receive-call/add-address"),
    ),
    AddAddressPage.continueButton.click(),
  ]);

});

  test("Error when the first address Input is not entered", async ({
    page,
    pages,
  }) => {
    const { AddAddressPage } = pages;

    // Leave the address empty, fill only the postcode
    await AddAddressPage.postcodeInput.fill("AB1 2CD");
    await AddAddressPage.continueButton.click();

    // Should stay on the same page
    await expect(page).toHaveURL(new RegExp(TEST_AUTH_NEXT_PATH));

    // Error summary at the top, its link to the field, and the inline message
    await expect(AddAddressPage.errorSummary).toBeVisible();
    await expect(AddAddressPage.addressErrorSummaryLink).toBeVisible();
    await expect(AddAddressPage.addressErrorMessage).toBeVisible();
  });
});