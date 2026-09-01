import { test, expect } from '../fixtures/index.js';

test('privacy page displays the privacy notice heading', async ({ page }) => {
  await page.goto('/privacy');

  await expect(page.getByRole('heading', { level: 1, name: 'Privacy notice' })).toBeVisible();
});

test('privacy footer link on the front page opens the privacy page', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Privacy' }).click();

  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy notice' })).toBeVisible();
});