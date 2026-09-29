import type { Locator, Page } from '@playwright/test';
import { TEST_CONFIG } from '../playwright.config.js';

export class AddressPage {
  private readonly page: Page;
  private readonly addAddressUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.addAddressUrl = `${TEST_CONFIG.BASE_URL}/receive-call/add-address`;
  }

  get url(): string {
    return '/receive-call/add-address'; // was '/receive/add-address', which didn't match
  }

  get heading(): Locator {
    return this.page.getByRole('heading', { name: /enter client.s address manually/i });
  }

  get addressInput(): Locator {
    return this.page.locator('#address-line-1');
  }

  get postcodeInput(): Locator {
    return this.page.locator('#postcode');
  }

  get continueButton(): Locator {
    return this.page.getByRole('button', { name: 'Use this address' });
  }

  // Summary box at the top of the page
  get errorSummary(): Locator {
    return this.page.locator('.govuk-error-summary');

  }

  // Link inside the summary that points at the address field
  get addressErrorSummaryLink(): Locator {
    return this.errorSummary.locator('a[href="#address-line-1"]');
  }

  get addressErrorMessage(): Locator {
    return this.page.locator('#address-line-1-error');
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.addAddressUrl);
  }
}