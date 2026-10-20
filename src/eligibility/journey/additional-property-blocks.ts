import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKCheckboxInput,
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
  or,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { createPropertyOwnershipBlock } from "./property/block.js";
import {
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  WHOLE_PERCENTAGE_PATTERN,
  amountValidations,
} from "./amount-validation.js";
import {
  ADDITIONAL_PROPERTIES_LIST,
  PARTNER_ADDITIONAL_PROPERTIES_LIST,
} from "../lists/index.js";
import type { AddAnotherList } from "../lists/add-another.js";

const code = (field: string): ReturnType<ReturnType<typeof Item>["path"]> =>
  Item().path(`codes.${field}`);

const message = (
  field: string,
  check: string,
): ReturnType<ReturnType<typeof Item>["path"]> =>
  Item().path(`messages.${field}.${check}`);

function detailsBlock(list: AddAnotherList, subject: "client" | "partner") {
  const rowsBlock = CollectionBlock({
    collection: Data(list.rowsData).each(
      Iterator.Map(
        CollectionBlock({
          classes: "additional-property-row govuk-!-margin-bottom-6",
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
            GovUKTextInput({
              code: code("house_value"),
              label: {
                text: "How much is the property, holiday home or land worth?",
                classes: "govuk-label--m",
              },
              validWhen: amountValidations(
                {
                  required: message("house_value", "required"),
                  notANumber: message("house_value", "notANumber"),
                  outOfRange: message("house_value", "greaterThanZero"),
                },
                POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
              ),
            }),
            GovUKRadioInput({
              code: code("inline_owned_with_mortgage"),
              fieldset: {
                legend: {
                  text: "Is there an outstanding mortgage on the property, holiday home or land?",
                  classes: "govuk-fieldset__legend--s",
                },
              },
              visibleWhen: Item().path("showInlineMortgageOwnershipQuestion"),
              items: [
                {
                  value: "true",
                  text: "Yes",
                  block: GovUKTextInput({
                    code: code("mortgage"),
                    label: {
                      text: "Enter the value of the outstanding mortgage",
                    },
                    validWhen: [
                      validation({
                        condition: or([
                          Answer(code("inline_owned_with_mortgage")).not.match(
                            Condition.Equals("true"),
                          ),
                          Self().match(
                            Condition.String.MatchesRegex(
                              POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
                            ),
                          ),
                        ]),
                        message: message("mortgage", "greaterThanZero"),
                      }),
                    ],
                  }),
                },
                { value: "false", text: "No" },
              ],
              validWhen: [
                validation({
                  condition: or([
                    Item()
                      .path("showInlineMortgageOwnershipQuestion")
                      .match(Condition.Equals(false)),
                    Self().match(Condition.IsRequired()),
                  ]),
                  message: message("inline_owned_with_mortgage", "required"),
                }),
              ],
            }),
            GovUKTextInput({
              code: code("mortgage"),
              label: { text: "How much is left to pay on the mortgage?" },
              visibleWhen: Item().path("ownedWithMortgage"),
              validWhen: [
                validation({
                  condition: or([
                    Item()
                      .path("ownedWithMortgage")
                      .match(Condition.Equals(false)),
                    Self().match(
                      Condition.String.MatchesRegex(
                        POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
                      ),
                    ),
                  ]),
                  message: message("mortgage", "greaterThanZero"),
                }),
              ],
            }),
            GovUKTextInput({
              code: code("percentage_owned"),
              label: {
                text:
                  subject === "client"
                    ? "What percentage share does your client own?"
                    : "What percentage share does the partner own?",
                classes: "govuk-label--m",
              },
              hint: {
                text:
                  subject === "client"
                    ? "If the property is shared with the partner, add the percentage the client and partner own together."
                    : "Do not include any property or land already entered for your client.",
              },
              validWhen: [
                validation({
                  condition: Self().match(
                    Condition.String.MatchesRegex(WHOLE_PERCENTAGE_PATTERN),
                  ),
                  message: message("percentage_owned", "withinRange"),
                }),
              ],
            }),
            GovUKCheckboxInput({
              code: code("house_in_dispute"),
              visibleWhen: Item().path("smodApplicable"),
              fieldset: {
                legend: {
                  text: "Property details",
                  classes: "govuk-fieldset__legend--s",
                },
              },
              items: [
                {
                  value: "true",
                  text: "This asset is a subject matter of dispute",
                },
              ],
            }),
          ],
        }),
      ),
    ),
  });

  return CollectionBlock({
    collection: [
      rowsBlock,
      GovUKButton({
        name: "action",
        value: "add",
        text: "Add another property, holiday home or land",
        classes: "govuk-button--secondary",
      }),
      GovUKButton({ text: "Continue" }),
    ],
  });
}

export const additionalPropertyBlock = createPropertyOwnershipBlock(
  "additional_property_owned",
  "Does your client own any other property, a holiday home or land?",
  "Select if your client owns any other property",
  "Does your client own any other property, a holiday home or land?",
);

export const partnerAdditionalPropertyBlock = createPropertyOwnershipBlock(
  "partner_additional_property_owned",
  "Does the partner own any other property, a holiday home or land?",
  "Select if the partner owns any other property",
  "Does the partner own any other property, a holiday home or land?",
);

export const additionalPropertyDetailsBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "h1",
      content: "Client's other property, holiday home or land",
      classes: "govuk-heading-xl",
    }),
    HtmlBlock({
      tag: "p",
      content:
        "If your client and their partner share other property, a holiday home or land, include this here.",
      classes: "govuk-body",
    }),
    detailsBlock(ADDITIONAL_PROPERTIES_LIST, "client"),
  ],
});

export const partnerAdditionalPropertyDetailsBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "h1",
      content: "The partner's other property, holiday home or land",
      classes: "govuk-heading-xl",
    }),
    HtmlBlock({
      tag: "p",
      content:
        "Do not include any property or land already entered for your client.",
      classes: "govuk-body",
    }),
    detailsBlock(PARTNER_ADDITIONAL_PROPERTIES_LIST, "partner"),
  ],
});
