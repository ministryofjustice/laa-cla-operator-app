import type {
  FinancialEligibilityData,
  PropertySetData,
  SavingsData,
  IncomeData,
  DeductionData,
  MoneyPerInterval,
  DisputedSavingsData,
} from "#types/api-types.js";
import {
  isRecord,
  normaliseSelectedKeys,
  formatBooleanToRetainNullValue,
} from "#src/scripts/helpers/index.js";

const ZERO = 0;
const PENCE_PER_POUND = 100;
const INTERVAL_PERIODS: ReadonlyArray<MoneyPerInterval["time"]> = [
  "per_month",
  "per_year",
  "per_week",
  "per_4week",
  "per_2week",
];

/**
 * Transforms raw financial eligibility API data to display format
 * @param {unknown} item Raw financial eligibility item
 * @returns {FinancialEligibilityData} Transformed financial eligibility item
 */
export function transformFinancialEligibilityItem(
  item: unknown,
): FinancialEligibilityData {
  if (!isRecord(item)) {
    throw new Error("Invalid financial eligibility item: expected object");
  }

  const isUnder17 = formatBooleanToRetainNullValue(item.is_you_under_18);
  const isOver60 = formatBooleanToRetainNullValue(
    item.is_you_or_your_partner_over_60,
  );
  const hasPartner = formatBooleanToRetainNullValue(item.has_partner);
  const benefitsData = isRecord(item.specific_benefits)
    ? item.specific_benefits
    : {};
  const clientData = isRecord(item.you) ? item.you : {};
  const partnerData = isRecord(item.partner) ? item.partner : {};
  const income = formatIncomeData(clientData.income);
  const savings = formatSavingsData(clientData.savings);
  const deductions = formatDeductionsData(clientData.deductions);
  const partnerIncome = formatIncomeData(partnerData.income);
  const partnerSavings = formatSavingsData(partnerData.savings);
  const partnerDeductions = formatDeductionsData(partnerData.deductions);
  const disputedSavings = formatDisputedSavingsData(item.disputed_savings);
  const dependantsYoung = Number(item.dependants_young ?? ZERO);
  const dependantsOld = Number(item.dependants_old ?? ZERO);
  const disregards = normaliseSelectedKeys(item.disregards);
  const specificBenefits = {
    pensionCredit: formatBooleanToRetainNullValue(benefitsData.pension_credit),
    jobSeekers: formatBooleanToRetainNullValue(
      benefitsData.job_seekers_allowance,
    ),
    employmentSupport: formatBooleanToRetainNullValue(
      benefitsData.employment_support,
    ),
    universalCredit: formatBooleanToRetainNullValue(
      benefitsData.universal_credit,
    ),
    incomeSupport: formatBooleanToRetainNullValue(benefitsData.income_support),
  };
  const propertySet: PropertySetData[] = Array.isArray(item.property_set)
    ? item.property_set.map((property: unknown) => {
        const record = isRecord(property) ? property : {};
        return {
          value: convertPenceToPounds(Number(record.value)),
          mortgageLeft: convertPenceToPounds(Number(record.mortgage_left)),
          share: Number(record.share),
          disputed: Boolean(record.disputed),
          main: Boolean(record.main),
        };
      })
    : [];
  const under18RegularPayment = Boolean(item.under_18_receive_regular_payment);
  const under18HasValuables = Boolean(item.under_18_has_valuables);
  const state = String(item.state);
  const hasPassportedProceedingsLetter = Boolean(
    item.has_passported_proceedings_letter,
  );
  const passportedBenefits = Boolean(item.on_passported_benefits);
  const under18passportedBenefits = Boolean(item.under_18_passported);
  const category = String(item.category);

  return {
    hasPartner,
    isUnder17,
    isOver60,
    specificBenefits,
    propertySet,
    clientData: { income, savings, deductions },
    partnerData: { partnerIncome, partnerSavings, partnerDeductions },
    disregards,
    dependantsYoung,
    dependantsOld,
    under18RegularPayment,
    under18HasValuables,
    disputedSavings,
    state,
    hasPassportedProceedingsLetter,
    passportedBenefits,
    under18passportedBenefits,
    category,
  };
}

/**
 * Function to format savings data
 * @param {unknown} savings savings data to be formatted
 * @returns {SavingsData} formatted savings data
 */
function formatSavingsData(savings: unknown): SavingsData | null {
  if (!isRecord(savings)) {
    return null;
  }
  return {
    bankBalance: convertPenceToPounds(Number(savings.bank_balance ?? ZERO)),
    investmentBalance: convertPenceToPounds(
      Number(savings.investment_balance ?? ZERO),
    ),
    assetBalance: convertPenceToPounds(Number(savings.asset_balance ?? ZERO)),
    creditBalance: convertPenceToPounds(Number(savings.credit_balance ?? ZERO)),
    total: convertPenceToPounds(Number(savings.total ?? ZERO)),
  };
}

/**
 * Function to format deductions data
 * @param {unknown} deductions deductions data to be formatted
 * @returns {DeductionData} formatted deductions data
 */
function formatDeductionsData(deductions: unknown): DeductionData {
  if (!isRecord(deductions)) {
    // The API omits the section until it has been answered, so callers treat every field as optional
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion -- see above
    return {} as DeductionData;
  }
  return {
    incomeTax: formatMoneyPerInterval(deductions.income_tax),
    nationalInsurance: formatMoneyPerInterval(deductions.national_insurance),
    maintenance: formatMoneyPerInterval(deductions.maintenance),
    childcare: formatMoneyPerInterval(deductions.childcare),
    mortgage: formatMoneyPerInterval(deductions.mortgage),
    rent: formatMoneyPerInterval(deductions.rent),
    criminalContributions: {
      amount: convertPenceToPounds(
        Number(deductions.criminal_legalaid_contributions ?? ZERO),
      ),
      time: "per_month",
    },
    total: convertPenceToPounds(Number(deductions.total ?? ZERO)),
  };
}

/**
 * Function to format income data
 * @param {unknown} income income data to be formatted
 * @returns {IncomeData} formatted income data
 */
function formatIncomeData(income: unknown): IncomeData {
  if (!isRecord(income)) {
    // The API omits the section until it has been answered, so callers treat every field as optional
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion -- see above
    return {} as IncomeData;
  }
  return {
    earnings: formatMoneyPerInterval(income.earnings),
    selfEmploymentDrawings: formatMoneyPerInterval(
      income.self_employment_drawings,
    ),
    benefits: formatMoneyPerInterval(income.benefits),
    taxCredits: formatMoneyPerInterval(income.tax_credits),
    childBenefit: formatMoneyPerInterval(income.child_benefits),
    maintenanceReceived: formatMoneyPerInterval(income.maintenance_received),
    pension: formatMoneyPerInterval(income.pension),
    otherIncome: formatMoneyPerInterval(income.other_income),
    selfEmployed: Boolean(income.self_employed),
    total: convertPenceToPounds(Number(income.total ?? ZERO)),
  };
}

/**
 * Function to format disputed savings and allow null values
 * @param {unknown} savings savings to format
 * @returns {SavingsData | null} formatted savings or null
 */
function formatDisputedSavingsData(
  savings: unknown,
): DisputedSavingsData | null {
  if (!isRecord(savings)) {
    return null;
  }

  return {
    bankBalance: nullablePenceToPounds(savings.bank_balance),
    investmentBalance: nullablePenceToPounds(savings.investment_balance),
    assetBalance: nullablePenceToPounds(savings.asset_balance),
    creditBalance: nullablePenceToPounds(savings.credit_balance),
    total: nullablePenceToPounds(savings.total),
  };
}

/**
 * Convert an optional pence value to pounds, keeping null/undefined as null
 * @param {unknown} pence amount in pence, or null/undefined when not answered
 * @returns {number | null} pounds amount, or null when not answered
 */
function nullablePenceToPounds(pence: unknown): number | null {
  if (pence === null || pence === undefined) {
    return null;
  }
  return convertPenceToPounds(Number(pence));
}

/**
 * Function to format data using money per interval interface
 * @param { unknown } value value to be formatted
 * @returns { MoneyPerInterval } a money per interval object with a value and time interval
 */
function formatMoneyPerInterval(value: unknown): MoneyPerInterval {
  if (!isRecord(value)) {
    return {
      amount: null,
      time: null,
    };
  }

  return {
    amount: convertPenceToPounds(Number(value.per_interval_value ?? ZERO)),
    time:
      INTERVAL_PERIODS.find((period) => period === value.interval_period) ??
      null,
  };
}

/**
 * Function to convert pence to pounds
 * @param {number} pence amount in pence to be converted to pounds
 * @returns {number} pounds amount as a number
 */
export function convertPenceToPounds(pence: number): number {
  return pence / PENCE_PER_POUND;
}
