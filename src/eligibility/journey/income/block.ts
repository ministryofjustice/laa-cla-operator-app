import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
  type ResolvableString,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKDetails,
  GovUKRadioInput,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Answer,
  Condition,
  Data,
  Format,
  Item,
  Iterator,
  Self,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { NetIncomeIsPositive } from "../../registries/conditions.js";
import {
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  POUNDS_AMOUNT_PATTERN,
  amountValidations,
} from "../amount-validation.js";
import {
  CLIENT,
  byLevelOfHelp,
  type IncomeSubject,
} from "../income-subject.js";
import { INCOMES_LIST } from "../../lists/index.js";
import type { AddAnotherList } from "../../lists/add-another.js";

/**
 * The field code of a row field, read from the row being rendered.
 * @param {string} field - the row field name
 * @returns {ReturnType<typeof Item>} the row's code for that field
 */
const code = (field: string): ReturnType<ReturnType<typeof Item>["path"]> =>
  Item().path(`codes.${field}`);

/**
 * An error message of a row field, read from the row being rendered.
 * @param {string} field - the row field name
 * @param {string} check - the check the message is for
 * @returns {ReturnType<typeof Item>} the row's message
 */
const message = (
  field: string,
  check: string,
): ReturnType<ReturnType<typeof Item>["path"]> =>
  Item().path(`messages.${field}.${check}`);

/**
 * A visually hidden Continue button placed first in the form, so pressing
 * Enter in a field continues rather than clicking the first Remove or Add
 * button on the page.
 */
export const defaultSubmitBlock = HtmlBlock({
  tag: "div",
  content:
    eligibilityCopy.button_type_submit_class_govuk_visually_hidden_tabindex_243f12c844,
});

/**
 * The self-employed guidance, which CCQ words by level of help and subject.
 * @param {IncomeSubject} subject - whose income this is
 * @returns {{ controlled: ResolvableString, certificated: ResolvableString }} the guidance paragraphs as HTML
 */
function selfEmployedHtml(subject: IncomeSubject): {
  controlled: ResolvableString;
  certificated: ResolvableString;
} {
  return {
    controlled: Format(
      eligibilityCopy.dynamic.income.selfEmployedControlledHtml,
      subject.noun,
    ),
    certificated: Format(
      eligibilityCopy.dynamic.income.selfEmployedCertificatedHtml,
      subject.noun,
      subject.possessive,
      subject.possessive,
    ),
  };
}

/**
 * The guidance details CCQ shows above the income rows.
 * @param {IncomeSubject} subject - whose income this is
 * @returns {ReturnType<typeof CollectionBlock>} the details blocks
 */
function incomeGuidanceBlock(
  subject: IncomeSubject,
): ReturnType<typeof CollectionBlock> {
  const { noun, peopleTitle: capitalPeople } = subject;
  const person =
    subject.prefix === ""
      ? eligibilityCopy.dynamic.income.personClient
      : eligibilityCopy.dynamic.income.personPartner;

  return CollectionBlock({
    collection: [
      GovUKDetails({
        summaryText: Format(
          eligibilityCopy.dynamic.income.incomePoliceSummary,
          capitalPeople,
        ),
        html: Format(
          eligibilityCopy.dynamic.income.incomePoliceHtml,
          noun,
          person,
        ),
      }),
      GovUKDetails({
        summaryText: Format(
          eligibilityCopy.dynamic.income.incomePrisonSummary,
          capitalPeople,
        ),
        html: Format(eligibilityCopy.dynamic.income.incomePrisonHtml, noun),
      }),
      GovUKDetails({
        summaryText: Format(
          eligibilityCopy.dynamic.income.incomeOverseasSummary,
          capitalPeople,
        ),
        html: Format(eligibilityCopy.dynamic.income.incomeOverseasHtml, noun),
      }),
      GovUKDetails({
        summaryText: Format(
          eligibilityCopy.dynamic.income.incomeForcesSummary,
          capitalPeople,
        ),
        html: Format(eligibilityCopy.dynamic.income.incomeForcesHtml, noun),
      }),
    ],
  });
}

/**
 * The page heading, hint and guidance for an income step.
 * @param {IncomeSubject} subject - whose income this is
 * @returns {ReturnType<typeof CollectionBlock>} the heading blocks
 */
export function createIncomeHeadingBlock(
  subject: IncomeSubject,
): ReturnType<typeof CollectionBlock> {
  const isClient = subject.prefix === "";
  return CollectionBlock({
    collection: [
      HtmlBlock({
        tag: "h1",
        content: isClient
          ? eligibilityCopy.dynamic.income.employmentHintClient
          : eligibilityCopy.dynamic.income.employmentHintPartner,
        classes: "govuk-heading-xl",
      }),
      HtmlBlock({
        tag: "p",
        content: isClient
          ? eligibilityCopy.dynamic.income.payslipsClient
          : eligibilityCopy.dynamic.income.payslipsPartner,
        classes: "govuk-body",
      }),
      incomeGuidanceBlock(subject),
    ],
  });
}

/**
 * The rows of an income step: one block of questions per income.
 * @param {IncomeSubject} subject - whose income this is
 * @param {AddAnotherList} list - the list the rows belong to
 * @returns {ReturnType<typeof CollectionBlock>} the rows
 */
export function createIncomeRowsBlock(
  subject: IncomeSubject,
  list: AddAnotherList,
): ReturnType<typeof CollectionBlock> {
  const guidance = selfEmployedHtml(subject);

  return CollectionBlock({
    collection: Data(list.rowsData).each(
      Iterator.Map(
        CollectionBlock({
          classes: "income-row govuk-!-margin-bottom-6",
          collection: [
            HtmlBlock({
              tag: "h2",
              content: Item().path("heading"),
              classes: "govuk-heading-m",
            }),
            GovUKButton({
              name: "remove",
              value: Item().path("index"),
              text: eligibilityCopy.remove,
              classes: "govuk-button--secondary",
              visibleWhen: Item().path("removable"),
            }),
            GovUKRadioInput({
              code: code("income_type"),
              fieldset: {
                legend: {
                  text: eligibilityCopy.what_type_of_employment_income_is_this,
                  classes: "govuk-fieldset__legend--s",
                },
              },
              items: [
                {
                  value: "employment",
                  text: eligibilityCopy.a_salary_or_wage,
                  hint: {
                    text: byLevelOfHelp(
                      Format(
                        eligibilityCopy.dynamic.income.employmentHint,
                        subject.noun,
                      ),
                      "",
                    ),
                  },
                },
                {
                  value: "statutory_pay",
                  text: eligibilityCopy.statutory_sick_pay_or_statutory_maternity_pay,
                },
                {
                  value: "self_employment",
                  text: eligibilityCopy.self_employment_income,
                  hint: {
                    text: byLevelOfHelp(
                      eligibilityCopy.dynamic.income
                        .selfEmploymentHintControlled,
                      eligibilityCopy.dynamic.income
                        .selfEmploymentHintCertificated,
                    ),
                  },
                },
              ],
              validWhen: [
                validation({
                  condition: Self().match(Condition.IsRequired()),
                  message: message("income_type", "required"),
                }),
              ],
            }),
            GovUKRadioInput({
              code: code("income_frequency"),
              fieldset: {
                legend: {
                  text: eligibilityCopy.dynamic.income.whenFrequency.replace(
                    "%1",
                    subject.noun,
                  ),
                  classes: "govuk-fieldset__legend--s",
                },
              },
              hint: {
                text: byLevelOfHelp(
                  eligibilityCopy.dynamic.income.frequencyHintControlled,
                  eligibilityCopy.dynamic.income.frequencyHintCertificated,
                ),
              },
              items: Data("incomeFrequencyOptions"),
              validWhen: [
                validation({
                  condition: Self().match(Condition.IsRequired()),
                  message: message("income_frequency", "required"),
                }),
              ],
            }),
            GovUKTextInput({
              code: code("gross_income"),
              label: {
                text: eligibilityCopy.income_before_any_deductions,
                classes: "govuk-label--s",
              },
              prefix: { text: eligibilityCopy.copy },
              classes: "govuk-input--width-10",
              validWhen: [
                ...amountValidations(
                  {
                    required: message("gross_income", "required"),
                    notANumber: message("gross_income", "notANumber"),
                    outOfRange: message("gross_income", "greaterThanZero"),
                  },
                  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
                ),
                validation({
                  condition: Self().match(
                    NetIncomeIsPositive(
                      Answer(code("income_tax")),
                      Answer(code("national_insurance")),
                    ),
                  ),
                  message: message("gross_income", "netPositive"),
                }),
              ],
            }),
            GovUKDetails({
              summaryText: Format(
                eligibilityCopy.dynamic.income.summarySelfEmployment,
                subject.people,
              ),
              html: byLevelOfHelp(guidance.controlled, guidance.certificated),
            }),
            GovUKTextInput({
              code: code("income_tax"),
              label: {
                text: eligibilityCopy.income_tax,
                classes: "govuk-label--s",
              },
              prefix: { text: eligibilityCopy.copy },
              classes: "govuk-input--width-10",
              validWhen: amountValidations(
                {
                  required: message("income_tax", "required"),
                  notANumber: message("income_tax", "notANumber"),
                  outOfRange: message("income_tax", "zeroOrMore"),
                },
                POUNDS_AMOUNT_PATTERN,
              ),
            }),
            GovUKTextInput({
              code: code("national_insurance"),
              label: {
                text: eligibilityCopy.national_insurance,
                classes: "govuk-label--s",
              },
              prefix: { text: eligibilityCopy.copy },
              classes: "govuk-input--width-10",
              validWhen: amountValidations(
                {
                  required: message("national_insurance", "required"),
                  notANumber: message("national_insurance", "notANumber"),
                  outOfRange: message("national_insurance", "zeroOrMore"),
                },
                POUNDS_AMOUNT_PATTERN,
              ),
            }),
          ],
        }),
      ),
    ),
  });
}

/**
 * The Add another and Continue buttons of an income step.
 * @returns {ReturnType<typeof CollectionBlock>} the buttons
 */
export function createIncomeButtonsBlock(): ReturnType<typeof CollectionBlock> {
  return CollectionBlock({
    collection: [
      GovUKButton({
        name: "action",
        value: "add",
        text: eligibilityCopy.add_another_employment_income,
        classes: "govuk-button--secondary",
      }),
      GovUKButton({ text: eligibilityCopy.continue }),
    ],
  });
}

/** The client's employment income heading. */
export const incomeHeadingBlock = createIncomeHeadingBlock(CLIENT);
/** The client's employment income rows. */
export const incomeRowsBlock = createIncomeRowsBlock(CLIENT, INCOMES_LIST);
/** The client's employment income buttons. */
export const incomeButtonsBlock = createIncomeButtonsBlock();
