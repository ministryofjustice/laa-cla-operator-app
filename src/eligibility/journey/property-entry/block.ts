import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKTextInput,
  GovUKButton,
  GovUKCheckboxInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Answer,
  Data,
  or,
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  WHOLE_PERCENTAGE_PATTERN,
  poundsAmountGreaterThanZeroWhenAnswered,
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
} from "../amount-validation.js";

export const propertyEntryHeadingBlock = HtmlBlock({
  tag: "h1",
  content: eligibilityCopy.the_home_your_client_usually_lives_in,
  classes: "govuk-heading-xl",
});

export const propertyEntryHintBlock = HtmlBlock({
  tag: "p",
  content: Data("propertyEntryHint"),
  classes: "govuk-body",
});

export const propertyEntryBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "house_value",
      label: {
        text: eligibilityCopy.home_value,
        classes: "govuk-label--m",
      },
      hint: {
        text: eligibilityCopy.you_can_use_property_websites_to_find_the_estimated_val_b5487e2ee9,
      },
      validWhen: [
        validation({
          condition: Self().match(
            Condition.String.MatchesRegex(
              POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
            ),
          ),
          message:
            eligibilityCopy.enter_the_property_value_as_a_number_greater_than_0,
        }),
      ],
    }),
    GovUKTextInput({
      code: "mortgage",
      label: { text: eligibilityCopy.how_much_is_left_to_pay_on_the_mortgage },
      hint: {
        text: eligibilityCopy.check_the_statement_from_the_mortgage_provider_or_lende_30cc0c2d98,
      },
      visibleWhen: or([
        Answer("property_owned").match(Condition.Equals("with_mortgage")),
        Answer("property_owned").match(Condition.Equals("shared_ownership")),
      ]),
      validWhen: [
        validation({
          condition: poundsAmountGreaterThanZeroWhenAnswered(
            "property_owned",
            "with_mortgage",
          ),
          message:
            eligibilityCopy.enter_how_much_is_left_to_pay_on_the_mortgage_as_a_numb_5f9e7216ee,
        }),
        validation({
          condition: poundsAmountGreaterThanZeroWhenAnswered(
            "property_owned",
            "shared_ownership",
          ),
          message:
            eligibilityCopy.enter_how_much_is_left_to_pay_on_the_mortgage_as_a_numb_5f9e7216ee,
        }),
      ],
    }),
    GovUKTextInput({
      code: "percentage_owned",
      label: { text: eligibilityCopy.what_percentage_of_the_home_do_they_own },
      hint: { text: Data("propertyPercentageHint") },
      validWhen: [
        validation({
          condition: Self().match(
            Condition.String.MatchesRegex(WHOLE_PERCENTAGE_PATTERN),
          ),
          message:
            eligibilityCopy.enter_the_percentage_share_your_client_owns_between_1_and_100,
        }),
      ],
    }),
    GovUKCheckboxInput({
      code: "house_in_dispute",
      visibleWhen: Data("smodApplicable"),
      fieldset: {
        legend: {
          text: eligibilityCopy.property_details,
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
        },
      },
      items: [
        {
          value: "true",
          text: eligibilityCopy.this_asset_is_a_subject_matter_of_dispute,
        },
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
