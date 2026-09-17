import { test, expect } from '../fixtures/index.js';

test('homepage should have the correct title', async ({ page }) => {
	// Navigate to the homepage
	await page.goto('/');

	// Check for the title of the application
	await expect(page).toHaveTitle(/Assess and refer for civil legal advice/);
});

test('homepage should display LAA header', async ({ page }) => {
	await page.goto('/');

	// Check for the header with LAA branding
	const header = page.getByRole('banner');
	await expect(header).toBeVisible();

});

test('home page displays service name', async ({ pages, checkAccessibility }) => {
  const homePage = pages.homePage;
  
  // Navigate to home page
  await homePage.navigate();
  await homePage.waitForLoad();
  
  // Test the service name heading is present
  await expect(homePage.heading).toBeVisible();
  const serviceName = await homePage.getServiceName();
  expect(serviceName).toBeTruthy();
  
  // Run accessibility check
  await checkAccessibility();
});

test('home page table has correct structure', async ({ page, pages }) => {
  const homePage = pages.homePage;
  
  await homePage.navigate();
  await homePage.waitForLoad();
  
  // Check table headers
  // const table = homePage.mountainsTable;
  // await expect(table.locator('thead th').nth(0)).toHaveText('Name');
  // await expect(table.locator('thead th').nth(1)).toHaveText('Elevation');
  // await expect(table.locator('thead th').nth(2)).toHaveText('Continent');
  // await expect(table.locator('thead th').nth(3)).toHaveText('First summit');
  
  // // Check that all expected mountains are present
  // const expectedMountains = [
  //   'Aconcagua', 'Denali', 'Elbrus', 'Everest', 
  //   'Kilimanjaro', 'Puncak Jaya', 'Vinson'
  // ];
  
  // const actualMountains = await homePage.getMountainNames();
  // expect(actualMountains).toHaveLength(expectedMountains.length);
  
  // for (const mountain of expectedMountains) {
  //   expect(actualMountains).toContain(mountain);
  // }
});