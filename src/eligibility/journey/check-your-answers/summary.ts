import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  EffectRegistry,
  type EffectFunctionContext,
  type EffectFunctionExpr,
  type StepDefinition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type {
  GovUKRadioInput,
  GovUKTextInput,
  GovUKCheckboxInput,
  GovUKDateInputFull,
  SummaryListRow,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import type { Answers } from "../../domain/logic.js";
import type { EligibilityDeps } from "../../ports/index.js";
import { frequencyLabel } from "../frequency-copy.js";
import {
  BENEFITS_LIST,
  INCOMES_LIST,
  PARTNER_BENEFITS_LIST,
  PARTNER_INCOMES_LIST,
  ADDITIONAL_PROPERTIES_LIST,
  PARTNER_ADDITIONAL_PROPERTIES_LIST,
  DEPENDANT_INCOMES_LIST,
  BANK_ACCOUNTS_LIST,
  PARTNER_BANK_ACCOUNTS_LIST,
  VEHICLES_LIST,
} from "../../lists/index.js";
import {
  rowFieldCode,
  savedRows,
  type AddAnotherList,
} from "../../lists/add-another.js";

type Question =
  GovUKRadioInput | GovUKTextInput | GovUKCheckboxInput | GovUKDateInputFull;
const EMPTY_LENGTH = 0;
const POSITION_OFFSET = 1;

interface ListSummaryField {
  field: string;
  label: string;
  format: (value: unknown) => string;
}

interface ListSummary {
  list: AddAnotherList;
  rowLabel: string;
  fields: readonly ListSummaryField[];
}

const INCOME_TYPE_LABELS: Readonly<Record<string, string>> = {
  employment: eligibilityCopy.a_salary_or_wage,
  statutory_pay: eligibilityCopy.statutory_sick_pay_or_statutory_maternity_pay,
  self_employment: eligibilityCopy.self_employment_income,
};

const asText = (value: unknown): string => String(value);
const asPounds = (value: unknown): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number(value),
  );
const asFrequency = (value: unknown): string =>
  frequencyLabel(value) ?? asText(value);
const asIncomeType = (value: unknown): string =>
  INCOME_TYPE_LABELS[asText(value)] ?? asText(value);

const INCOME_FIELDS: readonly ListSummaryField[] = [
  { field: "income_type", label: eligibilityCopy.type, format: asIncomeType },
  {
    field: "income_frequency",
    label: eligibilityCopy.frequency,
    format: asFrequency,
  },
  {
    field: "gross_income",
    label: eligibilityCopy.income_before_deductions,
    format: asPounds,
  },
  { field: "income_tax", label: eligibilityCopy.income_tax, format: asPounds },
  {
    field: "national_insurance",
    label: eligibilityCopy.national_insurance,
    format: asPounds,
  },
];

const BENEFIT_FIELDS: readonly ListSummaryField[] = [
  { field: "benefit_type", label: eligibilityCopy.name, format: asText },
  { field: "benefit_amount", label: eligibilityCopy.amount, format: asPounds },
  {
    field: "benefit_frequency",
    label: eligibilityCopy.frequency,
    format: asFrequency,
  },
];

/**
 * A yes/no answer's summary text.
 * @param {unknown} value - the saved answer
 * @returns {string} "Yes" when the answer is true, otherwise "No"
 */
const asYesNo = (value: unknown): string =>
  value === true ? eligibilityCopy.yes : eligibilityCopy.no;

const BANK_ACCOUNT_FIELDS: readonly ListSummaryField[] = [
  {
    field: "amount",
    label: eligibilityCopy.dynamic.bankAccount.summaryAmount,
    format: asPounds,
  },
  {
    field: "account_in_dispute",
    label: eligibilityCopy.subject_matter_of_dispute,
    format: asYesNo,
  },
];

const VEHICLE_SUMMARY = eligibilityCopy.dynamic.vehicles;
const VEHICLE_FIELDS: readonly ListSummaryField[] = [
  {
    field: "vehicle_value",
    label: VEHICLE_SUMMARY.summaryValue,
    format: asPounds,
  },
  { field: "vehicle_pcp", label: VEHICLE_SUMMARY.summaryPcp, format: asYesNo },
  {
    field: "vehicle_finance",
    label: VEHICLE_SUMMARY.summaryFinance,
    format: asPounds,
  },
  {
    field: "vehicle_over_3_years_ago",
    label: VEHICLE_SUMMARY.summaryOverThreeYears,
    format: asYesNo,
  },
  {
    field: "vehicle_in_regular_use",
    label: VEHICLE_SUMMARY.summaryRegularUse,
    format: asYesNo,
  },
  {
    field: "vehicle_in_dispute",
    label: VEHICLE_SUMMARY.summaryDispute,
    format: asYesNo,
  },
];

const PROPERTY_FIELDS: readonly ListSummaryField[] = [
  {
    field: "house_value",
    label: eligibilityCopy.estimated_value,
    format: asPounds,
  },
  {
    field: "inline_owned_with_mortgage",
    label: eligibilityCopy.outstanding_mortgage,
    format: (value) => (value === true ? "Yes" : "No"),
  },
  {
    field: "mortgage",
    label: eligibilityCopy.mortgage_amount,
    format: asPounds,
  },
  {
    field: "percentage_owned",
    label: eligibilityCopy.percentage_owned,
    format: asText,
  },
  {
    field: "house_in_dispute",
    label: eligibilityCopy.subject_matter_of_dispute,
    format: (value) => (value === true ? "Yes" : "No"),
  },
];

// Steps whose answers are add-another rows, which have no question of their
// own to read the answers from.
const LIST_SUMMARIES: Readonly<Record<string, ListSummary>> = {
  income: {
    list: INCOMES_LIST,
    rowLabel: eligibilityCopy.employment_income,
    fields: INCOME_FIELDS,
  },
  partner_income: {
    list: PARTNER_INCOMES_LIST,
    rowLabel: eligibilityCopy.partner_employment_income,
    fields: INCOME_FIELDS,
  },
  benefit_details: {
    list: BENEFITS_LIST,
    rowLabel: eligibilityCopy.benefit,
    fields: BENEFIT_FIELDS,
  },
  partner_benefit_details: {
    list: PARTNER_BENEFITS_LIST,
    rowLabel: eligibilityCopy.partner_benefit,
    fields: BENEFIT_FIELDS,
  },
  additional_property_details: {
    list: ADDITIONAL_PROPERTIES_LIST,
    rowLabel: eligibilityCopy.other_property,
    fields: PROPERTY_FIELDS,
  },
  partner_additional_property_details: {
    list: PARTNER_ADDITIONAL_PROPERTIES_LIST,
    rowLabel: eligibilityCopy.partner_s_other_property,
    fields: PROPERTY_FIELDS,
  },
  assets: {
    list: BANK_ACCOUNTS_LIST,
    rowLabel: eligibilityCopy.dynamic.assets.bankAccountRow,
    fields: BANK_ACCOUNT_FIELDS,
  },
  partner_assets: {
    list: PARTNER_BANK_ACCOUNTS_LIST,
    rowLabel: eligibilityCopy.dynamic.assets.partnerBankAccountRow,
    fields: BANK_ACCOUNT_FIELDS,
  },
  vehicles_details: {
    list: VEHICLES_LIST,
    rowLabel: VEHICLE_SUMMARY.row,
    fields: VEHICLE_FIELDS,
  },
  dependant_income_details: {
    list: DEPENDANT_INCOMES_LIST,
    rowLabel: eligibilityCopy.dynamic.dependants.dependant,
    fields: [
      {
        field: "amount",
        label: eligibilityCopy.dynamic.dependants.incomeAmountLabel,
        format: asPounds,
      },
      {
        field: "frequency",
        label: eligibilityCopy.frequency,
        format: asFrequency,
      },
    ],
  },
};

/**
 * Builds summary rows for an add-another step's saved rows.
 * @param {string} stepPath - the step's path, without its leading slash
 * @param {ListSummary} summary - how to describe the step's rows
 * @param {Answers} answers - all saved answers
 * @returns {SummaryListRow[]} a row for each answered field of each saved row
 */
function listSummaryRows(
  stepPath: string,
  summary: ListSummary,
  answers: Answers,
): SummaryListRow[] {
  return savedRows(summary.list, answers).flatMap((row, index) =>
    summary.fields.flatMap(({ field, label, format }) => {
      const { [field]: value } = row;
      if (!answered(value)) return [];
      const key = eligibilityCopy.dynamic.summary.repeatedRow
        .replace("%1", summary.rowLabel)
        .replace("%2", String(index + POSITION_OFFSET))
        .replace("%3", label);
      return [
        {
          key: { text: key },
          value: { text: format(value) },
          actions: {
            items: [
              {
                href: `${stepPath}#${rowFieldCode(summary.list.key, index, field)}`,
                text: eligibilityCopy.change,
                visuallyHiddenText: key,
              },
            ],
          },
        },
      ];
    }),
  );
}

/**
 * Recognises the input components used by this journey.
 * @param {object} value - a possible block
 * @returns {boolean} whether this is a question
 */
function isQuestion(value: object): value is Question {
  return (
    "variant" in value &&
    [
      "govukTextInput",
      "govukRadioInput",
      "govukCheckboxInput",
      "govukDateInputFull",
    ].includes(String(value.variant))
  );
}

/**
 * Collects questions from collections, including repeated-row templates
 * and questions revealed by a radio option.
 * @param {unknown} value - authored blocks or nested configuration
 * @returns {Question[]} the question definitions
 */
function questionsIn(value: unknown): Question[] {
  if (value === null || typeof value !== "object") return [];
  // A radio's options can reveal questions of their own.
  if (isQuestion(value)) {
    return [value, ...("items" in value ? questionsIn(value.items) : [])];
  }
  return Object.values(value).flatMap(questionsIn);
}

/**
 * Keeps false and zero answers, but omits empty optional fields.
 * @param {unknown} value - the saved answer
 * @returns {boolean} whether an answer was supplied
 */
function answered(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    (!Array.isArray(value) || value.length !== EMPTY_LENGTH)
  );
}

/**
 * Uses the same option labels as the original question.
 * @param {Question} question - the original input definition
 * @param {unknown} value - the saved answer
 * @returns {string} the human-readable answer
 */
function answerText(question: Question, value: unknown): string {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item: unknown) => {
      const option =
        "items" in question && Array.isArray(question.items)
          ? question.items.find(
              (choice) =>
                "value" in choice &&
                typeof choice.value === "string" &&
                choice.value === String(item),
            )
          : undefined;
      return option !== undefined &&
        "text" in option &&
        typeof option.text === "string"
        ? option.text
        : (frequencyLabel(item) ?? String(item));
    })
    .join(", ");
}

/**
 * Resolve the partner-sensitive dependant and vehicle question labels.
 * @param {unknown} code - the field code
 * @param {boolean} hasPartner - whether the client has a partner
 * @returns {string | undefined} the partner-sensitive label, if applicable
 */
function dependantQuestionLabel(
  code: unknown,
  hasPartner: boolean,
): string | undefined {
  if (code === "child_dependants") {
    return hasPartner
      ? eligibilityCopy.dynamic.dependants.childLegendWithPartner
      : eligibilityCopy.dynamic.dependants.childLegendWithoutPartner;
  }
  if (code === "adult_dependants") {
    return hasPartner
      ? eligibilityCopy.dynamic.dependants.adultLegendWithPartner
      : eligibilityCopy.dynamic.dependants.adultLegendWithoutPartner;
  }
  if (code === "vehicle_owned") {
    return hasPartner
      ? eligibilityCopy.dynamic.vehicles.ownedLegendWithPartner
      : eligibilityCopy.dynamic.vehicles.ownedLegendWithoutPartner;
  }
  return undefined;
}

/**
 * Read the input's declared label without exposing authored expressions.
 * @param {Question} question - the original input definition
 * @returns {string} the question label
 */
function inputQuestionLabel(question: Question): string {
  const label =
    "label" in question
      ? typeof question.label === "string"
        ? question.label
        : question.label !== undefined && "text" in question.label
          ? question.label.text
          : undefined
      : "fieldset" in question
        ? question.fieldset?.legend?.text
        : undefined;
  if (typeof label !== "string") {
    throw new Error("Missing eligibility question label");
  }
  return label;
}

/**
 * Reads the original question text without exposing authored expressions.
 * @param {Question} question - the original input definition
 * @param {Answers} answers - current journey answers
 * @returns {string} the question label
 */
function questionLabel(question: Question, answers: Answers): string {
  const { metadata } = question;
  if (typeof metadata?.summaryLabel === "string") return metadata.summaryLabel;
  const { partner } = answers;
  const dependantLabel = dependantQuestionLabel(
    question.code,
    partner === true,
  );
  if (dependantLabel !== undefined) return dependantLabel;
  return inputQuestionLabel(question);
}

/**
 * Builds editable rows in current journey order, excluding obsolete branches.
 * @param {StepDefinition[]} steps - the registered question steps
 * @param {string[]} relevantSteps - the current route's step codes
 * @param {Answers} answers - all saved answers
 * @returns {SummaryListRow[]} the editable question and answer rows
 */
export function summaryRows(
  steps: readonly StepDefinition[],
  relevantSteps: readonly string[],
  answers: Answers,
): SummaryListRow[] {
  return relevantSteps.flatMap((code) => {
    const currentStep = steps.find((candidate) => candidate.code === code);
    if (currentStep === undefined) {
      throw new Error(`Missing eligibility step: ${code}`);
    }

    const stepPath = currentStep.path.replace(/^\//u, "");
    const listSummary = Object.hasOwn(LIST_SUMMARIES, code)
      ? LIST_SUMMARIES[code]
      : undefined;

    const questionRows = questionsIn(currentStep.blocks ?? []).flatMap(
      (question) => {
        const { code: fieldCode } = question;
        if (typeof fieldCode !== "string") {
          if (listSummary !== undefined) return [];
          throw new Error(
            `Unsupported question code in eligibility step: ${code}`,
          );
        }
        const { [fieldCode]: value } = answers;
        if (!answered(value)) return [];
        // An unticked checkbox is saved as false, which is not an answer to show.
        if (question.variant === "govukCheckboxInput" && value === false) {
          return [];
        }
        const label = questionLabel(question, answers);
        return [
          {
            key: { text: label },
            value: { text: answerText(question, value) },
            actions: {
              items: [
                {
                  href: `${stepPath}#${encodeURIComponent(fieldCode)}`,
                  text: eligibilityCopy.change,
                  visuallyHiddenText: label,
                },
              ],
            },
          },
        ];
      },
    );

    if (listSummary !== undefined) {
      return [
        ...listSummaryRows(stepPath, listSummary, answers),
        ...questionRows,
      ];
    }
    return questionRows;
  });
}

/**
 * Binds the summary loader to the host's registered question steps.
 * @param {StepDefinition[]} steps - the registered question steps
 * @returns {object} the registry and summary-loading effect
 */
export function createAnswerSummary(steps: readonly StepDefinition[]): {
  registry: EffectRegistry<EligibilityDeps>;
  load: () => EffectFunctionExpr;
} {
  const registry = new EffectRegistry<EligibilityDeps>();
  const load = registry.register(
    "EligibilityLoadAnswerSummary",
    () => (context: EffectFunctionContext) => {
      context.setData(
        "answerSummary",
        summaryRows(
          steps,
          context.getData<string[]>("steps"),
          context.getAllAnswers(),
        ),
      );
    },
  );
  return { registry, load };
}
