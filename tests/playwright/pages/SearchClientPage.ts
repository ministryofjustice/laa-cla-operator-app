import type { Locator, Page } from '@playwright/test';
import { TEST_CONFIG } from '../playwright.config.js';

/**
 * Page object for the search-client journey entry step.
 */
export class SearchClientPage {
  private readonly page: Page;
  private readonly searchClientUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.searchClientUrl = `${TEST_CONFIG.BASE_URL}/receive-call/search-client`;
  }

  get url(): string {
    return '/receive-call/search-client';
  }

  get searchClientInput(): Locator {
    return this.page.locator('#search-client');
  }

  get searchButton(): Locator {
    return this.page.getByRole('button', { name: 'Search' });
  }

  get validationMessageName(): Locator {
    return this.page.getByText(
      'Full name must only contain letters, spaces, hyphens and apostrophes'
    );
  }

  get validationMessagePhone(): Locator {
    return this.page.getByText(
      'Phone number must be valid'
    );
  }

  get validationMessagePostcode(): Locator {
    return this.page.getByText(
      'Postcode must be valid'
    );
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.searchClientUrl);
  }
}
