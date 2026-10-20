import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKRadioInput,
  GovUKSelectInput,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Condition,
  Data,
  Item,
  Iterator,
  Self,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  amountValidations,
} from "../amount-validation.js";
import { CLIENT, type IncomeSubject } from "../income-subject.js";
import { benefitsNotNeededHtml } from "../benefits/block.js";
import { BENEFITS_LIST } from "../../lists/index.js";
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
 * The heading and guidance of a benefit details step.
 * @param {IncomeSubject} subject - whose benefits these are
 * @returns {ReturnType<typeof CollectionBlock>} the heading blocks
 */
export function createBenefitDetailsHeadingBlock(
  subject: IncomeSubject,
): ReturnType<typeof CollectionBlock> {
  return CollectionBlock({
    collection: [
      HtmlBlock({
        tag: "h1",
        content: eligibilityCopy.add_benefit_details,
        classes: "govuk-heading-xl",
      }),
      HtmlBlock({
        tag: "div",
        content: benefitsNotNeededHtml(
          subject.prefix === ""
            ? eligibilityCopy.dynamic.benefits.detailsGuidanceLeadClient
            : eligibilityCopy.dynamic.benefits.detailsGuidanceLeadPartner,
        ),
      }),
    ],
  });
}

/**
 * The rows of a benefit details step: one block of questions per benefit.
 * @param {IncomeSubject} subject - whose benefits these are
 * @param {AddAnotherList} list - the list the rows belong to
 * @returns {ReturnType<typeof CollectionBlock>} the rows
 */
export function createBenefitDetailsRowsBlock(
  subject: IncomeSubject,
  list: AddAnotherList,
): ReturnType<typeof CollectionBlock> {
  return CollectionBlock({
    collection: Data(list.rowsData).each(
      Iterator.Map(
        CollectionBlock({
          classes: "benefit-row govuk-!-margin-bottom-6",
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
            GovUKSelectInput({
              code: code("benefit_type"),
              label: {
                text: eligibilityCopy.benefit_name,
                classes: "govuk-label--s",
              },
              items: Data("benefitTypes"),
              validWhen: [
                validation({
                  condition: Self().match(Condition.IsRequired()),
                  message: message("benefit_type", "required"),
                }),
              ],
            }),
            GovUKTextInput({
              code: code("benefit_amount"),
              label: {
                text: eligibilityCopy.benefit_amount,
                classes: "govuk-label--s",
              },
              prefix: { text: eligibilityCopy.copy },
              classes: "govuk-input--width-10",
              validWhen: amountValidations(
                {
                  required: message("benefit_amount", "required"),
                  notANumber: message("benefit_amount", "notANumber"),
                  outOfRange: message("benefit_amount", "greaterThanZero"),
                },
                POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
              ),
            }),
            GovUKRadioInput({
              code: code("benefit_frequency"),
              fieldset: {
                legend: {
                  text: eligibilityCopy.dynamic.lists.benefitFrequencyRequired.replace(
                    "%1",
                    subject.noun,
                  ),
                  classes: "govuk-fieldset__legend--s",
                },
              },
              items: Data("benefitFrequencyOptions"),
              validWhen: [
                validation({
                  condition: Self().match(Condition.IsRequired()),
                  message: message("benefit_frequency", "required"),
                }),
              ],
            }),
          ],
        }),
      ),
    ),
  });
}

/**
 * The Add another and Continue buttons of a benefit details step.
 * @returns {ReturnType<typeof CollectionBlock>} the buttons
 */
export function createBenefitDetailsButtonsBlock(): ReturnType<
  typeof CollectionBlock
> {
  return CollectionBlock({
    collection: [
      GovUKButton({
        name: "action",
        value: "add",
        text: eligibilityCopy.add_another_benefit,
        classes: "govuk-button--secondary",
      }),
      GovUKButton({ text: eligibilityCopy.continue }),
    ],
  });
}

/** The client's benefit details heading. */
export const benefitDetailsHeadingBlock =
  createBenefitDetailsHeadingBlock(CLIENT);
/** The client's benefit rows. */
export const benefitDetailsRowsBlock = createBenefitDetailsRowsBlock(
  CLIENT,
  BENEFITS_LIST,
);
/** The client's benefit details buttons. */
export const benefitDetailsButtonsBlock = createBenefitDetailsButtonsBlock();
