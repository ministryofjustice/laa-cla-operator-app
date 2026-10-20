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
import { frequencyLabel } from "../../domain/frequency-options.js";
import type { EligibilityDeps } from "../../ports/index.js";
import {
  BENEFITS_LIST,
  INCOMES_LIST,
  PARTNER_BENEFITS_LIST,
  PARTNER_INCOMES_LIST,
  ADDITIONAL_PROPERTIES_LIST,
  PARTNER_ADDITIONAL_PROPERTIES_LIST,
} from "../../lists/index.js";
import {
  rowFieldCode,
  savedRows,
  type AddAnotherList,
} from "../../lists/add-another.js";

type Question =
  GovUKRadioInput | GovUKTextInput | GovUKCheckboxInput | GovUKDateInputFull;
const EMPTY_LENGTH = 0;
const BANK_ACCOUNT_POSITION_OFFSET = 1;
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
  employment: "A salary or wage",
  statutory_pay: "Statutory Sick Pay or Statutory Maternity Pay",
  self_employment: "Self-employment income",
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
  { field: "income_type", label: "Type", format: asIncomeType },
  { field: "income_frequency", label: "Frequency", format: asFrequency },
  {
    field: "gross_income",
    label: "Income before deductions",
    format: asPounds,
  },
  { field: "income_tax", label: "Income tax", format: asPounds },
  {
    field: "national_insurance",
    label: "National Insurance",
    format: asPounds,
  },
];

const BENEFIT_FIELDS: readonly ListSummaryField[] = [
  { field: "benefit_type", label: "Name", format: asText },
  { field: "benefit_amount", label: "Amount", format: asPounds },
  { field: "benefit_frequency", label: "Frequency", format: asFrequency },
];

const PROPERTY_FIELDS: readonly ListSummaryField[] = [
  { field: "house_value", label: "Estimated value", format: asPounds },
  {
    field: "inline_owned_with_mortgage",
    label: "Outstanding mortgage",
    format: (value) => (value === true ? "Yes" : "No"),
  },
  { field: "mortgage", label: "Mortgage amount", format: asPounds },
  { field: "percentage_owned", label: "Percentage owned", format: asText },
  {
    field: "house_in_dispute",
    label: "Subject matter of dispute",
    format: (value) => (value === true ? "Yes" : "No"),
  },
];

// Steps whose answers are add-another rows, which have no question of their
// own to read the answers from.
const LIST_SUMMARIES: Readonly<Record<string, ListSummary>> = {
  income: {
    list: INCOMES_LIST,
    rowLabel: "Employment income",
    fields: INCOME_FIELDS,
  },
  partner_income: {
    list: PARTNER_INCOMES_LIST,
    rowLabel: "Partner employment income",
    fields: INCOME_FIELDS,
  },
  benefit_details: {
    list: BENEFITS_LIST,
    rowLabel: "Benefit",
    fields: BENEFIT_FIELDS,
  },
  partner_benefit_details: {
    list: PARTNER_BENEFITS_LIST,
    rowLabel: "Partner benefit",
    fields: BENEFIT_FIELDS,
  },
  additional_property_details: {
    list: ADDITIONAL_PROPERTIES_LIST,
    rowLabel: "Other property",
    fields: PROPERTY_FIELDS,
  },
  partner_additional_property_details: {
    list: PARTNER_ADDITIONAL_PROPERTIES_LIST,
    rowLabel: "Partner's other property",
    fields: PROPERTY_FIELDS,
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
      const key = `${summary.rowLabel} ${index + POSITION_OFFSET}: ${label}`;
      return [
        {
          key: { text: key },
          value: { text: format(value) },
          actions: {
            items: [
              {
                href: `${stepPath}#${rowFieldCode(summary.list.key, index, field)}`,
                text: "Change",
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
 * Collects questions from collections, including repeated-row templates.
 * @param {unknown} value - authored blocks or nested configuration
 * @returns {Question[]} the question definitions
 */
function questionsIn(value: unknown): Question[] {
  if (value === null || typeof value !== "object") return [];
  if (isQuestion(value)) return [value];
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
 * Builds summary rows for the repeated bank-account inputs on the assets step.
 * @param {Answers} answers - all saved eligibility answers
 * @returns {SummaryListRow[]} rows for each saved bank account
 */
function bankAccountSummaryRows(answers: Answers): SummaryListRow[] {
  if (!Array.isArray(answers.bank_accounts)) return [];

  return answers.bank_accounts.flatMap((account: unknown, index: number) => {
    if (typeof account !== "object" || account === null) return [];
    const amount = "amount" in account ? account.amount : undefined;
    const accountInDispute =
      "account_in_dispute" in account ? account.account_in_dispute : undefined;
    if (
      (typeof amount !== "string" && typeof amount !== "number") ||
      String(amount).trim() === ""
    ) {
      return [];
    }

    const label = `Bank account ${index + BANK_ACCOUNT_POSITION_OFFSET}`;
    const rows: SummaryListRow[] = [
      {
        key: { text: label },
        value: {
          text: new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: "GBP",
          }).format(Number(amount)),
        },
        actions: {
          items: [
            {
              href: `assets#bank_accounts_${index}_amount`,
              text: "Change",
              visuallyHiddenText: label,
            },
          ],
        },
      },
    ];

    if (accountInDispute === true) {
      rows.push({
        key: { text: `${label}: subject matter of dispute` },
        value: { text: "Yes" },
        actions: {
          items: [
            {
              href: `assets#bank_accounts_${index}_account_in_dispute`,
              text: "Change",
              visuallyHiddenText: `${label}: subject matter of dispute`,
            },
          ],
        },
      });
    }

    return rows;
  });
}

/**
 * Reads the original question text without exposing authored expressions.
 * @param {Question} question - the original input definition
 * @returns {string} the question label
 */
function questionLabel(question: Question): string {
  const { metadata } = question;
  if (typeof metadata?.summaryLabel === "string") return metadata.summaryLabel;
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
          if (code === "assets" || listSummary !== undefined) return [];
          throw new Error(
            `Unsupported question code in eligibility step: ${code}`,
          );
        }
        const { [fieldCode]: value } = answers;
        if (!answered(value)) return [];
        const label = questionLabel(question);
        return [
          {
            key: { text: label },
            value: { text: answerText(question, value) },
            actions: {
              items: [
                {
                  href: `${stepPath}#${encodeURIComponent(fieldCode)}`,
                  text: "Change",
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
    return code === "assets"
      ? [...bankAccountSummaryRows(answers), ...questionRows]
      : questionRows;
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
