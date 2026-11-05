import eligibilityCopy from "../../locales/en.json" with { type: "json" };
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
  Format,
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
  described: (subject: IncomeSubject) => ResolvableString;
  /** The income as it reads in "Select frequency of ..." errors. */
  frequencyDescribed?: (subject: IncomeSubject) => ResolvableString;
  amountLabel: ResolvableString;
  /** Overrides the amount errors, which depend on the level of help for "other". */
  amountMessages?: AmountMessages;
}

const REGULAR_TYPES: readonly OtherIncomeType[] = [
  {
    type: "friends_or_family",
    title: eligibilityCopy.financial_help_from_friends_or_family,
    gets: eligibilityCopy.financial_help_from_friends_or_family_85e8d774,
    hint: eligibilityCopy.for_example_money_from_a_family_member_for_rent_or_bills,
    described: () =>
      eligibilityCopy.dynamic.otherIncome.descriptionFriendsOrFamily,
    amountLabel: eligibilityCopy.amount,
  },
  {
    type: "maintenance",
    title: eligibilityCopy.maintenance_from_a_former_partner,
    gets: eligibilityCopy.maintenance_from_a_former_partner_c60c9996,
    hint: eligibilityCopy.this_includes_child_maintenance,
    described: () => eligibilityCopy.dynamic.otherIncome.descriptionMaintenance,
    frequencyDescribed: () =>
      eligibilityCopy.dynamic.otherIncome.frequencyDescriptionMaintenance,
    amountLabel: eligibilityCopy.amount,
  },
  {
    type: "property_or_lodger",
    title: eligibilityCopy.income_from_a_property_or_lodger,
    gets: eligibilityCopy.income_from_a_property_or_lodger_80f0a625,
    described: () =>
      eligibilityCopy.dynamic.otherIncome.descriptionPropertyOrLodger,
    amountLabel: eligibilityCopy.amount,
  },
  {
    type: "pension",
    title: eligibilityCopy.income_from_pensions,
    gets: eligibilityCopy.income_from_pensions_bc842380,
    hint: eligibilityCopy.include_the_total_value_of_any_pensions_including_state_a0a9ade115,
    described: (subject) =>
      Format(
        eligibilityCopy.dynamic.otherIncome.descriptionPension,
        subject.noun,
      ),
    amountLabel: eligibilityCopy.amount,
  },
];

const STUDENT_FINANCE: OtherIncomeType = {
  type: "student_finance",
  title: eligibilityCopy.income_from_student_finance,
  gets: eligibilityCopy.income_from_student_finance_d017767f,
  hint: eligibilityCopy.this_includes_any_type_of_student_loan_grant_or_bursary_eba9dc2404,
  described: () =>
    eligibilityCopy.dynamic.otherIncome.descriptionStudentFinance,
  amountLabel: eligibilityCopy.amount_received_this_academic_year,
};

const OTHER: OtherIncomeType = {
  type: "other",
  title: eligibilityCopy.income_from_other_sources,
  gets: eligibilityCopy.income_from_other_sources_7b521263,
  described: () => eligibilityCopy.dynamic.otherIncome.descriptionOther,
  amountLabel: byLevelOfHelp(
    eligibilityCopy.dynamic.otherIncome.otherAmountLabelControlled,
    eligibilityCopy.dynamic.otherIncome.otherAmountLabelCertificated,
  ),
  amountMessages: {
    required: byLevelOfHelp(
      Format(eligibilityCopy.dynamic.income.otherRequired, "month"),
      Format(eligibilityCopy.dynamic.income.otherRequired, "3 months"),
    ),
    notANumber: byLevelOfHelp(
      Format(eligibilityCopy.dynamic.income.otherNumber, "month"),
      Format(eligibilityCopy.dynamic.income.otherNumber, "3 months"),
    ),
    outOfRange: byLevelOfHelp(
      Format(eligibilityCopy.dynamic.income.otherGreaterThanZero, "month"),
      Format(eligibilityCopy.dynamic.income.otherGreaterThanZero, "3 months"),
    ),
  },
};

/**
 * The guidance hint under the "other sources" question.
 * @returns {ResolvableString} the hint HTML, by level of help
 */
function otherSourcesHintHtml(): ResolvableString {
  const hint = (level: "controlled" | "certificated"): ResolvableString =>
    Format(
      eligibilityCopy.dynamic.otherIncome.hintHtml,
      eligibilityCopy.dynamic.otherIncome.hintOther,
      guidanceLink(
        level,
        "disregardedPayments",
        eligibilityCopy.dynamic.otherIncome.disregardedLinkText,
      ),
      guidanceLink(
        level,
        "income",
        eligibilityCopy.dynamic.otherIncome.discretionLinkText,
      ),
    );
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
    required: Format(eligibilityCopy.dynamic.income.amountRequired, described),
    notANumber: Format(eligibilityCopy.dynamic.income.amountNumber, described),
    outOfRange: Format(
      eligibilityCopy.dynamic.income.amountGreaterThanZero,
      described,
    ),
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
            text: eligibilityCopy.dynamic.otherIncome.question
              .replace("%1", subject.noun)
              .replace("%2", income.gets),
            classes: "govuk-fieldset__legend--m",
          },
        },
        ...(income.type === "other"
          ? { hint: { html: otherSourcesHintHtml() } }
          : income.hint === undefined
            ? {}
            : { hint: { text: income.hint } }),
        items: [
          { value: "true", text: eligibilityCopy.yes },
          { value: "false", text: eligibilityCopy.no },
        ],
        classes: "govuk-radios--inline",
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: Format(
              eligibilityCopy.dynamic.otherIncome.required,
              subject.noun,
              income.gets,
            ),
          }),
        ],
      }),
      GovUKTextInput({
        code: `${subject.prefix}${income.type}_conditional_value`,
        label: { text: income.amountLabel, classes: "govuk-label--s" },
        hint: { text: eligibilityCopy.if_yes_enter_amount },
        prefix: { text: eligibilityCopy.copy },
        classes: "govuk-input--width-10",
        dependentWhen: isRelevant,
        metadata: {
          summaryLabel:
            eligibilityCopy.dynamic.otherIncome.summaryAmount.replace(
              "%1",
              income.title,
            ),
        },
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
                  text: eligibilityCopy.frequency,
                  classes: "govuk-fieldset__legend--s",
                },
              },
              items: Data("otherIncomeFrequencyOptions"),
              dependentWhen: isRelevant,
              metadata: {
                summaryLabel:
                  eligibilityCopy.dynamic.otherIncome.summaryFrequency.replace(
                    "%1",
                    income.title,
                  ),
              },
              validWhen: [
                validation({
                  condition: Self().match(Condition.IsRequired()),
                  message: Format(
                    eligibilityCopy.dynamic.otherIncome.frequencyRequired,
                    frequencyDescribed,
                  ),
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
          ? eligibilityCopy.dynamic.otherIncome.headingClient
          : eligibilityCopy.dynamic.otherIncome.headingPartner,
        classes: "govuk-heading-xl",
      }),
      ...(isClient
        ? []
        : [
            HtmlBlock({
              tag: "p",
              content:
                eligibilityCopy.do_not_include_income_already_entered_for_your_client,
              classes: "govuk-body",
            }),
          ]),
      ...REGULAR_TYPES.map((type) => otherIncomeQuestions(type, subject, true)),
      otherIncomeQuestions(STUDENT_FINANCE, subject, false),
      otherIncomeQuestions(OTHER, subject, false),
      GovUKButton({ text: eligibilityCopy.continue }),
    ],
  });
}

/** The client's other income step. */
export const otherIncomeBlock = createOtherIncomeBlock(CLIENT);
