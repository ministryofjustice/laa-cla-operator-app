// Port of CCQ's `Cfe::RegularTransactionsPayloadService` +
// `CfeParamBuilders::RegularTransactions`. `buildRegularTransactions` is
// shared between the client and partner sections (CCQ's own
// `CfeParamBuilders::RegularTransactions.call` is already form-agnostic);
// only the client ever supplies a housing form, since `partner.ts` never
// passes one.
import type { Answers } from "../logic.js";
import {
  asArray,
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
  assumeType,
} from "./types.js";
import type { BenefitItem, RegularTransactionPayload } from "./types.js";

const ZERO = 0;
const PENCE_PER_POUND = 100;

/** Ported from `CfeParamBuilders::RegularTransactions::CFE_FREQUENCIES`. A
 * different vocabulary from employment-income.ts's `FREQUENCY_TRANSLATIONS`:
 * this one is used for outgoings/other-income/benefits/housing fields. */
const CFE_FREQUENCIES: Readonly<Record<string, string>> = {
  every_week: "weekly",
  every_two_weeks: "two_weekly",
  every_four_weeks: "four_weekly",
  monthly: "monthly",
  total: "three_monthly",
};

/**
 * Translates a CCQ regular-transaction frequency to the equivalent CFE one.
 * @param {string} frequency - a CCQ regular-transaction frequency
 * @returns {string} the equivalent CFE frequency
 */
function translateFrequency(frequency: string): string {
  return CFE_FREQUENCIES[frequency];
}

/** The normalised other-income fields the income payments builder reads. */
export interface OtherIncomeFields {
  friends_or_family_relevant?: boolean;
  friends_or_family_conditional_value?: number;
  friends_or_family_frequency?: string;
  maintenance_relevant?: boolean;
  maintenance_conditional_value?: number;
  maintenance_frequency?: string;
  property_or_lodger_relevant?: boolean;
  property_or_lodger_conditional_value?: number;
  property_or_lodger_frequency?: string;
  pension_relevant?: boolean;
  pension_conditional_value?: number;
  pension_frequency?: string;
}

/** The normalised outgoings fields the outgoings payments builder reads. */
export interface OutgoingsFields {
  childcare_payments_relevant?: boolean;
  childcare_payments_conditional_value?: number;
  childcare_payments_frequency?: string;
  maintenance_payments_relevant?: boolean;
  maintenance_payments_conditional_value?: number;
  maintenance_payments_frequency?: string;
  legal_aid_payments_relevant?: boolean;
  legal_aid_payments_conditional_value?: number;
  legal_aid_payments_frequency?: string;
}

/** One category's relevant/conditional-value/frequency field names, local to this file. */
interface FieldNames {
  category: string;
  relevant: string;
  conditionalValue: string;
  frequency: string;
}

const INCOME_FIELDS: readonly FieldNames[] = [
  {
    category: "friends_or_family",
    relevant: "friends_or_family_relevant",
    conditionalValue: "friends_or_family_conditional_value",
    frequency: "friends_or_family_frequency",
  },
  {
    category: "maintenance_in",
    relevant: "maintenance_relevant",
    conditionalValue: "maintenance_conditional_value",
    frequency: "maintenance_frequency",
  },
  {
    category: "property_or_lodger",
    relevant: "property_or_lodger_relevant",
    conditionalValue: "property_or_lodger_conditional_value",
    frequency: "property_or_lodger_frequency",
  },
  {
    category: "pension",
    relevant: "pension_relevant",
    conditionalValue: "pension_conditional_value",
    frequency: "pension_frequency",
  },
];

const OUTGOINGS_FIELDS: readonly FieldNames[] = [
  {
    category: "child_care",
    relevant: "childcare_payments_relevant",
    conditionalValue: "childcare_payments_conditional_value",
    frequency: "childcare_payments_frequency",
  },
  {
    category: "maintenance_out",
    relevant: "maintenance_payments_relevant",
    conditionalValue: "maintenance_payments_conditional_value",
    frequency: "maintenance_payments_frequency",
  },
  {
    category: "legal_aid",
    relevant: "legal_aid_payments_relevant",
    conditionalValue: "legal_aid_payments_conditional_value",
    frequency: "legal_aid_payments_frequency",
  },
];

/**
 * Reads a conditional value, which is only present when its "relevant"
 * question was answered yes. Ported from `CfeParamBuilders::RegularTransactions.value`.
 * @param {Record<string, unknown>} form - the form's fields, keyed by name
 * @param {FieldNames} fieldNames - this category's field names
 * @returns {number} the value, or zero if not relevant
 */
function fieldValue(
  form: Record<string, unknown>,
  fieldNames: FieldNames,
): number {
  if (form[fieldNames.relevant] !== true) return ZERO;
  return asOptionalNumber(form[fieldNames.conditionalValue]) ?? ZERO;
}

/**
 * Builds the regular payments for one set of categories (other income or
 * outgoings). Ported from `CfeParamBuilders::RegularTransactions.build_payments`.
 * @param {readonly FieldNames[]} fields - the categories to build payments for
 * @param {Record<string, unknown> | undefined} form - the form's fields, if relevant
 * @param {"credit" | "debit"} operation - whether these are credits or debits
 * @returns {RegularTransactionPayload[]} the built payments
 */
function buildPayments(
  fields: readonly FieldNames[],
  form: Record<string, unknown> | undefined,
  operation: "credit" | "debit",
): RegularTransactionPayload[] {
  if (form === undefined) return [];

  return fields
    .filter((fieldNames) => fieldValue(form, fieldNames) > ZERO)
    .map((fieldNames) => ({
      operation,
      category: fieldNames.category,
      frequency: translateFrequency(assumeType<string>(form[fieldNames.frequency])),
      amount: fieldValue(form, fieldNames),
    }));
}

/** The client's housing form, discriminated by which of the three housing
 * steps is relevant — CCQ dispatches on the form's Ruby class instead. */
export type HousingForm =
  | {
      kind: "mortgage_or_loan_payment";
      housing_loan_payments?: number;
      housing_payments_loan_frequency?: string;
    }
  | {
      kind: "housing_costs";
      housing_payments?: number;
      housing_payments_frequency?: string;
      housing_benefit_relevant?: boolean;
      housing_benefit_frequency?: string;
      housing_benefit_value?: number;
    }
  | {
      kind: "shared_ownership_housing_costs";
      combined_rent_and_mortgage: number;
      combined_frequency?: string;
      housing_benefit_relevant?: boolean;
      housing_benefit_frequency?: string;
      housing_benefit_value?: number;
    };

/**
 * Rounds an amount to the nearest penny, matching Ruby's `.round(2)` on the
 * shared-ownership combined rent-and-mortgage figure.
 * @param {number} value - an amount in pounds
 * @returns {number} the amount rounded to the nearest penny
 */
export function roundToPence(value: number): number {
  return Math.round(value * PENCE_PER_POUND) / PENCE_PER_POUND;
}

/**
 * Builds the single housing (rent or mortgage) payment, if the housing
 * amount is positive. Ported from
 * `CfeParamBuilders::RegularTransactions.build_housing_payments`.
 * @param {HousingForm | undefined} housingForm - the relevant housing form, if any
 * @returns {RegularTransactionPayload[]} the housing payment, if any
 */
function buildHousingPayments(
  housingForm: HousingForm | undefined,
): RegularTransactionPayload[] {
  if (housingForm === undefined) return [];

  if (housingForm.kind === "mortgage_or_loan_payment") {
    const amount = housingForm.housing_loan_payments ?? ZERO;
    if (amount <= ZERO) return [];
    return [
      {
        operation: "debit",
        category: "rent_or_mortgage",
        frequency: translateFrequency(
          assumeType<string>(housingForm.housing_payments_loan_frequency),
        ),
        amount,
      },
    ];
  }

  if (housingForm.kind === "housing_costs") {
    const amount = housingForm.housing_payments ?? ZERO;
    if (amount <= ZERO) return [];
    return [
      {
        operation: "debit",
        category: "rent_or_mortgage",
        frequency: translateFrequency(
          assumeType<string>(housingForm.housing_payments_frequency),
        ),
        amount,
      },
    ];
  }

  const { combined_rent_and_mortgage: amount } = housingForm;
  if (amount <= ZERO) return [];
  return [
    {
      operation: "debit",
      category: "rent_or_mortgage",
      frequency: translateFrequency(
        assumeType<string>(housingForm.combined_frequency),
      ),
      amount,
    },
  ];
}

/**
 * Builds the benefit payments, if any were recorded. Ported from
 * `CfeParamBuilders::RegularTransactions.build_benefits`.
 * @param {BenefitItem[] | undefined} benefits - the saved benefit rows, if relevant
 * @returns {RegularTransactionPayload[]} the benefit payments
 */
function buildBenefits(
  benefits: BenefitItem[] | undefined,
): RegularTransactionPayload[] {
  if (benefits === undefined) return [];
  return benefits.map((benefit) => ({
    operation: "credit",
    category: "benefits",
    frequency: translateFrequency(benefit.benefit_frequency),
    amount: benefit.benefit_amount,
  }));
}

/**
 * Builds the housing benefit payment. Only two of the three housing steps
 * (`housing_costs`, `shared_ownership_housing_costs`) carry a housing
 * benefit question at all — `mortgage_or_loan_payment` does not, matching
 * the real-world distinction that housing benefit is a rental-support
 * benefit, while mortgage-or-loan-payment is for people who own their home.
 * Ported from `CfeParamBuilders::RegularTransactions.build_housing_benefits`.
 * @param {HousingForm | undefined} housingForm - the relevant housing form, if any
 * @returns {RegularTransactionPayload[]} the housing benefit payment, if any
 */
function buildHousingBenefits(
  housingForm: HousingForm | undefined,
): RegularTransactionPayload[] {
  if (housingForm === undefined || housingForm.kind === "mortgage_or_loan_payment") {
    return [];
  }
  if (housingForm.housing_benefit_relevant !== true) return [];

  return [
    {
      operation: "credit",
      category: "housing_benefit",
      frequency: translateFrequency(
        assumeType<string>(housingForm.housing_benefit_frequency),
      ),
      amount: housingForm.housing_benefit_value ?? ZERO,
    },
  ];
}

/** The forms a regular-transactions section is built from. */
export interface RegularTransactionsForms {
  incomeForm?: OtherIncomeFields;
  outgoingsForm?: OutgoingsFields;
  benefits?: BenefitItem[];
  housingForm?: HousingForm;
}

/**
 * Builds the `regular_transactions` list for a client or partner: other
 * income, outgoings, housing payment, benefits, and housing benefit, in
 * that order. Ported from `CfeParamBuilders::RegularTransactions.call`.
 * @param {RegularTransactionsForms} forms - the relevant forms for this section
 * @returns {RegularTransactionPayload[]} the regular transactions
 */
export function buildRegularTransactions(
  forms: RegularTransactionsForms,
): RegularTransactionPayload[] {
  return [
    ...buildPayments(
      INCOME_FIELDS,
      assumeType<Record<string, unknown> | undefined>(forms.incomeForm),
      "credit",
    ),
    ...buildPayments(
      OUTGOINGS_FIELDS,
      assumeType<Record<string, unknown> | undefined>(forms.outgoingsForm),
      "debit",
    ),
    ...buildHousingPayments(forms.housingForm),
    ...buildBenefits(forms.benefits),
    ...buildHousingBenefits(forms.housingForm),
  ];
}

/**
 * Determines which housing form (if any) is relevant, and builds its
 * normalised fields. Ported from the housing-form selection in
 * `Cfe::RegularTransactionsPayloadService`.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {HousingForm | undefined} the relevant housing form, if any
 */
function buildHousingForm(
  answers: Answers,
  relevantSteps: Set<string>,
): HousingForm | undefined {
  if (relevantSteps.has("mortgage_or_loan_payment")) {
    return {
      kind: "mortgage_or_loan_payment",
      housing_loan_payments: asOptionalNumber(answers.housing_loan_payments),
      housing_payments_loan_frequency: asOptionalString(
        answers.housing_payments_loan_frequency,
      ),
    };
  }
  if (relevantSteps.has("shared_ownership_housing_costs")) {
    const rent = asOptionalNumber(answers.rent) ?? ZERO;
    const mortgage = asOptionalNumber(answers.shared_ownership_mortgage) ?? ZERO;
    return {
      kind: "shared_ownership_housing_costs",
      combined_rent_and_mortgage: roundToPence(rent + mortgage),
      combined_frequency: asOptionalString(answers.combined_frequency),
      housing_benefit_relevant: asOptionalBoolean(
        answers.housing_benefit_relevant,
      ),
      housing_benefit_frequency: asOptionalString(
        answers.housing_benefit_frequency,
      ),
      housing_benefit_value: asOptionalNumber(answers.housing_benefit_value),
    };
  }
  if (relevantSteps.has("housing_costs")) {
    return {
      kind: "housing_costs",
      housing_payments: asOptionalNumber(answers.housing_payments),
      housing_payments_frequency: asOptionalString(
        answers.housing_payments_frequency,
      ),
      housing_benefit_relevant: asOptionalBoolean(
        answers.housing_benefit_relevant,
      ),
      housing_benefit_frequency: asOptionalString(
        answers.housing_benefit_frequency,
      ),
      housing_benefit_value: asOptionalNumber(answers.housing_benefit_value),
    };
  }
  return undefined;
}

/**
 * Builds the `regular_transactions` section of a CFE payload for the
 * client, if any of outgoings, other income, housing or benefits is
 * relevant. Ported from `Cfe::RegularTransactionsPayloadService`.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {RegularTransactionPayload[] | undefined} the regular transactions, if relevant
 */
export function buildRegularTransactionsSection(
  answers: Answers,
  relevantSteps: Set<string>,
): RegularTransactionPayload[] | undefined {
  const relevant =
    relevantSteps.has("outgoings") ||
    relevantSteps.has("other_income") ||
    relevantSteps.has("mortgage_or_loan_payment") ||
    relevantSteps.has("housing_costs") ||
    relevantSteps.has("shared_ownership_housing_costs") ||
    relevantSteps.has("benefit_details");
  if (!relevant) return undefined;

  return buildRegularTransactions({
    incomeForm: relevantSteps.has("other_income")
      ? assumeType<OtherIncomeFields>(answers)
      : undefined,
    outgoingsForm: relevantSteps.has("outgoings")
      ? assumeType<OutgoingsFields>(answers)
      : undefined,
    benefits: relevantSteps.has("benefit_details")
      ? asArray<BenefitItem>(answers.benefits)
      : undefined,
    housingForm: buildHousingForm(answers, relevantSteps),
  });
}
