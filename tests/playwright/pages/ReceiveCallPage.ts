import type { Locator, Page } from "@playwright/test";
import { TEST_CONFIG } from "../playwright.config.js";

/**
 * Page object for the receive-call journey entry step.
 */
export class ReceiveCallPage {
  private readonly page: Page;
  private readonly receiveCallUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.receiveCallUrl = `${TEST_CONFIG.BASE_URL}/receive-call`;
  }

  get url(): string {
    return "/receive-call";
  }

  get whosCallingInput(): Locator {
    return this.page.locator("#whos-calling");
  }

  get continueButton(): Locator {
    return this.page.getByRole("button", { name: "Continue" });
  }

  get validationMessage(): Locator {
    return this.page.getByText(
      "Please select whether you are calling on behalf of yourself or another person.",
    );
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.receiveCallUrl);
  }
}
