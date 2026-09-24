import { test, expect } from "../fixtures/index.js";

const TEST_AUTH_NEXT_PATH = "/receive-call/add-address";

test.describe("add client address", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `/test-auth/login?next=${encodeURIComponent(TEST_AUTH_NEXT_PATH)}`,
    );
  });

  test("correct heading is rendered", async ({ pages }) => {
    const { AddAddressPage } = pages;
    await expect(AddAddressPage.addressInput).toBeVisible();
    await expect(AddAddressPage.postcodeInput).toBeVisible();
     await expect(AddAddressPage.continueButton).toBeVisible();
  });
});