import type { Page } from "@playwright/test";
import { EligibilityBasePage } from "./EligibilityBasePage.js";

/**
 * Page object for Under 18 CLR step
 */
export class Under18ClrPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Select yes for controlled legal representation
   */
  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

  /**
   * Select no for controlled legal representation
   */
  async selectNo(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Aggregated Means step
 */
export class AggregatedMeansPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Select yes for aggregated means
   */
  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

  /**
   * Select no for aggregated means
   */
  async selectNo(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Immigration or Asylum step
 */
export class ImmigrationOrAsylumPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Select yes for immigration or asylum
   */
  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

  /**
   * Select no for immigration or asylum
   */
  async selectNo(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Domestic Abuse Applicant step
 */
export class DomesticAbuseApplicantPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Select yes for domestic abuse
   */
  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

  /**
   * Select no for domestic abuse
   */
  async selectNo(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Applicant step (partner question)
 */
export class ApplicantPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Select yes for has partner
   */
  async selectHasPartner(): Promise<void> {
    await this.selectRadio("Yes");
  }

  /**
   * Select no for has partner
   */
  async selectNoPartner(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Check Your Answers step
 */
export class CheckYourAnswersPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Get the answers summary section
   */
  get answersSummary() {
    return this.page.locator("dl");
  }

  /**
   * Check if answer for a field is visible
   */
  async hasAnswer(fieldName: string, expectedValue: string): Promise<boolean> {
    const text = await this.answersSummary.textContent();
    return text?.includes(fieldName) && text?.includes(expectedValue) ? true : false;
  }
}
