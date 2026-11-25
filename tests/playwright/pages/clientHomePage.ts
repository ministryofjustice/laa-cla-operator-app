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
    return `${TEST_CONFIG.BASE_URL}/case/ED-0001-0003/case-homepage`;
  }

  get pageTitle(): string {
    return "Client Homepage";
  }

  get caseSectionTabs(): Locator {
    return this.page
      .getByRole("navigation", { name: "Case sections" })
      .getByRole("link");
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }
  async getSummaryListTable(title: string): Promise<Record<string, string>> {
    const summary: Record<string, string> = {
      title: title,
    };
    const table = this.page
      .locator(`.govuk-summary-card__title:has-text("${title}")`)
      .locator("../..");
    for (const row of await table.locator(".govuk-summary-list__row").all()) {
      const key = await row.locator(".govuk-summary-list__key").innerText();
      const value = await row.locator(".govuk-summary-list__value").innerText();
      summary[key] = value;
    }
    return summary;
  }
}
