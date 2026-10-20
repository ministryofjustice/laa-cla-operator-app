import eligibilityCopy from "../locales/en.json" with { type: "json" };
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
              text: eligibilityCopy.remove,
              classes: "govuk-button--secondary",
              visibleWhen: Item().path("removable"),
            }),
            GovUKTextInput({
              code: code("house_value"),
              label: {
                text: eligibilityCopy.how_much_is_the_property_holiday_home_or_land_worth,
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
                  text: eligibilityCopy.is_there_an_outstanding_mortgage_on_the_property_holida_757134c789,
                  classes: "govuk-fieldset__legend--s",
                },
              },
              visibleWhen: Item().path("showInlineMortgageOwnershipQuestion"),
              items: [
                {
                  value: "true",
                  text: eligibilityCopy.yes,
                  block: GovUKTextInput({
                    code: code("mortgage"),
                    label: {
                      text: eligibilityCopy.enter_the_value_of_the_outstanding_mortgage,
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
                { value: "false", text: eligibilityCopy.no },
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
              label: {
                text: eligibilityCopy.how_much_is_left_to_pay_on_the_mortgage,
              },
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
                    ? eligibilityCopy.dynamic.additionalProperty
                        .percentageLabelClient
                    : eligibilityCopy.dynamic.additionalProperty
                        .percentageLabelPartner,
                classes: "govuk-label--m",
              },
              hint: {
                text:
                  subject === "client"
                    ? eligibilityCopy.dynamic.additionalProperty
                        .percentageHintClient
                    : eligibilityCopy.dynamic.additionalProperty
                        .percentageHintPartner,
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
                  text: eligibilityCopy.property_details,
                  classes: "govuk-fieldset__legend--s",
                },
              },
              items: [
                {
                  value: "true",
                  text: eligibilityCopy.this_asset_is_a_subject_matter_of_dispute,
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
        text: eligibilityCopy.add_another_property_holiday_home_or_land,
        classes: "govuk-button--secondary",
      }),
      GovUKButton({ text: eligibilityCopy.continue }),
    ],
  });
}

export const additionalPropertyBlock = createPropertyOwnershipBlock(
  "additional_property_owned",
  eligibilityCopy.dynamic.additionalProperty.questionClient,
  eligibilityCopy.dynamic.additionalProperty.requiredClient,
  eligibilityCopy.dynamic.additionalProperty.questionClient,
);

export const partnerAdditionalPropertyBlock = createPropertyOwnershipBlock(
  "partner_additional_property_owned",
  eligibilityCopy.dynamic.additionalProperty.questionPartner,
  eligibilityCopy.dynamic.additionalProperty.requiredPartner,
  eligibilityCopy.dynamic.additionalProperty.questionPartner,
);

export const additionalPropertyDetailsBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "h1",
      content: eligibilityCopy.client_s_other_property_holiday_home_or_land,
      classes: "govuk-heading-xl",
    }),
    HtmlBlock({
      tag: "p",
      content:
        eligibilityCopy.if_your_client_and_their_partner_share_other_property_a_74049aac27,
      classes: "govuk-body",
    }),
    detailsBlock(ADDITIONAL_PROPERTIES_LIST, "client"),
  ],
});

export const partnerAdditionalPropertyDetailsBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "h1",
      content:
        eligibilityCopy.the_partner_s_other_property_holiday_home_or_land,
      classes: "govuk-heading-xl",
    }),
    HtmlBlock({
      tag: "p",
      content:
        eligibilityCopy.do_not_include_any_property_or_land_already_entered_for_your_client,
      classes: "govuk-body",
    }),
    detailsBlock(PARTNER_ADDITIONAL_PROPERTIES_LIST, "partner"),
  ],
});
