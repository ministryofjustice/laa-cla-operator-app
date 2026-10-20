import { ConditionRegistry } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import { stepsFor } from "../domain/navigation.js";
import type { Answers } from "../domain/logic.js";
import { netIncomeIsPositive } from "../domain/income.js";
import { dependantIncomeBelowLimit } from "../domain/dependant-income-limits.js";
import {
  annualHousingPayments,
  annualSharedOwnershipPayments,
  combinedPaymentNeedsFrequency,
  housingBenefitWithinCosts,
} from "../domain/housing-benefit.js";

export interface EligibilityConditionShape {
  // Type assertion needed due to Forge's condition typing incompatibility
  // The condition correctly checks step relevance at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  StepIsRelevant: (stepCode: string) => any;
}

const EligibilityConditionsImplementation = {
  /**
   * Checks if a step is relevant based on current answers.
   * @param stepCode - The step code to check
   * @returns A function that evaluates step relevance
   */
  StepIsRelevant:
    (stepCode: string) =>
    (_deps: EligibilityDeps) =>
    (answers: Answers): boolean => {
      const relevantSteps = stepsFor(answers);
      return relevantSteps.includes(stepCode);
    },
};

export const EligibilityConditionsRegistry =
  new ConditionRegistry<EligibilityDeps>();

export const EligibilityConditions: EligibilityConditionShape = {
  /**
   * Registers a condition to check if a step is relevant.
   * @param stepCode - The step code to check
   * @returns The registered condition
   */
  StepIsRelevant: (stepCode: string) =>
    EligibilityConditionsRegistry.register(
      `StepIsRelevant_${stepCode}`,
      EligibilityConditionsImplementation.StepIsRelevant(stepCode),
    ),
};

/**
 * Passes when the income in the field, less the tax and National Insurance
 * answers given, is still positive. See `netIncomeIsPositive`.
 */
export const NetIncomeIsPositive = EligibilityConditionsRegistry.register(
  "NetIncomeIsPositive",
  () => (gross: unknown, tax: unknown, nationalInsurance: unknown) =>
    netIncomeIsPositive(gross, tax, nationalInsurance),
);

/** Whether a dependant's income is below CCQ's frequency-specific ceiling. */
export const DependantIncomeBelowLimit = EligibilityConditionsRegistry.register(
  "DependantIncomeBelowLimit",
  () => (amount: unknown, frequency: unknown) =>
    dependantIncomeBelowLimit(amount, frequency),
);

/**
 * Passes when the Housing Benefit in the field is no more than the annual
 * housing payments on the housing costs step. See `housingBenefitWithinCosts`.
 */
export const HousingBenefitWithinHousingPayments =
  EligibilityConditionsRegistry.register(
    "HousingBenefitWithinHousingPayments",
    () =>
      (
        benefitValue: unknown,
        benefitFrequency: unknown,
        payments: unknown,
        paymentsFrequency: unknown,
      ) =>
        housingBenefitWithinCosts(
          benefitValue,
          benefitFrequency,
          annualHousingPayments(payments, paymentsFrequency),
        ),
  );

/**
 * Passes when the Housing Benefit in the field is no more than the annual
 * rent and mortgage on the shared ownership step.
 */
export const HousingBenefitWithinSharedOwnershipPayments =
  EligibilityConditionsRegistry.register(
    "HousingBenefitWithinSharedOwnershipPayments",
    () =>
      (
        benefitValue: unknown,
        benefitFrequency: unknown,
        rent: unknown,
        mortgage: unknown,
        combinedFrequency: unknown,
      ) =>
        housingBenefitWithinCosts(
          benefitValue,
          benefitFrequency,
          annualSharedOwnershipPayments(rent, mortgage, combinedFrequency),
        ),
  );

/**
 * Passes when the rent in the field and the given mortgage payment add up to
 * more than nothing, so need a frequency. See `combinedPaymentNeedsFrequency`.
 */
export const CombinedPaymentNeedsFrequency =
  EligibilityConditionsRegistry.register(
    "CombinedPaymentNeedsFrequency",
    () => (rent: unknown, mortgage: unknown) =>
      combinedPaymentNeedsFrequency(rent, mortgage),
  );
