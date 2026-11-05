// Port of CCQ's `Cfe::PartnerPayloadService`. Unlike CCQ (which fakes the
// partner's date of birth from the `partner_over_60` bracket via
// `70.years.ago`/`50.years.ago`), this reads a real `partner_date_of_birth`
// answer directly — see the Dates gotcha in the plan: CFE only needs a date
// that falls in the right bracket, and this reusable component collects a
// real one instead of synthesizing it.
import type { Answers } from "../logic.js";
import { partnerEmployed } from "../logic.js";
import { buildCapitals, buildPartnerAdditionalProperties } from "./assets.js";
import type { CapitalsAnswers } from "./assets.js";
import {
  buildEmploymentDetails,
  buildSelfEmploymentDetails,
} from "./employment-income.js";
import { buildIrregularIncomePayments } from "./irregular-income.js";
import type { IrregularIncomeAnswers } from "./irregular-income.js";
import { buildRegularTransactions } from "./regular-transactions.js";
import type {
  OtherIncomeFields,
  OutgoingsFields,
  RegularTransactionsForms,
} from "./regular-transactions.js";
import {
  asArray,
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
  assumeType,
} from "./types.js";
import type {
  BankAccount,
  BenefitItem,
  EmploymentDetail,
  IncomeItem,
  IrregularIncomePayment,
  PartnerPayload,
} from "./types.js";

const NOT_RELEVANT: never[] = [];

/**
 * Builds the partner's normalised irregular-income answers from their
 * `partner_`-prefixed fields, matching `SessionPersistableForPartner`'s
 * prefixing of `OtherIncomeForm`'s attributes.
 * @param {Answers} answers - the saved answers
 * @returns {IrregularIncomeAnswers} the partner's normalised irregular-income answers
 */
function partnerIrregularIncomeAnswers(
  answers: Answers,
): IrregularIncomeAnswers {
  return {
    student_finance_relevant: asOptionalBoolean(
      answers.partner_student_finance_relevant,
    ),
    student_finance_conditional_value: asOptionalNumber(
      answers.partner_student_finance_conditional_value,
    ),
    other_relevant: asOptionalBoolean(answers.partner_other_relevant),
    other_conditional_value: asOptionalNumber(
      answers.partner_other_conditional_value,
    ),
  };
}

/**
 * Builds the partner's normalised other-income answers from their
 * `partner_`-prefixed fields.
 * @param {Answers} answers - the saved answers
 * @returns {OtherIncomeFields} the partner's normalised other-income answers
 */
function partnerOtherIncomeFields(answers: Answers): OtherIncomeFields {
  return {
    friends_or_family_relevant: asOptionalBoolean(
      answers.partner_friends_or_family_relevant,
    ),
    friends_or_family_conditional_value: asOptionalNumber(
      answers.partner_friends_or_family_conditional_value,
    ),
    friends_or_family_frequency: asOptionalString(
      answers.partner_friends_or_family_frequency,
    ),
    maintenance_relevant: asOptionalBoolean(
      answers.partner_maintenance_relevant,
    ),
    maintenance_conditional_value: asOptionalNumber(
      answers.partner_maintenance_conditional_value,
    ),
    maintenance_frequency: asOptionalString(
      answers.partner_maintenance_frequency,
    ),
    property_or_lodger_relevant: asOptionalBoolean(
      answers.partner_property_or_lodger_relevant,
    ),
    property_or_lodger_conditional_value: asOptionalNumber(
      answers.partner_property_or_lodger_conditional_value,
    ),
    property_or_lodger_frequency: asOptionalString(
      answers.partner_property_or_lodger_frequency,
    ),
    pension_relevant: asOptionalBoolean(answers.partner_pension_relevant),
    pension_conditional_value: asOptionalNumber(
      answers.partner_pension_conditional_value,
    ),
    pension_frequency: asOptionalString(answers.partner_pension_frequency),
  };
}

/**
 * Builds the partner's normalised outgoings answers from their
 * `partner_`-prefixed fields.
 * @param {Answers} answers - the saved answers
 * @returns {OutgoingsFields} the partner's normalised outgoings answers
 */
function partnerOutgoingsFields(answers: Answers): OutgoingsFields {
  return {
    childcare_payments_relevant: asOptionalBoolean(
      answers.partner_childcare_payments_relevant,
    ),
    childcare_payments_conditional_value: asOptionalNumber(
      answers.partner_childcare_payments_conditional_value,
    ),
    childcare_payments_frequency: asOptionalString(
      answers.partner_childcare_payments_frequency,
    ),
    maintenance_payments_relevant: asOptionalBoolean(
      answers.partner_maintenance_payments_relevant,
    ),
    maintenance_payments_conditional_value: asOptionalNumber(
      answers.partner_maintenance_payments_conditional_value,
    ),
    maintenance_payments_frequency: asOptionalString(
      answers.partner_maintenance_payments_frequency,
    ),
    legal_aid_payments_relevant: asOptionalBoolean(
      answers.partner_legal_aid_payments_relevant,
    ),
    legal_aid_payments_conditional_value: asOptionalNumber(
      answers.partner_legal_aid_payments_conditional_value,
    ),
    legal_aid_payments_frequency: asOptionalString(
      answers.partner_legal_aid_payments_frequency,
    ),
  };
}

/**
 * Builds the partner's normalised capitals answers from their
 * `partner_`-prefixed fields, matching `PartnerAssetsForm`'s prefixing of
 * `AssetsForm`'s attributes. The partner's capitals are never flagged as
 * disputed (CCQ never passes `smod_applicable: true` for the partner), so no
 * dispute fields are read here.
 * @param {Answers} answers - the saved answers
 * @returns {CapitalsAnswers} the partner's normalised capitals answers
 */
function partnerCapitalsAnswers(answers: Answers): CapitalsAnswers {
  return {
    investments: assumeType<number>(answers.partner_investments),
    valuables: assumeType<number>(answers.partner_valuables),
    bank_accounts: asArray<BankAccount>(answers.partner_bank_accounts),
  };
}

/** The partner's income-derived sections of a CFE payload. */
interface PartnerIncomeSections {
  irregular_incomes: IrregularIncomePayment[];
  employment_details: EmploymentDetail[];
  self_employment_details: EmploymentDetail[];
}

/**
 * Builds the partner's irregular-income, employment and self-employment
 * sections, each independently guarded by its own relevant step.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {PartnerIncomeSections} the partner's income-derived sections
 */
function partnerIncomeSections(
  answers: Answers,
  relevantSteps: Set<string>,
): PartnerIncomeSections {
  const partnerIncomes = relevantSteps.has("partner_income")
    ? asArray<IncomeItem>(answers.partner_incomes)
    : [];

  return {
    irregular_incomes: relevantSteps.has("partner_other_income")
      ? buildIrregularIncomePayments(
          partnerIrregularIncomeAnswers(answers),
          answers.level_of_help,
        )
      : NOT_RELEVANT,
    employment_details: relevantSteps.has("partner_income")
      ? buildEmploymentDetails(partnerIncomes)
      : NOT_RELEVANT,
    self_employment_details: relevantSteps.has("partner_income")
      ? buildSelfEmploymentDetails(partnerIncomes)
      : NOT_RELEVANT,
  };
}

/**
 * Builds the forms `buildRegularTransactions` reads for the partner, from
 * whichever of other-income/outgoings/benefits is relevant.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {RegularTransactionsForms} the partner's regular-transactions forms
 */
function partnerRegularTransactionsForms(
  answers: Answers,
  relevantSteps: Set<string>,
): RegularTransactionsForms {
  return {
    incomeForm: relevantSteps.has("partner_other_income")
      ? partnerOtherIncomeFields(answers)
      : undefined,
    outgoingsForm: relevantSteps.has("partner_outgoings")
      ? partnerOutgoingsFields(answers)
      : undefined,
    benefits: relevantSteps.has("partner_benefit_details")
      ? asArray<BenefitItem>(answers.partner_benefits)
      : undefined,
  };
}

/**
 * Builds the `partner` section of a CFE payload, if the client has a
 * partner. Ported from `Cfe::PartnerPayloadService`.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {PartnerPayload | undefined} the partner section, if relevant
 */
export function buildPartnerSection(
  answers: Answers,
  relevantSteps: Set<string>,
): PartnerPayload | undefined {
  if (!relevantSteps.has("partner_details")) return undefined;

  const regularTransactionsRelevant =
    relevantSteps.has("partner_other_income") ||
    relevantSteps.has("partner_outgoings");

  const partnerFinancials: PartnerPayload = {
    partner: {
      date_of_birth: assumeType<string>(answers.partner_date_of_birth),
      employed: partnerEmployed(answers),
    },
    ...partnerIncomeSections(answers, relevantSteps),
    regular_transactions: regularTransactionsRelevant
      ? buildRegularTransactions(
          partnerRegularTransactionsForms(answers, relevantSteps),
        )
      : NOT_RELEVANT,
    additional_properties: relevantSteps.has(
      "partner_additional_property_details",
    )
      ? buildPartnerAdditionalProperties(answers)
      : NOT_RELEVANT,
    dependants: NOT_RELEVANT,
    vehicles: NOT_RELEVANT,
  };

  if (relevantSteps.has("partner_assets")) {
    partnerFinancials.capitals = buildCapitals(
      partnerCapitalsAnswers(answers),
      false,
    );
  }

  return partnerFinancials;
}
