import { test, expect } from '../fixtures/index.js';

test('search-client redirects unauthenticated users to auth flow', async ({ page, pages }) => {
  const searchClientPage = pages.searchClientPage;

  await searchClientPage.navigate();
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/login|\/sign-in/);
});

// TODO: Microsoft Entra test implementation isn't applied yet, which means Playwright tests will likely fail