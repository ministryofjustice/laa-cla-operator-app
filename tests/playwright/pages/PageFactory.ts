import type { Page } from '@playwright/test';
import { HomePage } from './HomePage.js';
import { ReceiveCallPage } from './ReceiveCallPage.js';

/**
 * Factory class for creating page objects
 */
export class PageFactory {
  private readonly page: Page;

  /**
   * Creates a new page factory instance
   * @param {Page} page - The Playwright page instance
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Gets an instance of the home page
   * @returns {HomePage} The home page object
   */
  get homePage(): HomePage {
    return new HomePage(this.page);
  }

  /**
   * Gets an instance of the receive-call journey page
   * @returns {ReceiveCallPage} The receive-call page object
   */
  get receiveCallPage(): ReceiveCallPage {
    return new ReceiveCallPage(this.page);
  }
}