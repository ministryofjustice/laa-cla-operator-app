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

export class OutgoingsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async answer(
    type: string,
    payment?: { amount: string; frequency: string },
  ): Promise<void> {
    const code = `${type}_payments`;
    await this.page
      .locator(
        `input[name="${code}_relevant"][value="${String(payment !== undefined)}"]`,
      )
      .check();
    if (payment === undefined) return;
    await this.page.locator(`#${code}_conditional_value`).fill(payment.amount);
    await this.page
      .locator(`input[name="${code}_frequency"][value="${payment.frequency}"]`)
      .check();
  }
}

export class HousingCostsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fillPayments(amount: string, frequency?: string): Promise<void> {
    await this.page.locator("#housing_payments").fill(amount);
    if (frequency !== undefined) {
      await this.page
        .locator(
          `input[name="housing_payments_frequency"][value="${frequency}"]`,
        )
        .check();
    }
  }

  async answerHousingBenefit(benefit?: {
    amount: string;
    frequency: string;
  }): Promise<void> {
    await this.page
      .locator(
        `input[name="housing_benefit_relevant"][value="${String(benefit !== undefined)}"]`,
      )
      .check();
    if (benefit === undefined) return;
    await this.page.locator("#housing_benefit_value").fill(benefit.amount);
    await this.page
      .locator(
        `input[name="housing_benefit_frequency"][value="${benefit.frequency}"]`,
      )
      .check();
  }
}

export class DependantsDetailsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async answer(
    code: "child_dependants" | "adult_dependants",
    hasDependants: boolean,
  ): Promise<void> {
    await this.page
      .locator(`input[name="${code}"][value="${String(hasDependants)}"]`)
      .check();
  }

  async enterCount(
    code: "child_dependants_count" | "adult_dependants_count",
    count: string,
  ): Promise<void> {
    await this.page.locator(`#${code}`).fill(count);
  }
}

export class DependantIncomePage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async answer(hasIncome: boolean): Promise<void> {
    await this.page
      .locator(
        `input[name="dependants_get_income"][value="${String(hasIncome)}"]`,
      )
      .check();
  }
}

export class DependantIncomeDetailsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fillRow(
    index: number,
    income: { amount: string; frequency: string },
  ): Promise<void> {
    await this.page
      .locator(
        `input[name="dependant_incomes_${index}_frequency"][value="${income.frequency}"]`,
      )
      .check();
    await this.page
      .locator(`#dependant_incomes_${index}_amount`)
      .fill(income.amount);
  }
}

export class AssetsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fillBankAccount(index: number, amount: string): Promise<void> {
    await this.page.locator(`#bank_accounts_${index}_amount`).fill(amount);
  }

  async addBankAccount(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Add another bank account" })
      .click();
  }

  async answer(
    asset: "investments" | "valuables",
    amount: string | undefined,
  ): Promise<void> {
    await this.page
      .locator(
        `input[name="${asset}_relevant"][value="${String(amount !== undefined)}"]`,
      )
      .check();
    if (amount !== undefined) {
      await this.page.locator(`#${asset}`).fill(amount);
    }
  }
}

export class VehiclePage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async answer(owned: boolean): Promise<void> {
    await this.page
      .locator(`input[name="vehicle_owned"][value="${String(owned)}"]`)
      .check();
  }
}

export class VehiclesDetailsPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  async fillRow(
    index: number,
    vehicle: {
      value: string;
      finance?: string;
      overThreeYearsOld: boolean;
      inRegularUse: boolean;
    },
  ): Promise<void> {
    const radio = (field: string, value: boolean) =>
      this.page.locator(
        `input[name="vehicles_${index}_${field}"][value="${String(value)}"]`,
      );
    await this.page
      .locator(`#vehicles_${index}_vehicle_value`)
      .fill(vehicle.value);
    await radio("vehicle_pcp", vehicle.finance !== undefined).check();
    if (vehicle.finance !== undefined) {
      await this.page
        .locator(`#vehicles_${index}_vehicle_finance`)
        .fill(vehicle.finance);
    }
    await radio("vehicle_over_3_years_ago", vehicle.overThreeYearsOld).check();
    await radio("vehicle_in_regular_use", vehicle.inRegularUse).check();
  }

  async addAnother(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Add another vehicle" })
      .click();
  }
}
