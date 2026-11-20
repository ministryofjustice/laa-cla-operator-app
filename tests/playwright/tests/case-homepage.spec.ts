import { test, expect } from "../fixtures/index.js";

const TEST_AUTH_NEXT_PATH = "/case/ED-0001-0002/case-homepage";

test.describe("case home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `/test-auth/login?next=${encodeURIComponent(TEST_AUTH_NEXT_PATH)}`,
    );
  });

  test("interruption card displays case name and reference", async ({
    pages,
  }) => {
    const { caseHomePageDetails } = pages;
    await expect(caseHomePageDetails.caseReference).toHaveText("ED-0001-0002");
  });

  test("interruption card shows action buttons", async ({ pages }) => {
    const { caseHomePageDetails } = pages;

    await expect(caseHomePageDetails.manageCaseButton).toBeVisible();
    await expect(caseHomePageDetails.arrangeCallbackButton).toBeVisible();
    await expect(caseHomePageDetails.signpostButton).toBeVisible();
  });
});
