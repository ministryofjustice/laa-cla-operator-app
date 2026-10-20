import type { Page } from "@playwright/test";

/**
 * Base page object for eligibility journey steps
 */
export abstract class EligibilityBasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get the main heading
   */
  get heading() {
    return this.page.locator("h1");
  }

  /**
   * Get the error summary if present
   */
  get errorSummary() {
    return this.page.locator('[role="alert"]');
  }

  /**
   * Get the continue/submit button
   */
  get submitButton() {
    return this.page.locator(
      'button:has-text("Continue"), button:has-text("Save and continue"), button:has-text("Submit")',
    );
  }

  /**
   * Click continue/submit button
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Select a radio button by label text
   */
  async selectRadio(label: string): Promise<void> {
    await this.page.locator(`label:has-text("${label}")`).click();
  }
}
