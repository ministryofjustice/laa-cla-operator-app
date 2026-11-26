import type { Page, Locator } from "@playwright/test";
import { TEST_CONFIG } from "../playwright.config.js";

export class ClientHomePage {
  private readonly page: Page;

  /**
   * Creates a new ClientHomePage object
   * @param {Page} page - The Playwright page instance
   */
  constructor(page: Page) {
    this.page = page;
  }

  get url(): string {
    return `${TEST_CONFIG.BASE_URL}/case/ED-0001-0002/case-homepage`;
  }

  get pageTitle(): string {
    return "Client Homepage";
  }

  get caseSectionTabs(): Locator {
    return this.page
      .getByRole("navigation", { name: "Case sections" })
      .getByRole("link");
  }

  get thirdPartySection(): Locator {
    return this.page.getByRole("heading", { name: "Third Party Details" });
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }
}
