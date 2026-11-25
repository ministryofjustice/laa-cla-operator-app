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
    "Financial eligibility",
    "Diversity",
    "Refer",
    "Case history",
  ]);
});

test("shows client personal details section", async ({ pages }) => {
  const page = pages.getClientHomePage;
  await page.goto();
  const summaryList = await page.getSummaryListTable("Client details");
  expect(summaryList).toEqual({
    title: "Client details",
    Name: "Jane Doe",
    "Date of birth": "10 October 1988",
    "Email address": "jane.doe@example.com",
    "Phone number": "1234567890",
    "Safe to call?": "Yes",
    "Withheld numbers accepted?": "Yes",
    Address: "102 Petty France, SW1H 9AJ",
  });
});
