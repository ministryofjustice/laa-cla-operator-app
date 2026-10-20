import {
  CollectionBlock,
  HtmlBlock,
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
    '<button type="submit" class="govuk-visually-hidden" tabindex="-1" aria-hidden="true"></button>',
});

/**
 * The self-employed guidance, which CCQ words by level of help and subject.
 * @param {IncomeSubject} subject - whose income this is
 * @returns {string} the guidance paragraphs as HTML
 */
function selfEmployedHtml(subject: IncomeSubject): {
  controlled: string;
  certificated: string;
} {
  const { noun, possessive } = subject;
  const para = (text: string): string => `<p class="govuk-body">${text}</p>`;
  const bullets = (items: string[]): string =>
    `<ul class="govuk-list govuk-list--bullet">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  const their = subject.prefix === "" ? "your client’s" : "the partner’s";
  const unavailable =
    "If these figures are unavailable, or the latest accounts are more than 18 months old:";
  const drawings = `if the drawings exceed the declared net profits of the business, or the business is making a loss, use the value of any monthly drawings for personal use made by ${noun}`;

  return {
    controlled: [
      para(
        `If ${noun} is self-employed, enter their drawings, dividends, bonuses or any benefits in kind from their business as their income.`,
      ),
      para(
        `If ${noun} is paid in cash, their drawings will be any money taken out of their earnings for personal use.`,
      ),
    ].join(""),
    certificated: [
      para(
        `If ${noun} is a sole-trader, enter the taxable income figure from their latest self-assessment tax return, or the monthly net profit figure from their most recent set of accounts.`,
      ),
      para(unavailable),
      bullets([
        `if turnover is less than £15,000, use ${their} estimate of their net profit`,
        `if turnover is £15,000 or more, ask ${noun} to provide the average net profit figure based on the previous 6 months' trading`,
        drawings,
      ]),
      para(
        `If ${noun} is in a partnership, enter the value of ${possessive} share of the taxable income figure from their latest self-assessment tax return, or their share of the business’ net profit from their most recent set of accounts.`,
      ),
      para(unavailable),
      bullets([
        `if turnover is less than £15,000, use ${their} estimate of their share of net profit`,
        `if turnover is £15,000 or more, ask ${noun} to provide their share of the average net profit figure based on the previous 6 months' trading`,
        drawings,
      ]),
      para(
        `If ${noun} is paid in cash, enter any money taken out of their earnings for personal use.`,
      ),
    ].join(""),
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
  const person = subject.prefix === "" ? "the client" : "the partner";
  const list = (items: string[]): string =>
    `<ul class="govuk-list govuk-list--bullet">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;

  return CollectionBlock({
    collection: [
      GovUKDetails({
        summaryText: `${capitalPeople} who are police officers`,
        html: `<p class="govuk-body">If ${noun} is a police officer, the salary entered should include:</p>${list(
          [
            `any rent or force housing allowance ${person} gets`,
            `any police compensatory grant ${person} gets`,
          ],
        )}`,
      }),
      GovUKDetails({
        summaryText: `${capitalPeople} in prison`,
        html: `<p class="govuk-body">If ${noun} is in prison, include any income they get from:</p>${list(
          [
            "the pre-release employment scheme",
            "outside employment where they are participating in a ‘working out’ scheme",
            "employment when released on temporary licence",
          ],
        )}`,
      }),
      GovUKDetails({
        summaryText: `${capitalPeople} living outside the UK`,
        html: `<p class="govuk-body">If ${noun} lives outside the UK, include all income tax payments they made.</p><p class="govuk-body">Only include UK National Insurance contributions.</p>`,
      }),
      GovUKDetails({
        summaryText: `${capitalPeople} in HM Forces`,
        html: `<p class="govuk-body">If ${noun} is a member of HM Forces, include any of the following they get in the gross salary you enter:</p>${list(
          [
            "Local Overseas Allowance",
            "Excess Rent Allowance",
            "London Allowance",
            "Overseas Child Benefit",
          ],
        )}`,
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
          ? "Your client's employment income"
          : "The partner's employment income",
        classes: "govuk-heading-xl",
      }),
      HtmlBlock({
        tag: "p",
        content: isClient
          ? "You can find this on your client's payslips"
          : "You can find this on the partner's payslips.",
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
  const { noun } = subject;
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
              text: "Remove",
              classes: "govuk-button--secondary",
              visibleWhen: Item().path("removable"),
            }),
            GovUKRadioInput({
              code: code("income_type"),
              fieldset: {
                legend: {
                  text: "What type of employment income is this?",
                  classes: "govuk-fieldset__legend--s",
                },
              },
              items: [
                {
                  value: "employment",
                  text: "A salary or wage",
                  hint: {
                    text: byLevelOfHelp(
                      `Including if ${noun} is a self-employed company director or in a partnership and is paid as an employee`,
                      "",
                    ),
                  },
                },
                {
                  value: "statutory_pay",
                  text: "Statutory Sick Pay or Statutory Maternity Pay",
                },
                {
                  value: "self_employment",
                  text: "Self-employment income",
                  hint: {
                    text: byLevelOfHelp(
                      "For example, payment in cash, drawings or dividends or bonuses paid from a company account, and the value of any benefits in kind",
                      "For example, payment in cash, adjusted net profit or drawings",
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
                  text: `When does ${noun} normally get this income?`,
                  classes: "govuk-fieldset__legend--s",
                },
              },
              hint: {
                text: byLevelOfHelp(
                  "We’ll use this to calculate their monthly income. If they do not get income regularly, tell us how much they got in the last 3 months.",
                  "We’ll use this to calculate their monthly income. If they do not get income regularly, tell us how much they got in the last 3 months, or in the last year.",
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
                text: "Income before any deductions",
                classes: "govuk-label--s",
              },
              prefix: { text: "£" },
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
              summaryText: `Self-employed ${subject.people}, including ${subject.people} paid in cash`,
              html: byLevelOfHelp(guidance.controlled, guidance.certificated),
            }),
            GovUKTextInput({
              code: code("income_tax"),
              label: { text: "Income tax", classes: "govuk-label--s" },
              prefix: { text: "£" },
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
              label: { text: "National Insurance", classes: "govuk-label--s" },
              prefix: { text: "£" },
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
        text: "Add another employment income",
        classes: "govuk-button--secondary",
      }),
      GovUKButton({ text: "Continue" }),
    ],
  });
}

/** The client's employment income heading. */
export const incomeHeadingBlock = createIncomeHeadingBlock(CLIENT);
/** The client's employment income rows. */
export const incomeRowsBlock = createIncomeRowsBlock(CLIENT, INCOMES_LIST);
/** The client's employment income buttons. */
export const incomeButtonsBlock = createIncomeButtonsBlock();
