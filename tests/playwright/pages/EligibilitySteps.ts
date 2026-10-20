import type { Page } from "@playwright/test";
import { EligibilityBasePage } from "./EligibilityBasePage.js";

/**
 * Page object for Employment Status step
 */
export class EmploymentStatusPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectEmployed(): Promise<void> {
    await this.page.getByLabel("Employed or self-employed").check();
  }

  async selectUnemployed(): Promise<void> {
    await this.page.getByLabel("Unemployed").check();
  }
}

/**
 * Page object for the Employment income step
 */
export class IncomePage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fillRow(
    index: number,
    row: {
      type: string;
      frequency: string;
      gross: string;
      tax: string;
      nationalInsurance: string;
    },
  ): Promise<void> {
    await this.page.locator(`#incomes_${index}_income_type`).waitFor();
    await this.page
      .locator(
        `input[name="incomes_${index}_income_type"][value="${row.type}"]`,
      )
      .check();
    await this.page
      .locator(
        `input[name="incomes_${index}_income_frequency"][value="${row.frequency}"]`,
      )
      .check();
    await this.page.locator(`#incomes_${index}_gross_income`).fill(row.gross);
    await this.page.locator(`#incomes_${index}_income_tax`).fill(row.tax);
    await this.page
      .locator(`#incomes_${index}_national_insurance`)
      .fill(row.nationalInsurance);
  }

  async addAnother(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Add another employment income" })
      .click();
  }
}

/**
 * Page object for the Benefit details step
 */
export class BenefitDetailsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fillRow(
    index: number,
    row: { type: string; amount: string; frequency: string },
  ): Promise<void> {
    await this.page
      .locator(`#benefits_${index}_benefit_type`)
      .selectOption(row.type);
    await this.page
      .locator(`#benefits_${index}_benefit_amount`)
      .fill(row.amount);
    await this.page
      .locator(
        `input[name="benefits_${index}_benefit_frequency"][value="${row.frequency}"]`,
      )
      .check();
  }
}

/**
 * Page object for the Other income step
 */
export class OtherIncomePage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async answer(type: string, relevant: boolean): Promise<void> {
    await this.page
      .locator(`input[name="${type}_relevant"][value="${String(relevant)}"]`)
      .check();
  }

  async answerNoToAll(): Promise<void> {
    for (const type of [
      "friends_or_family",
      "maintenance",
      "property_or_lodger",
      "pension",
      "student_finance",
      "other",
    ]) {
      await this.answer(type, false);
    }
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

export class PropertyPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectOwnership(value: string): Promise<void> {
    await this.page
      .locator(`input[name="property_owned"][value="${value}"]`)
      .check();
  }
}

export class PropertyEntryPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fill(details: {
    homeValue: string;
    mortgage?: string;
    percentageOwned: string;
  }): Promise<void> {
    await this.page.locator("#house_value").fill(details.homeValue);
    if (details.mortgage !== undefined) {
      await this.page.locator("#mortgage").fill(details.mortgage);
    }
    await this.page.locator("#percentage_owned").fill(details.percentageOwned);
  }
}

export class AdditionalPropertyPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async selectOwnership(value: string): Promise<void> {
    await this.page
      .locator(`input[name="additional_property_owned"][value="${value}"]`)
      .check();
  }
}

export class AdditionalPropertyDetailsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fillRow(
    index: number,
    details: {
      value: string;
      percentageOwned: string;
      mortgage?: string;
      inlineMortgage?: boolean;
    },
  ): Promise<void> {
    await this.page
      .locator(`#additional_properties_${index}_house_value`)
      .fill(details.value);
    await this.page
      .locator(`#additional_properties_${index}_percentage_owned`)
      .fill(details.percentageOwned);

    if (index === 0 && details.mortgage !== undefined) {
      await this.page
        .locator("#additional_properties_0_mortgage")
        .fill(details.mortgage);
    } else if (index > 0 && details.inlineMortgage !== undefined) {
      await this.page
        .locator(
          `input[name="additional_properties_${index}_inline_owned_with_mortgage"][value="${String(details.inlineMortgage)}"]`,
        )
        .check();
      if (details.inlineMortgage && details.mortgage !== undefined) {
        await this.page
          .locator(`#additional_properties_${index}_mortgage`)
          .fill(details.mortgage);
      }
    }
  }

  async addAnother(): Promise<void> {
    await this.page
      .getByRole("button", {
        name: "Add another property, holiday home or land",
      })
      .click();
  }
}
