import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKRadioInput,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Answer,
  Condition,
  Data,
  Self,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { ResolvableString } from "@ministryofjustice/hmpps-forge/core/components";
import {
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  amountValidations,
  type AmountMessages,
} from "../amount-validation.js";
import { guidanceLink } from "../guidance.js";
import {
  CLIENT,
  byLevelOfHelp,
  type IncomeSubject,
} from "../income-subject.js";

/** What differs between the kinds of other income CCQ asks about. */
interface OtherIncomeType {
  /** The answer key stem: `${prefix}${type}_relevant` and so on. */
  type: string;
  /** Names the income in the check your answers summary. */
  title: string;
  /** Completes "Does <subject> get ...?" and "Select yes if <subject> gets ...". */
  gets: string;
  hint?: string;
  /** The income as it reads in "Enter amount of ..." errors. */
  described: (subject: IncomeSubject) => string;
  /** The income as it reads in "Select frequency of ..." errors. */
  frequencyDescribed?: (subject: IncomeSubject) => string;
  amountLabel: ResolvableString;
  /** Overrides the amount errors, which depend on the level of help for "other". */
  amountMessages?: AmountMessages;
}

const OTHER_SOURCES = "income from other sources received in the last";

const REGULAR_TYPES: readonly OtherIncomeType[] = [
  {
    type: "friends_or_family",
    title: "Financial help from friends or family",
    gets: "financial help from friends or family",
    hint: "For example, money from a family member for rent or bills.",
    described: () => "financial help from friends and family",
    amountLabel: "Amount",
  },
  {
    type: "maintenance",
    title: "Maintenance from a former partner",
    gets: "maintenance from a former partner",
    hint: "This includes child maintenance.",
    described: () => "maintenance from a former partner",
    frequencyDescribed: () => "maintenance payments from a former partner",
    amountLabel: "Amount",
  },
  {
    type: "property_or_lodger",
    title: "Income from a property or lodger",
    gets: "income from a property or lodger",
    described: () => "income from a property or lodger",
    amountLabel: "Amount",
  },
  {
    type: "pension",
    title: "Income from pensions",
    gets: "income from pensions",
    hint: "Include the total value of any pensions, including State Pension, workplace and personal pensions.",
    described: (subject) => `income ${subject.noun} gets from pensions`,
    amountLabel: "Amount",
  },
];

const STUDENT_FINANCE: OtherIncomeType = {
  type: "student_finance",
  title: "Income from student finance",
  gets: "income from student finance",
  hint: "This includes any type of student loan, grant or bursary. Do not include any tuition fee loans.",
  described: () => "student finance received this academic year",
  amountLabel: "Amount received this academic year",
};

const OTHER: OtherIncomeType = {
  type: "other",
  title: "Income from other sources",
  gets: "income from other sources",
  described: () => "income from other sources",
  amountLabel: byLevelOfHelp(
    "Amount received in the last month",
    "Amount received in the last 3 months",
  ),
  amountMessages: {
    required: byLevelOfHelp(
      `Enter amount of ${OTHER_SOURCES} month`,
      `Enter amount of ${OTHER_SOURCES} 3 months`,
    ),
    notANumber: byLevelOfHelp(
      `Amount of ${OTHER_SOURCES} month must be a number`,
      `Amount of ${OTHER_SOURCES} 3 months must be a number`,
    ),
    outOfRange: byLevelOfHelp(
      `Amount of ${OTHER_SOURCES} month must be more than 0`,
      `Amount of ${OTHER_SOURCES} 3 months must be more than 0`,
    ),
  },
};

const OTHER_HINT_LEAD =
  "For example, interest from savings or income bonds. Do not include any disregarded income or Cost of Living Payments.";

/**
 * The guidance hint under the "other sources" question.
 * @returns {ResolvableString} the hint HTML, by level of help
 */
function otherSourcesHintHtml(): ResolvableString {
  const hint = (level: "controlled" | "certificated"): string =>
    `${OTHER_HINT_LEAD}<br>Check the guidance for:<ul class="govuk-list govuk-list--bullet"><li>${guidanceLink(level, "disregardedPayments", "mandatory and discretionary disregarded payments")}</li><li>${guidanceLink(level, "income", "the principles for exercising discretion")}</li></ul>`;
  return byLevelOfHelp(hint("controlled"), hint("certificated"));
}

/**
 * The questions for one kind of other income: whether there is any, how
 * much, and (for regular income) how often. Amount and frequency are always
 * shown, and only checked, and kept, when the answer is yes.
 * @param {OtherIncomeType} income - the kind of income
 * @param {IncomeSubject} subject - whose income this is
 * @param {boolean} regular - whether it has a frequency
 * @returns {ReturnType<typeof CollectionBlock>} the questions
 */
function otherIncomeQuestions(
  income: OtherIncomeType,
  subject: IncomeSubject,
  regular: boolean,
): ReturnType<typeof CollectionBlock> {
  const relevantCode = `${subject.prefix}${income.type}_relevant`;
  const isRelevant = Answer(relevantCode).match(Condition.Equals("true"));
  const described = income.described(subject);
  const amountMessages = income.amountMessages ?? {
    required: `Enter amount of ${described}`,
    notANumber: `Amount of ${described} must be a number`,
    outOfRange: `Amount of ${described} must be more than 0`,
  };
  const frequencyDescribed = (income.frequencyDescribed ?? income.described)(
    subject,
  );

  return CollectionBlock({
    classes: "govuk-!-margin-bottom-6",
    collection: [
      GovUKRadioInput({
        code: relevantCode,
        fieldset: {
          legend: {
            text: `Does ${subject.noun} get ${income.gets}?`,
            classes: "govuk-fieldset__legend--m",
          },
        },
        ...(income.type === "other"
          ? { hint: { html: otherSourcesHintHtml() } }
          : income.hint === undefined
            ? {}
            : { hint: { text: income.hint } }),
        items: [
          { value: "true", text: "Yes" },
          { value: "false", text: "No" },
        ],
        classes: "govuk-radios--inline",
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: `Select yes if ${subject.noun} gets ${income.gets}`,
          }),
        ],
      }),
      GovUKTextInput({
        code: `${subject.prefix}${income.type}_conditional_value`,
        label: { text: income.amountLabel, classes: "govuk-label--s" },
        hint: { text: "If yes, enter amount" },
        prefix: { text: "£" },
        classes: "govuk-input--width-10",
        dependentWhen: isRelevant,
        metadata: { summaryLabel: `${income.title}: amount` },
        validWhen: amountValidations(
          amountMessages,
          POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
        ),
      }),
      ...(regular
        ? [
            GovUKRadioInput({
              code: `${subject.prefix}${income.type}_frequency`,
              fieldset: {
                legend: {
                  text: "Frequency",
                  classes: "govuk-fieldset__legend--s",
                },
              },
              items: Data("otherIncomeFrequencyOptions"),
              dependentWhen: isRelevant,
              metadata: { summaryLabel: `${income.title}: frequency` },
              validWhen: [
                validation({
                  condition: Self().match(Condition.IsRequired()),
                  message: `Select frequency of ${frequencyDescribed}`,
                }),
              ],
            }),
          ]
        : []),
    ],
  });
}

/**
 * The other income step, as in CCQ's `OtherIncomeForm`: regular income
 * (friends or family, maintenance, property or lodger, pension), then
 * student finance and other sources.
 * @param {IncomeSubject} subject - whose income this is
 * @returns {ReturnType<typeof CollectionBlock>} the heading, questions and button
 */
export function createOtherIncomeBlock(
  subject: IncomeSubject,
): ReturnType<typeof CollectionBlock> {
  const isClient = subject.prefix === "";
  return CollectionBlock({
    collection: [
      HtmlBlock({
        tag: "h1",
        content: isClient
          ? "Your client's other income"
          : "The partner's other income",
        classes: "govuk-heading-xl",
      }),
      ...(isClient
        ? []
        : [
            HtmlBlock({
              tag: "p",
              content: "Do not include income already entered for your client.",
              classes: "govuk-body",
            }),
          ]),
      ...REGULAR_TYPES.map((type) => otherIncomeQuestions(type, subject, true)),
      otherIncomeQuestions(STUDENT_FINANCE, subject, false),
      otherIncomeQuestions(OTHER, subject, false),
      GovUKButton({ text: "Continue" }),
    ],
  });
}

/** The client's other income step. */
export const otherIncomeBlock = createOtherIncomeBlock(CLIENT);
