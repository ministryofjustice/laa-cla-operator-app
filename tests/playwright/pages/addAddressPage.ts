import type { Locator, Page } from '@playwright/test';
import { TEST_CONFIG } from '../playwright.config.js';


export class AddressPage {

  private readonly page: Page;
  private readonly addAdressUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.addAdressUrl = `${TEST_CONFIG.BASE_URL}/receive-call/add-address`;
  }

  get url(): string {
    return '/receive/add-address';
  }

  get addressInput():Locator {
    return this.page.locator('#address-line-1'); 
  }

   get postcodeInput():Locator {
    return this.page.locator('#postcode'); 
  }

    get continueButton(): Locator {
    return this.page.getByRole('button', { name: 'Continue' });
  }

    async navigate(): Promise<void> {
    await this.page.goto(this.addAdressUrl);
  }
}