import { test, expect } from '../fixtures/index.js';

test('cookies page displays the cookies notice heading', async ({ page }) => {
  await page.goto('/cookies');

  await expect(page.getByRole('heading', { level: 1, name: 'Cookies notice' })).toBeVisible();
});

test('cookies footer link on the front page opens the cookies page', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Cookies' }).click();

  await expect(page).toHaveURL(/\/cookies$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Cookies notice' })).toBeVisible();
});