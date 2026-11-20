import { test, expect } from "../fixtures/index.js";

const TEST_AUTH_NEXT_PATH = "/case/ED-0001-0002/case-homepage";

test.describe("case home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `/test-auth/login?next=${encodeURIComponent(TEST_AUTH_NEXT_PATH)}`,
    );
  });

  test("correct header is displayed and information is displayed", async ({
    pages,
  }) => {
    const { caseHomePageDetails } = pages;

    await expect(caseHomePageDetails.interruptionCard).toBeVisible();
    await expect(caseHomePageDetails.cardHeading).toHaveText("Expected heading");
    await expect(caseHomePageDetails.cardLink).toBeVisible();
  });

  test("interruption card shows action buttons", async ({ pages }) => {
    const { caseHomePageDetails } = pages;

    await expect(caseHomePageDetails.manageCaseButton).toBeVisible();
    await expect(caseHomePageDetails.arrangeCallbackButton).toBeVisible();
    await expect(caseHomePageDetails.signpostButton).toBeVisible();
  });
});