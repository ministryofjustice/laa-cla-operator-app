import { test, expect } from '../fixtures/index.js';

test('receive-call redirects unauthenticated users to auth flow', async ({ page, pages }) => {
  const receiveCallPage = pages.receiveCallPage;

  await receiveCallPage.navigate();
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/login|\/sign-in/);
});
