import { test, expect } from "../fixtures/index.js";


test("search-client redirects unauthenticated users to auth flow", async ({
  page,
  pages,
}) => {
  const searchClientPage = pages.searchClientPage;

  await searchClientPage.navigate();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveURL(/\/login|\/sign-in/);
});

test("search-client shows myself full name text when callerType is client", async ({
  page,
  pages,
}) => {
  const receiveCallPage = pages.receiveCallPage;
  const searchClientPage = pages.searchClientPage;

  await page.goto("/test-auth/login?next=/receive-call");
  await receiveCallPage.selectCallerType("client");
  await receiveCallPage.continueButton.click();

  await expect(page).toHaveURL(/\/receive-call\/search-client$/);
  await expect(searchClientPage.fullNameLabelMyself).toBeVisible();
});

test("search-client shows third-party full name text when callerType is thirdParty", async ({
  page,
  pages,
}) => {
  const receiveCallPage = pages.receiveCallPage;
  const searchClientPage = pages.searchClientPage;

  await page.goto("/test-auth/login?next=/receive-call");
  await receiveCallPage.selectCallerType("thirdParty");
  await receiveCallPage.continueButton.click();

  await expect(page).toHaveURL(/\/receive-call\/search-client$/);
  await expect(searchClientPage.fullNameLabelThirdParty).toBeVisible();
});
