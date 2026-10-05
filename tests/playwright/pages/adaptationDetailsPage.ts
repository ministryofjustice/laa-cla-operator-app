import type { Locator, Page } from "@playwright/test";
import { TEST_CONFIG } from "../playwright.config.js";

export class adaptationDetailsWebPage {
  private readonly page: Page;
  private readonly adaptationDetailsUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.adaptationDetailsUrl = `${TEST_CONFIG.BASE_URL}/case/ED-0001-0002/adaptation-details`;
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.adaptationDetailsUrl);
  }

  // URL helpers
  url(caseId: string): string {
    return `/case/${caseId}/adaptation-details`;
  }

  async goto(caseId: string): Promise<void> {
    await this.page.goto(this.url(caseId));
  }

  // Headings
  get heading(): Locator {
    return this.page.getByRole("heading", {
      name: /Client’s support needs/i,
    });
  }

  get languageHeading(): Locator {
    return this.page.getByRole("heading", {
      name: /Client’s language requirements/i,
    });
  }

  get communicationHeading(): Locator {
    return this.page.getByRole("heading", {
      name: /Client’s communication and support needs/i,
    });
  }

  // Language options
  get welshCheckbox(): Locator {
    return this.page.getByRole("checkbox", {
      name: "Welsh language service needed",
    });
  }

  get otherLanguageCheckbox(): Locator {
    return this.page.getByRole("checkbox", {
      name: /Other language – interpreter needed/i,
    });
  }

  get otherLanguageInput(): Locator {
    return this.page.locator('input[name="otherLanguageChoice"]');
  }

  // Communication and support options
  get britishSignLanguageCheckBox(): Locator {
    return this.page.getByRole("checkbox", {
      name: /British Sign Language \(BSL\)/i,
    });
  }

  get relayUKCheckbox(): Locator {
    return this.page.getByRole("checkbox", { name: "Relay UK" });
  }

  get otherSupportCheckbox(): Locator {
    return this.page.getByRole("checkbox", {
      name: /Any other support or accessibility needs/i,
    });
  }

  get otherSupportTextarea(): Locator {
    return this.page.locator('textarea[name="otherSupportDetails"]');
  }

  get continueButton(): Locator {
    return this.page.getByRole("button", { name: "Continue" });
  }

  // Errors
  get errorSummary(): Locator {
    return this.page.locator(".govuk-error-summary");
  }

  errorSummaryLink(message: string | RegExp): Locator {
    return this.errorSummary.getByRole("link", { name: message });
  }

  get otherLanguageError(): Locator {
    return this.page.locator("#otherLanguageChoice-error");
  }

  get otherSupportError(): Locator {
    return this.page.locator("#otherSupportDetails-error");
  }

  // Actions
  async selectWelsh(): Promise<void> {
    await this.welshCheckbox.check();
  }

  async selectOtherLanguage(language: string): Promise<void> {
    await this.otherLanguageCheckbox.check();
    await this.otherLanguageInput.fill(language);
  }

  async selectBritishSignLanguage(): Promise<void> {
    await this.britishSignLanguageCheckBox.check();
  }

  async selectRelayUK(): Promise<void> {
    await this.relayUKCheckbox.check();
  }

  async selectOtherSupport(details: string): Promise<void> {
    await this.otherSupportCheckbox.check();
    await this.otherSupportTextarea.fill(details);
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }
}
