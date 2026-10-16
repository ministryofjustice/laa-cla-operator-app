import type { Page } from "@playwright/test";
import { EligibilityBasePage } from "./EligibilityBasePage.js";

/**
 * Page object for Under 18 CLR step
 */
export class Under18ClrPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

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

  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

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

  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

  async selectNo(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Immigration or Asylum Type step
 */
export class ImmigrationOrAsylumTypePage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectImmigration(): Promise<void> {
    await this.selectRadio("Immigration");
  }

  async selectAsylum(): Promise<void> {
    await this.selectRadio("Asylum");
  }

  async selectImmigrationAppeal(): Promise<void> {
    await this.selectRadio("Immigration appeal");
  }

  async selectAsylumAppeal(): Promise<void> {
    await this.selectRadio("Asylum appeal");
  }
}

/**
 * Page object for Asylum Support step
 */
export class AsylumSupportPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

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

  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

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

  async selectHasPartner(): Promise<void> {
    await this.selectRadio("Yes");
  }

  async selectNoPartner(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Property step
 */
export class PropertyPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectOutright(): Promise<void> {
    await this.selectRadio("Yes, outright");
  }

  async selectWithMortgage(): Promise<void> {
    await this.selectRadio("Yes, with a mortgage or loan");
  }

  async selectSharedOwnership(): Promise<void> {
    await this.selectRadio("Yes, shared ownership");
  }

  async selectNo(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Property Entry step
 */
export class PropertyEntryPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fillPropertyValue(value: string): Promise<void> {
    await this.fillTextInput("How much is the property worth?", value);
  }

  async fillMortgageAmount(value: string): Promise<void> {
    await this.fillTextInput("How much is left to pay on the mortgage?", value);
  }

  async fillPercentageOwned(value: string): Promise<void> {
    await this.fillTextInput("What percentage of the property does the client own?", value);
  }
}

/**
 * Page object for Additional Property step
 */
export class AdditionalPropertyPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

  async selectNo(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Employment Status step
 */
export class EmploymentStatusPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectEmployed(): Promise<void> {
    await this.selectCheckbox("Employed");
  }

  async selectSelfEmployed(): Promise<void> {
    await this.selectCheckbox("Self-employed");
  }

  async selectUnemployed(): Promise<void> {
    await this.selectCheckbox("Unemployed");
  }

  async selectNotWorking(): Promise<void> {
    await this.selectCheckbox("Not working");
  }
}

/**
 * Page object for Benefits step
 */
export class BenefitsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

  async selectNo(): Promise<void> {
    await this.selectRadio("No");
  }
}

/**
 * Page object for Assets step
 */
export class AssetsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fillInvestments(value: string): Promise<void> {
    await this.fillTextInput("Investments", value);
  }

  async fillValuables(value: string): Promise<void> {
    await this.fillTextInput("Valuables", value);
  }
}

/**
 * Page object for Vehicles step
 */
export class VehiclesPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectYes(): Promise<void> {
    await this.selectRadio("Yes");
  }

  async selectNo(): Promise<void> {
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

  get answersSummary() {
    return this.page.locator("dl");
  }

  async hasAnswer(fieldName: string, expectedValue: string): Promise<boolean> {
    const text = await this.answersSummary.textContent();
    return text?.includes(fieldName) && text?.includes(expectedValue) ? true : false;
  }
}
