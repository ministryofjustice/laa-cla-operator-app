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
   * Navigate to the page
   */
  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
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
    return this.page.locator('button:has-text("Save and continue"), button:has-text("Submit")');
  }

  /**
   * Get the back button/link
   */
  get backLink() {
    return this.page.locator('a:has-text("Back")');
  }

  /**
   * Click continue/submit button
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Click back button
   */
  async clickBack(): Promise<void> {
    await this.backLink.click();
  }

  /**
   * Select a radio button by label text
   */
  async selectRadio(label: string): Promise<void> {
    await this.page.locator(`label:has-text("${label}")`).click();
  }

  /**
   * Fill a text input by label
   */
  async fillTextInput(label: string, value: string): Promise<void> {
    const input = this.page.locator(`label:has-text("${label}") ~ input`);
    await input.fill(value);
  }

  /**
   * Check if current URL matches pattern
   */
  async urlMatches(pattern: string | RegExp): Promise<boolean> {
    return this.page.url().includes(typeof pattern === "string" ? pattern : pattern.source);
  }
}
