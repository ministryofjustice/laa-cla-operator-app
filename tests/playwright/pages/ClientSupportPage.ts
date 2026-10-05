import type { Locator, Page } from "@playwright/test";
import { TEST_CONFIG } from "../playwright.config.js";

export class ClientSupportPage {
  private readonly page: Page;
  private readonly supportNeedsUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.supportNeedsUrl = `${TEST_CONFIG.BASE_URL}/support-needs`;
  }

  get url(): string {
    return "/receive-call/support-needs";
  }

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

  async goto(): Promise<void> {
    await this.page.goto(this.supportNeedsUrl);
  }
}
