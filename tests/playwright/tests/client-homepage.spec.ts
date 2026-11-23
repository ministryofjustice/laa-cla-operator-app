import { test, expect } from "../fixtures/index.js";

const TEST_AUTH_NEXT_PATH = "/case/ED-0001-0002/add-address";

test.beforeEach(async ({ page }) => {
  await page.goto(
    `/test-auth/login?next=${encodeURIComponent(TEST_AUTH_NEXT_PATH)}`,
  );
});

test("shows all case section tabs", async ({ pages }) => {
  const clientHomePage = pages.getClientHomePage;
  await clientHomePage.goto();

  await expect(clientHomePage.caseSectionTabs).toHaveText([
    "Client's details",
    "Scope",
    "Financial Eligibility",
    "Diversity",
    "Refer",
    "Case history",
  ]);
});
