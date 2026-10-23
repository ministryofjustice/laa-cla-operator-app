import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core";
import type {
  FinancialEligibilityEffectsWithDeps,
  Deps,
} from "#packages/financial-eligibility-journey/src/api.js";
import {
  bankBalanceField as savingsBankBalanceField,
  investmentBalanceField as savingsInvestmentBalanceField,
  assetBalanceField as savingsAssetBalanceField,
  creditBalanceField as savingsCreditBalanceField,
} from "#packages/financial-eligibility-journey/src/savingsPage/savingsBlock.js";
import {
  bankBalanceField as disputedBankBalanceField,
  investmentBalanceField as disputedInvestmentBalanceField,
  assetBalanceField as disputedAssetBalanceField,
  creditBalanceField as disputedCreditBalanceField,
} from "#packages/financial-eligibility-journey/src/disputedSavingsPage/disputedSavingsBlock.js";
import {
  bankBalanceField as partnerBankBalanceField,
  investmentBalanceField as partnerInvestmentBalanceField,
  assetBalanceField as partnerAssetBalanceField,
  creditBalanceField as partnerCreditBalanceField,
} from "#packages/financial-eligibility-journey/src/partnerSavingsPage/partnerSavingsBlock.js";
import {
  propertyMarketValueFieldPrefix,
  propertyMortgageLeftFieldPrefix,
} from "#packages/financial-eligibility-journey/src/propertiesPage/propertiesBlock.js";
import { getOrMigrateCasePatternDrafts } from "#packages/financial-eligibility-journey/src/casePatternDrafts.js";
import type { FinancialEligibilitySession } from "#packages/financial-eligibility-journey/src/context.type.js";
import {
  under18Step,
  under18HasValuablesStep,
  under18RegularPaymentStep,
  partnerStep,
  over60Step,
  over60StepWithPartnerStep,
  disregardsStep,
} from "#packages/financial-eligibility-journey/src/index.js";
import type {
  FinancialEligibilityData,
  IncomeData,
  DeductionData,
} from "#types/api-types.js";
import {
  devLog,
  devError,
  devWarn,
  normaliseSelectedCheckbox,
  normaliseSelectedKeys,
  toYesNo,
  toBoolean,
  toNumber,
} from "#src/scripts/helpers/index.js";
import { transformFinancialEligibilityItem } from "#src/services/api/transforms/transformFinancialEligibility.js";
import { under18RegularPaymentField } from "#packages/financial-eligibility-journey/src/under18RegularPaymentPage/under18RegularPaymentBlock.js";
import { under18Field } from "#packages/financial-eligibility-journey/src/under18Page/under18Block.js";
import { under18HasValuablesField } from "#packages/financial-eligibility-journey/src/under18HasValuablesPage/under18HasValuablesBlock.js";
import { over60Field } from "#packages/financial-eligibility-journey/src/over60Page/over60Block.js";
import { over60WithPartnerField } from "#packages/financial-eligibility-journey/src/over60PWithPartnerPage/over60WithPartnerBlock.js";
import {
  incomeSupportField,
  universalCreditField,
  incomeBasedJSAField,
  pensionCreditField,
  employmentSupportField,
} from "#packages/financial-eligibility-journey/src/benefitsPage/benefitsBlock.js";
import { partnerField } from "#packages/financial-eligibility-journey/src/partnerPage/partnerBlock.js";
import { disregardsField } from "#packages/financial-eligibility-journey/src/disregardsPage/disregardsBlock.js";
import {
  dependants15UnderField,
  dependants16OverField,
} from "#packages/financial-eligibility-journey/src/dependantsPage/dependantsBlock.js";
import { selfEmployedField } from "#packages/financial-eligibility-journey/src/incomePage/incomeBlock.js";
import { selfEmployedPartnerField } from "#packages/financial-eligibility-journey/src/partnerIncomePage/partnerIncomeBlock.js";

const MONETARY_FIELDS = new Set([
  savingsBankBalanceField.code,
  savingsInvestmentBalanceField.code,
  savingsAssetBalanceField.code,
  savingsCreditBalanceField.code,
  disputedBankBalanceField.code,
  disputedInvestmentBalanceField.code,
  disputedAssetBalanceField.code,
  disputedCreditBalanceField.code,
  partnerBankBalanceField.code,
  partnerInvestmentBalanceField.code,
  partnerAssetBalanceField.code,
  partnerCreditBalanceField.code,
]);

const MONETARY_FIELDS_PREFIXES = new Set([
  propertyMarketValueFieldPrefix,
  propertyMortgageLeftFieldPrefix,
]);

/**
 * Utility function to map answer codes to API field names for financial eligibility data
 * @param {string} answerCode - The code of the answer to map
 * @returns {string | null} The corresponding API field name, or null if no mapping exists
 */
function mapAnswerCodeToApiField(answerCode: string): string | null {
  const mapping: Record<string, string> = {
    [under18Field.code as string]: "is_you_under_18",
    [under18RegularPaymentField.code as string]:
      "under_18_receive_regular_payment",
    [under18HasValuablesField.code as string]: "under_18_has_valuables",
    [partnerField.code as string]: "has_partner",
    [over60Step.code]: "is_you_or_your_partner_over_60",
    [over60StepWithPartnerStep.code]: "is_you_or_your_partner_over_60",
    "universal-credit": "universal_credit",
    "income-support": "income_support",
    "income-based-jsa": "job_seekers_allowance",
    "pension-credit": "pension_credit",
    "employment-support": "employment_support",
    propertySet: "property_set",
    "bank-balance": "bank_balance",
    "investment-balance": "investment_balance",
    "asset-balance": "asset_balance",
    "credit-balance": "credit_balance",
    "bank-balance-partner": "bank_balance",
    "investment-balance-partner": "investment_balance",
    "asset-balance-partner": "asset_balance",
    "credit-balance-partner": "credit_balance",
    "bank-balance-disputed": "bank_balance",
    "investment-balance-disputed": "investment_balance",
    "asset-balance-disputed": "asset_balance",
    "credit-balance-disputed": "credit_balance",
    "dependants-16-over": "dependants_old",
    "dependants-15-under": "dependants_young",
    [disregardsStep.code]: "disregards",
  };

  return mapping[answerCode] || null;
}

/**
 * Utility function to map financial eligibility API data to answer codes for use in the Forge journey
 * @param {FinancialEligibilityData} financialEligibilityData - The financial eligibility data from the API
 * @returns {Record<string, unknown>} A record mapping step codes to their corresponding values
 */
export function mapFinancialEligibilityApiDataToAnswerCodes(
  financialEligibilityData: FinancialEligibilityData,
): Record<string, unknown> {
  return {
    category: financialEligibilityData.category,
    [under18Step.code]: financialEligibilityData.isUnder17,
    [under18RegularPaymentStep.code]:
      financialEligibilityData.under18RegularPayment,
    [under18HasValuablesStep.code]:
      financialEligibilityData.under18HasValuables,
    [partnerStep.code]: financialEligibilityData.hasPartner,
    [over60Step.code]: financialEligibilityData.isOver60,
    [over60StepWithPartnerStep.code]: financialEligibilityData.isOver60,
    "universal-credit":
      financialEligibilityData.specificBenefits.universalCredit,
    "income-support": financialEligibilityData.specificBenefits.incomeSupport,
    "income-based-jsa": financialEligibilityData.specificBenefits.jobSeekers,
    "pension-credit": financialEligibilityData.specificBenefits.pensionCredit,
    "employment-support":
      financialEligibilityData.specificBenefits.employmentSupport,
    propertySet: financialEligibilityData.propertySet,
    "bank-balance": financialEligibilityData.clientData.savings?.bankBalance,
    "investment-balance":
      financialEligibilityData.clientData.savings?.investmentBalance,
    "asset-balance": financialEligibilityData.clientData.savings?.assetBalance,
    "credit-balance":
      financialEligibilityData.clientData.savings?.creditBalance,
    "bank-balance-partner":
      financialEligibilityData.partnerData.partnerSavings?.bankBalance,
    "investment-balance-partner":
      financialEligibilityData.partnerData.partnerSavings?.investmentBalance,
    "asset-balance-partner":
      financialEligibilityData.partnerData.partnerSavings?.assetBalance,
    "credit-balance-partner":
      financialEligibilityData.partnerData.partnerSavings?.creditBalance,
    "bank-balance-disputed":
      financialEligibilityData.disputedSavings?.bankBalance,
    "investment-balance-disputed":
      financialEligibilityData.disputedSavings?.investmentBalance,
    "asset-balance-disputed":
      financialEligibilityData.disputedSavings?.assetBalance,
    "credit-balance-disputed":
      financialEligibilityData.disputedSavings?.creditBalance,
    disregards: financialEligibilityData.disregards,
    "dependants-16-over": financialEligibilityData.dependantsOld,
    "dependants-15-under": financialEligibilityData.dependantsYoung,
    "self-employed": financialEligibilityData.clientData.income?.selfEmployed,
    "self-employed-partner":
      financialEligibilityData.partnerData.partnerIncome?.selfEmployed,
    ...mapMoneyFieldsToStepCodes(
      incomeMoneyFields,
      financialEligibilityData.clientData.income,
      "",
    ),
    ...mapMoneyFieldsToStepCodes(
      [...deductionsMoneyFields, legalAidContributionsField],
      financialEligibilityData.clientData.deductions,
      "",
    ),
    ...mapMoneyFieldsToStepCodes(
      incomeMoneyFields,
      financialEligibilityData.partnerData.partnerIncome,
      "-partner",
    ),
    ...mapMoneyFieldsToStepCodes(
      [...deductionsMoneyFields, legalAidContributionsField],
      financialEligibilityData.partnerData.partnerDeductions,
      "-partner",
    ),
  };
}

/**
 * Builds the flat step-code-keyed entries for a set of money fields (amount + paired frequency), reading
 * from the given IncomeData/DeductionData-shaped source. Frequency defaults to 'per_month' when not yet set.
 * @param {MoneyFieldMapping[]} fields - The money fields to map
 * @param {IncomeData | DeductionData | undefined} source - The IncomeData/DeductionData object to read amounts/frequencies from
 * @param {string} suffix - Suffix to append to each step code, e.g. '-partner'
 * @returns {Record<string, unknown>} A record mapping step codes (and their `-frequency` counterparts) to their values
 */
function mapMoneyFieldsToStepCodes(
  fields: MoneyFieldMapping[],
  source: IncomeData | DeductionData | undefined,
  suffix: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const sourceRecord = source as unknown as
    | Record<string, { amount: number | null; time: string | null } | undefined>
    | undefined;
  for (const { code, dataField } of fields) {
    const stepCode = `${code}${suffix}`;
    const moneyPerInterval = sourceRecord?.[dataField];
    result[stepCode] = moneyPerInterval?.amount ?? null;
    result[`${stepCode}-frequency`] = moneyPerInterval?.time ?? "per_month";
  }
  return result;
}

/**
 * Normalises a property collection from Forge answers to a consistent format for API submission
 * @param {unknown} value - An array of property objects
 * @returns {Record<string, unknown>[]} - An array of property objects with consistent field names
 */
function normalisePropertyCollectionForForge(
  value: unknown,
): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const property = item as Record<string, unknown>;
    return {
      value: property.value ?? normaliseMonetaryFieldValue(property.value),
      "mortgage-left":
        property["mortgage-left"] ??
        normaliseMonetaryFieldValue(property.mortgageLeft),
      share: property.share,
      disputed: toYesNo(property.disputed),
      main: toYesNo(property.main),
    };
  });
}

/**
 * Normalises a monetary field value to a string with two decimal places, or returns undefined if the value is not a valid number
 * @param {unknown} value - The value to normalise
 * @returns {string | undefined} - The normalised monetary value or undefined
 */
function normaliseMonetaryFieldValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const numberValue =
    typeof value === "number" ? value : parseFloat(value as string);

  if (isNaN(numberValue)) {
    return undefined;
  }

  return Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(2);
}

/**
 * Extracts a property collection from Forge answers, checking both the explicit propertySet and indexed fields
 * @param {Record<string, unknown>} answers - The Forge answers object containing property data
 * @returns {Record<string, unknown>[]} - An array of property objects with consistent field names
 */
function getPropertyCollectionFromAnswers(
  answers: Record<string, unknown>,
): Array<Record<string, unknown>> {
  if (Array.isArray(answers.propertySet)) {
    return normalisePropertyCollectionForForge(answers.propertySet);
  }

  const grouped = new Map<number, Record<string, unknown>>();
  const allowedPropertyFields = new Set([
    "value",
    "mortgage-left",
    "share",
    "disputed",
    "main",
  ]);

  for (const [key, value] of Object.entries(answers)) {
    // Use `lastIndexOf(_)` to split each key e.g `value_1` becomes `value` and `1`
    const separatorIndex = key.lastIndexOf("_");

    // Skip keys that don't have invalid indices or match allowedPropertyFields
    if (separatorIndex <= 0 || separatorIndex === key.length - 1) {
      continue;
    }

    const fieldCode = key.slice(0, separatorIndex);
    if (!allowedPropertyFields.has(fieldCode)) {
      continue;
    }

    // Parse the index part of the key and make sure it's a valid non-negative integer
    const indexPart = key.slice(separatorIndex + 1);
    const index = Number(indexPart);
    if (!Number.isInteger(index) || index < 0) {
      continue;
    }

    // Group the values by index, creating a new object for each index if it doesn't already exist e.g [[0, {...}], [1, {...}], [2, {...}]]
    const existing = grouped.get(index) ?? {};
    existing[fieldCode] = value;
    grouped.set(index, existing);
  }

  // Sort the grouped entries by index and map them to an array of property objects with consistent field names
  return [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, item]) => ({
      value: item.value,
      "mortgage-left": item["mortgage-left"],
      share: item.share,
      disputed: toYesNo(item.disputed),
      main: toYesNo(item.main),
    }));
}

/**
 * Utility function to map API values to Forge answer values based on step codes
 * @param {unknown} apiValue - The value from the API to map
 * @param {string} stepCode - The code of the step to determine the mapping
 * @returns {unknown} The corresponding Forge answer value
 */
function mapApiValueToForgeValue(apiValue: unknown, stepCode: string): unknown {
  // Amount and frequency fields are simple passthroughs, for both the client and partner variants of each field
  const moneyFieldStepCodes = [
    ...incomeMoneyFields,
    ...deductionsMoneyFields,
    legalAidContributionsField,
  ].flatMap(({ code }) => [
    code,
    `${code}-frequency`,
    `${code}-partner`,
    `${code}-partner-frequency`,
  ]);
  const moneyFieldPassthrough = Object.fromEntries(
    moneyFieldStepCodes.map((code) => [code, apiValue]),
  );

  return {
    category: String(apiValue ?? "").toLowerCase(),
    [under18Field.code as string]: toYesNo(apiValue),
    [under18RegularPaymentField.code as string]: toYesNo(apiValue),
    [under18HasValuablesField.code as string]: toYesNo(apiValue),
    [partnerField.code as string]: toYesNo(apiValue),
    [over60Field.code as string]: toYesNo(apiValue),
    [over60WithPartnerField.code as string]: toYesNo(apiValue),
    [universalCreditField.code as string]: toYesNo(apiValue),
    [incomeSupportField.code as string]: toYesNo(apiValue),
    [incomeBasedJSAField.code as string]: toYesNo(apiValue),
    [pensionCreditField.code as string]: toYesNo(apiValue),
    [employmentSupportField.code as string]: toYesNo(apiValue),
    propertySet: normalisePropertyCollectionForForge(apiValue),
    [savingsBankBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [savingsInvestmentBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [savingsAssetBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [savingsCreditBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [partnerBankBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [partnerInvestmentBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [partnerAssetBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [partnerCreditBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [disputedBankBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [disputedInvestmentBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [disputedAssetBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [disputedCreditBalanceField.code as string]:
      normaliseMonetaryFieldValue(apiValue),
    [dependants16OverField.code as string]: apiValue,
    [dependants15UnderField.code as string]: apiValue,
    [selfEmployedField.code as string]: toYesNo(apiValue),
    [selfEmployedPartnerField.code as string]: toYesNo(apiValue),
    ...moneyFieldPassthrough,
    [disregardsField.code as string]:
      normaliseSelectedKeys(apiValue).length > 0
        ? normaliseSelectedKeys(apiValue)
        : ["none"],
  }[stepCode];
}

/**
 * Maps a Forge property collection to an API property set format
 * @param {Record<string, unknown>[]} collection - An array of property objects from Forge answers
 * @returns {Record<string, unknown>[]} - An array of property objects formatted for API submission
 */
function mapForgePropertyCollectionToApiPropertySet(
  collection: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return collection.map((item) => ({
    value: Math.round(toNumber(item.value) * 100),
    mortgage_left: Math.round(toNumber(item["mortgage-left"]) * 100),
    share: toNumber(item.share),
    disputed: toBoolean(item.disputed),
    main: toBoolean(item.main),
  }));
}

/**
 * Builds an `income` or `deductions` API section from a set of amount + frequency Forge answer pairs.
 * Fields are only included when the amount has been answered.
 * @param {Record<string, unknown>} answers - The user's answers keyed by step code
 * @param {MoneyFieldMapping[]} fields - The money fields to build (e.g. incomeMoneyFields, deductionsMoneyFields)
 * @param {string} suffix - Suffix to append to each step code, e.g. '-partner'
 * @returns {Record<string, unknown>} The API section, with each field as `{ per_interval_value, interval_period }`
 */
function mapMoneyFieldsToApiPayload(
  answers: Record<string, unknown>,
  fields: MoneyFieldMapping[],
  suffix: string,
): Record<string, unknown> {
  const section: Record<string, unknown> = {};

  for (const { code, apiField } of fields) {
    const stepCode = `${code}${suffix}`;
    if (!(stepCode in answers)) {
      continue;
    }

    section[apiField] = {
      per_interval_value: Math.round(toNumber(answers[stepCode]) * 100),
      interval_period: answers[`${stepCode}-frequency`] ?? "per_month",
    };
  }

  return section;
}

/**
 * Builds the `criminal_legalaid_contributions` deduction entry, which (unlike the other deduction fields) the
 * API stores as a flat pence number rather than a { per_interval_value, interval_period } object.
 * @param {Record<string, unknown>} answers - The user's answers keyed by step code
 * @param {string} suffix - Suffix to append to the step code, e.g. '-partner'
 * @returns {Record<string, unknown>} The deduction section entry, or an empty object when unanswered
 */
function mapLegalAidContributionsToApiPayload(
  answers: Record<string, unknown>,
  suffix: string,
): Record<string, unknown> {
  const stepCode = `${legalAidContributionsField.code}${suffix}`;
  if (!(stepCode in answers)) {
    return {};
  }

  return {
    [legalAidContributionsField.apiField]: Math.round(
      toNumber(answers[stepCode]) * 100,
    ),
  };
}

// The shapes/field names of the cla_backend eligibility_check API below have nothing to do with Forge
// answer codes (see `mapAnswerCodeToApiField` above) - kept separate to avoid confusing the two concerns.

/**
 * A money field's Forge step code, paired with the raw API field name (used when writing the update
 * payload) and the transformed data field name (used when reading from FinancialEligibilityData).
 */
interface MoneyFieldMapping {
  code: string;
  apiField: string;
  dataField: string;
}

// Income fields collected on the "Your income" / "Your partner's income" pages, keyed by API field name under `income`
const incomeMoneyFields: MoneyFieldMapping[] = [
  { code: "earnings", apiField: "earnings", dataField: "earnings" },
  {
    code: "self-employment-drawings",
    apiField: "self_employment_drawings",
    dataField: "selfEmploymentDrawings",
  },
  { code: "income-benefits", apiField: "benefits", dataField: "benefits" },
  { code: "tax-credits", apiField: "tax_credits", dataField: "taxCredits" },
  {
    code: "child-benefit",
    apiField: "child_benefits",
    dataField: "childBenefit",
  },
  {
    code: "maintenance-received",
    apiField: "maintenance_received",
    dataField: "maintenanceReceived",
  },
  { code: "pension-income", apiField: "pension", dataField: "pension" },
  { code: "other-income", apiField: "other_income", dataField: "otherIncome" },
];

// Deduction fields collected on the "Your income" / "Your partner's income" pages, keyed by API field name under `deductions`
const deductionsMoneyFields: MoneyFieldMapping[] = [
  { code: "income-tax", apiField: "income_tax", dataField: "incomeTax" },
  {
    code: "national-insurance",
    apiField: "national_insurance",
    dataField: "nationalInsurance",
  },
  // Collected on the "Your expenses" / "Your partner's expenses" pages, but share the same `you.deductions` /
  // `partner.deductions` API section as the two fields above, so they reuse the same mapping helpers.
  { code: "mortgage", apiField: "mortgage", dataField: "mortgage" },
  { code: "rent", apiField: "rent", dataField: "rent" },
  {
    code: "maintenance-paid",
    apiField: "maintenance",
    dataField: "maintenance",
  },
  { code: "childcare-costs", apiField: "childcare", dataField: "childcare" },
];

// Unlike the other deduction fields above, the API stores this as a flat pence number rather than a
// { per_interval_value, interval_period } object, so it needs its own mapping outside deductionsMoneyFields.
const legalAidContributionsField: MoneyFieldMapping = {
  code: "legal-aid-contributions",
  apiField: "criminal_legalaid_contributions",
  dataField: "criminalContributions",
};

// Savings API fields are stored as flat pence integers (not `{ per_interval_value, interval_period }`), unlike income/deductions
const savingsApiFields = [
  "bank_balance",
  "investment_balance",
  "asset_balance",
  "credit_balance",
];

// `specific_benefits` API fields, grouped together when reading benefit-related Forge answers
const benefitFields = [
  "universal_credit",
  "income_support",
  "job_seekers_allowance",
  "pension_credit",
  "employment_support",
];

// Forge step codes (not API field names) for the partner/disputed savings pages, which reuse `savingsApiFields`' API field names under different Forge step codes
const partnerSavingsFields = [
  "bank-balance-partner",
  "investment-balance-partner",
  "asset-balance-partner",
  "credit-balance-partner",
];
const disputedSavingsFields = [
  "bank-balance-disputed",
  "investment-balance-disputed",
  "asset-balance-disputed",
  "credit-balance-disputed",
];

// `dependants_old`/`dependants_young` API fields, grouped together for the AC1/AC2 zeroing rules
const dependantsFields = ["dependants_old", "dependants_young"];

/**
 * Builds a fully-zeroed `income` or `deductions` API section, e.g. `{ earnings: { per_interval_value: 0, interval_period: 'per_month' }, ... }`.
 * @param {MoneyFieldMapping[]} fields - The money fields to zero (incomeMoneyFields or deductionsMoneyFields)
 * @returns {Record<string, unknown>} The zeroed section
 */
function zeroMoneySection(
  fields: MoneyFieldMapping[],
): Record<string, unknown> {
  return Object.fromEntries(
    fields.map(({ apiField }) => [
      apiField,
      { per_interval_value: 0, interval_period: "per_month" },
    ]),
  );
}

/**
 * Builds a fully-zeroed `savings` API section. Unlike income/deductions, savings fields are flat pence integers.
 * @returns {Record<string, unknown>} The zeroed savings section
 */
function zeroSavingsSection(): Record<string, unknown> {
  return Object.fromEntries(savingsApiFields.map((field) => [field, 0]));
}

/**
 * Zeroes a `you`/`partner` section's `income` and `deductions` (and optionally `savings`) in place on the
 * payload, including the two non-interval fields `self_employed` and `criminal_legalaid_contributions`.
 * @param {Record<string, unknown>} payload - The API payload to mutate
 * @param {'you' | 'partner'} personKey - Which payload section to zero
 * @param {{ includeSavings: boolean }} options - Whether to also zero the `savings` section
 */
function zeroPersonMoneySections(
  payload: Record<string, unknown>,
  personKey: "you" | "partner",
  { includeSavings }: { includeSavings: boolean },
): void {
  const person = {
    ...(payload[personKey] as Record<string, unknown> | undefined),
  };
  person.income = {
    ...zeroMoneySection(incomeMoneyFields),
    self_employed: false,
  };
  person.deductions = {
    ...zeroMoneySection(deductionsMoneyFields),
    criminal_legalaid_contributions: 0,
  };
  if (includeSavings) {
    person.savings = zeroSavingsSection();
  }
  payload[personKey] = person;
}

/**
 * Applies the "non-required section" defaults expected by cla_backend/CFE Civil: fields hidden from the
 * user because they're not part of the means assessment (under-18 passported, on a passported benefit, or
 * no partner) must be sent as zeroed values rather than left as stale/incidental drafts, so completeness
 * checks and the eligibility calculation behave correctly.
 * @param {Record<string, unknown>} payload - The API payload built so far by mapAnswersToApiPayload, mutated in place
 * @param {{ under18Passported: unknown, onPassportedBenefits: unknown, hasPartner: unknown }} gates - The already-computed values that decide which sections to zero
 */
export function applyNonRequiredSectionDefaults(
  payload: Record<string, unknown>,
  {
    under18Passported,
    onPassportedBenefits,
    hasPartner,
  }: {
    under18Passported: unknown;
    onPassportedBenefits: unknown;
    hasPartner: unknown;
  },
): void {
  // AC1: under-18 passported - finances, income, expenses, benefits, disregards and the over-60 question
  // are all hidden from the user, so any remaining fields not otherwise zeroed above are sent as null
  if (under18Passported === true) {
    zeroPersonMoneySections(payload, "you", { includeSavings: true });
    // partner's finances are hidden on check-answers whenever under18Passported, regardless of has_partner
    zeroPersonMoneySections(payload, "partner", { includeSavings: true });
    payload.property_set = [];
    // cla_backend ignores an explicit null for disputed_savings on PATCH, so zero it like savings instead
    payload.disputed_savings = zeroSavingsSection();
    payload.dependants_old = 0;
    payload.dependants_young = 0;
    payload.specific_benefits = null;
    payload.disregards = null;
    payload.is_you_or_your_partner_over_60 = null;
    // the partner question is skipped entirely when under18Passported, so default has_partner to null
    // when it was never answered (a genuine stale yes/no from an earlier path is left untouched)
    if (hasPartner === undefined) {
      payload.has_partner = null;
    }
  }

  // AC2: on a passported benefit - income and expenses are hidden, and dependants no longer affect eligibility
  if (onPassportedBenefits === true) {
    zeroPersonMoneySections(payload, "you", { includeSavings: false });
    // partner's income/expenses are hidden on check-answers whenever on_passported_benefits, regardless of has_partner
    zeroPersonMoneySections(payload, "partner", { includeSavings: false });
    payload.dependants_old = 0;
    payload.dependants_young = 0;
  }

  // AC3: no partner - the partner's income, deductions and savings are all hidden
  if (hasPartner === false) {
    zeroPersonMoneySections(payload, "partner", { includeSavings: true });
  }
}

/**
 * Utility function to map user answers from the Forge journey to the API payload format
 * @param {Record<string, unknown>} answers - The user's answers keyed by step code
 * @returns {Record<string, unknown>} The API payload with mapped field names and values
 */
export function mapAnswersToApiPayload(
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const specificBenefits: Record<string, unknown> = {};
  const savings: Record<string, unknown> = {};
  const partnerSavings: Record<string, unknown> = {};
  const disputedSavings: Record<string, unknown> = {};
  const disregards: Record<string, boolean> = {};

  for (const [answerCode, answer] of Object.entries(answers)) {
    const apiField = mapAnswerCodeToApiField(answerCode);
    if (apiField) {
      let value = answer;

      if (typeof answer === "string") {
        if (answer.toLowerCase() === "yes") {
          value = true;
        } else if (answer.toLowerCase() === "no") {
          value = false;
        }
      }

      if (benefitFields.includes(apiField)) {
        specificBenefits[apiField] = value;
      } else if (partnerSavingsFields.includes(answerCode)) {
        partnerSavings[apiField] = Math.round(toNumber(value) * 100);
      } else if (disputedSavingsFields.includes(answerCode)) {
        disputedSavings[apiField] = Math.round(toNumber(value) * 100);
      } else if (savingsApiFields.includes(apiField)) {
        savings[apiField] = Math.round(toNumber(value) * 100);
      } else if (dependantsFields.includes(apiField)) {
        payload[apiField] = Math.round(toNumber(value));
      } else if (answerCode === disregardsStep.code) {
        // 'none' is a UI-only option meaning no disregards apply; the API doesn't recognise it as a field
        normaliseSelectedCheckbox(value)
          .filter((disregard) => disregard !== "none")
          .forEach((disregard) => {
            disregards[disregard] = true;
          });
        payload[apiField] = disregards;
      } else {
        payload[apiField] = value;
      }
    }
  }

  if (Object.keys(specificBenefits).length > 0) {
    payload.specific_benefits = specificBenefits;
    // Default `on_passported_benefits` to false unless conditions met
    payload.on_passported_benefits = benefitFields.some(
      (field) => specificBenefits[field] === true,
    );
  }

  const income = mapMoneyFieldsToApiPayload(answers, incomeMoneyFields, "");
  if ("self-employed" in answers) {
    income.self_employed = toBoolean(answers["self-employed"]);
  }
  const deductions = {
    ...mapMoneyFieldsToApiPayload(answers, deductionsMoneyFields, ""),
    ...mapLegalAidContributionsToApiPayload(answers, ""),
  };

  const youPayload: Record<string, unknown> = {};
  if (Object.keys(savings).length > 0) {
    youPayload.savings = savings;
  }
  if (Object.keys(income).length > 0) {
    youPayload.income = income;
  }
  if (Object.keys(deductions).length > 0) {
    youPayload.deductions = deductions;
  }
  if (Object.keys(youPayload).length > 0) {
    payload.you = youPayload;
  }

  const partnerIncome = mapMoneyFieldsToApiPayload(
    answers,
    incomeMoneyFields,
    "-partner",
  );
  if ("self-employed-partner" in answers) {
    partnerIncome.self_employed = toBoolean(answers["self-employed-partner"]);
  }
  const partnerDeductions = {
    ...mapMoneyFieldsToApiPayload(answers, deductionsMoneyFields, "-partner"),
    ...mapLegalAidContributionsToApiPayload(answers, "-partner"),
  };

  const partnerPayload: Record<string, unknown> = {};
  if (Object.keys(partnerSavings).length > 0) {
    partnerPayload.savings = partnerSavings;
  }
  if (Object.keys(partnerIncome).length > 0) {
    partnerPayload.income = partnerIncome;
  }
  if (Object.keys(partnerDeductions).length > 0) {
    partnerPayload.deductions = partnerDeductions;
  }
  if (Object.keys(partnerPayload).length > 0) {
    payload.partner = partnerPayload;
  }

  if (Object.keys(disputedSavings).length > 0) {
    payload.disputed_savings = disputedSavings;
  }

  const propertyCollection = getPropertyCollectionFromAnswers(answers);
  const hasExplicitPropertySet = Array.isArray(answers.propertySet);
  if (propertyCollection.length > 0 || hasExplicitPropertySet) {
    payload.property_set =
      mapForgePropertyCollectionToApiPropertySet(propertyCollection);
  }

  // Default `under_18_passported` to false unless conditions met
  payload.under_18_passported =
    payload.is_you_under_18 === true &&
    payload.under_18_receive_regular_payment === false &&
    payload.under_18_has_valuables === false;

  applyNonRequiredSectionDefaults(payload, {
    under18Passported: payload.under_18_passported,
    onPassportedBenefits: payload.on_passported_benefits,
    hasPartner: payload.has_partner,
  });

  return payload;
}

/**
 * This class implements the FinancialEligibilityWithDeps interface, providing methods to handle financial eligibility operations with dependencies.
 * It uses the provided dependencies to perform actions such as loading draft answers, clearing drafts, persisting saved answers, and loading case details.
 */
export class FinancialEligibilityEffectsWithDepsImpl implements FinancialEligibilityEffectsWithDeps {
  private readonly apiService: Record<string, CallableFunction>;

  /**
   * Constructs an instance of FinancialEligibilityEffectsWithDepsImpl with the provided API service.
   * @param {Record<string, CallableFunction>} apiService - The API service to be used for financial eligibility operations
   */
  constructor(apiService: Record<string, CallableFunction>) {
    this.apiService = apiService;
  }

  /**
   * Loads the case from the call centre API and stores it in the context, for use in the journey
   * @param {Deps} _deps Effect dependencies supplied by Forge
   * @param {EffectFunctionContext} context The context of the effect function, providing access to request parameters and session data
   */
  LoadCaseDetails = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = context.getRequestParam("caseId");

    if (caseId === undefined) {
      devError("No caseId found in path");
      return;
    }

    const axiosMiddleware = context.getState("authenticatedAxios");
    const caseDetails: unknown = await this.apiService.loadCase(
      axiosMiddleware,
      caseId,
    );

    devLog(`Loaded case details for caseId ${caseId}`);
    context.setData("case", caseDetails);
    context.setData("caseDetails", { status: "success", data: caseDetails });
  };

  /**
   * Loads financial eligibility data from the API, checks if any questions have been answered so that they
   * take precedence over the API data, and stores the results in Forge's answers.
   * @param {Deps} _deps Effect dependencies supplied by Forge, expected to include a getFinancialEligibility function
   * @param {EffectFunctionContext} context The context of the effect function, providing access to request parameters and session data
   */
  LoadCaseFinancialEligibility = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = context.getRequestParam("caseId");
    const PROPERTY_STEP_CODE = "properties";
    const PROPERTY_COLLECTION_CODE = "propertySet";

    if (caseId === undefined) {
      devError("No caseId found in path");
      return;
    }

    const axiosMiddleware = context.getState("authenticatedAxios");
    if (!axiosMiddleware) {
      devWarn(
        "Authenticated Axios middleware not found in state; API call may fail if it is required by the service implementation.",
      );
    }
    const financialEligibilityResponse =
      await this.apiService.getFinancialEligibility(axiosMiddleware, caseId);

    if (financialEligibilityResponse.status === "error") {
      throw new Error(
        `Failed to load financial eligibility for case ${caseId}: ${financialEligibilityResponse.message ?? "unknown error"}`,
      );
    }

    // Operator-created cases have no eligibility check until the first save, so start from an empty one
    const financialEligibilityData: FinancialEligibilityData =
      financialEligibilityResponse.data ??
      transformFinancialEligibilityItem({});

    const session = context.getSession() as
      FinancialEligibilitySession | undefined;
    if (!session) {
      devError("No session found; cannot load financial eligibility data");
      return;
    }

    session.financialEligibilityDrafts ||= {};

    if (!(caseId in session.financialEligibilityDrafts)) {
      session.financialEligibilityDrafts[caseId] = {};
    }

    const mappedAnswers = mapFinancialEligibilityApiDataToAnswerCodes(
      financialEligibilityData,
    );
    for (const [answerCode, apiValue] of Object.entries(mappedAnswers)) {
      const caseFEDraft = session.financialEligibilityDrafts[caseId];
      if (answerCode in caseFEDraft) {
        // If the step code already exists in the session draft, we use that value instead of the API value to ensure that any user-entered data takes precedence over the API data
        const draftValue =
          answerCode === disregardsStep.code
            ? normaliseSelectedCheckbox(caseFEDraft[answerCode])
            : caseFEDraft[answerCode];
        caseFEDraft[answerCode] = draftValue;
        context.setAnswer(answerCode, draftValue);
      } else {
        const answerValue = mapApiValueToForgeValue(apiValue, answerCode);
        context.setAnswer(answerCode, answerValue);
      }
    }

    const casePatternDrafts = getOrMigrateCasePatternDrafts(session, caseId);
    casePatternDrafts[PROPERTY_STEP_CODE] ||= {};

    const existingPatternCollection =
      casePatternDrafts[PROPERTY_STEP_CODE][PROPERTY_COLLECTION_CODE];
    if (Array.isArray(existingPatternCollection)) {
      context.setAnswer(PROPERTY_COLLECTION_CODE, existingPatternCollection);
      return;
    }

    // If there's no existing property collection in the session draft, we use the API value to populate the property collection & in Forge's answers
    const propertyDraftCollection = getPropertyCollectionFromAnswers(
      session.financialEligibilityDrafts[caseId],
    );
    const apiPropertyCollection = normalisePropertyCollectionForForge(
      mappedAnswers.propertySet,
    );
    const propertyCollectionToStore =
      propertyDraftCollection.length > 0
        ? propertyDraftCollection
        : apiPropertyCollection;

    if (propertyCollectionToStore.length > 0) {
      casePatternDrafts[PROPERTY_STEP_CODE][PROPERTY_COLLECTION_CODE] =
        propertyCollectionToStore;
      context.setAnswer(PROPERTY_COLLECTION_CODE, propertyCollectionToStore);
    }
  };

  /**
   * Persists saved answers from session to the backend API.
   * @param {Deps} _deps Effect dependencies supplied by Forge, expected to include an apiService with an updateFinancialEligibility function
   * @param {EffectFunctionContext} context The context of the effect function, providing access to request parameters and session data
   */
  PersistSavedAnswers = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    devLog(
      `Saving FE answers in session... ${JSON.stringify(context.getAllAnswers())}`,
    );

    const session = context.getSession() as
      FinancialEligibilitySession | undefined;
    const PROPERTY_STEP_CODE = "properties";
    const PROPERTY_COLLECTION_CODE = "propertySet";

    if (!session) {
      return;
    }

    const caseId = context.getRequestParam("caseId");
    if (caseId === undefined) {
      devError("No caseId found in path; cannot submit draft answers");
      return;
    }

    if (!session.financialEligibilityDrafts[caseId]) {
      session.financialEligibilityDrafts[caseId] = {};
    }

    // Merge the answers from Forge's context into the session draft for the caseId
    const submissionAnswers: Record<string, unknown> = {
      ...session.financialEligibilityDrafts[caseId],
    };

    const casePatternDrafts = getOrMigrateCasePatternDrafts(session, caseId);
    const patternPropertyCollection =
      casePatternDrafts[PROPERTY_STEP_CODE]?.[PROPERTY_COLLECTION_CODE];
    if (Array.isArray(patternPropertyCollection)) {
      submissionAnswers.propertySet = patternPropertyCollection;
    }

    const submissionPayload = mapAnswersToApiPayload(submissionAnswers);
    devLog(
      `Submitting FE payload to cla_backend for case ${caseId}: ${JSON.stringify(submissionPayload, null, 2)}`,
    );

    // Make API call to CLA backend with the apiService.
    const axiosMiddleware = context.getState("authenticatedAxios");
    if (!axiosMiddleware) {
      devWarn(
        "Authenticated Axios middleware not found in state; API call may fail if it is required by the service implementation.",
      );
    }
    const updateResult = await this.apiService.updateFinancialEligibility(
      axiosMiddleware,
      context.getRequestParam("caseId"),
      submissionPayload,
    );

    // Surface a failed save instead of silently clearing the draft below, which would otherwise
    // discard the user's edits and leave the case showing stale data from the last successful save
    if (updateResult.status === "error") {
      throw new Error(
        `Failed to update financial eligibility for case ${caseId}: ${updateResult.message ?? "unknown error"}`,
      );
    }

    devLog(
      `Submitted FE answers in session, to cla_backend: ${JSON.stringify(session.financialEligibilityDrafts[caseId])}`,
    );
  };

  /**
   * Clears draft financial eligibility answers from the session.
   * @param {Deps} _deps Effect dependencies supplied by Forge
   * @param {EffectFunctionContext} context The context of the effect function, providing access to request parameters and session data
   */
  ClearDraftAnswers = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const session = context.getSession() as
      FinancialEligibilitySession | undefined;

    const caseId = context.getRequestParam("caseId");
    if (caseId === undefined) {
      devError("No caseId found in path; cannot clear draft answers");
      return;
    }

    // Clear the draft answers for the caseId from the session
    if (session?.financialEligibilityDrafts[caseId]) {
      delete session.financialEligibilityDrafts[caseId];

      // Also clear any case pattern drafts for the caseId
      if (session.casePatternDrafts?.[caseId]) {
        delete session.casePatternDrafts[caseId];
      }

      context.getAllAnswers();
    }
  };

  /**
   * Saves a new answer if it has been answered, by checking the post data for any answers and saving them to the session as drafts.
   * @param {Deps} _deps Effect dependencies supplied by Forge
   * @param {EffectFunctionContext} context The context of the effect function, providing access to request parameters and session data
   */
  SaveNewAnswerIfAnswered = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const requestPostData = context.getAllPostData();
    const answerKeys = Object.keys(requestPostData);

    if (answerKeys.length === 0) {
      return;
    }

    const caseId = context.getRequestParam("caseId");
    if (caseId === undefined) {
      devError("No caseId found in path; cannot save new answer");
      return;
    }
    const session = context.getSession() as
      FinancialEligibilitySession | undefined;

    if (!session) {
      return;
    }

    if (!session.financialEligibilityDrafts[caseId]) {
      session.financialEligibilityDrafts[caseId] = {};
    }

    for (const key of answerKeys) {
      const valueIsMonetaryField =
        MONETARY_FIELDS.has(key) ||
        Array.from(MONETARY_FIELDS_PREFIXES).some((prefix) =>
          key.startsWith(prefix),
        );
      const value = valueIsMonetaryField
        ? parseFloat(requestPostData[key] as string).toFixed(2)
        : requestPostData[key];

      if (value !== undefined && value !== null && value !== "") {
        // Normalise the value for disregards step, to handle when only one disregard is selected
        const normalisedValue =
          key === disregardsStep.code
            ? normaliseSelectedCheckbox(value)
            : value;

        session.financialEligibilityDrafts[caseId][key] = normalisedValue;

        // Also set the answer in the context so that Forge can handle redirections correctly
        context.setAnswer(key, normalisedValue);
      }
    }

    devLog(
      `Saved new FE answers in session... ${JSON.stringify(session.financialEligibilityDrafts)}`,
    );
  };
  /* c8 ignore next -- tsx maps the class closing brace to code that never runs */
}
