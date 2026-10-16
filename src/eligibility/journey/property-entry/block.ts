import { CollectionBlock, HtmlBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKTextInput,
  GovUKButton,
  GovUKCheckboxInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
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
  content: "Property details",
  classes: "govuk-heading-xl",
});

export const propertyEntryBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "house_value",
      label: {
        text: "How much is the property worth?",
        classes: "govuk-label--m",
      },
      hint: { text: "In pounds" },
      validWhen: [
        validation({
          condition: Self().match(
            Condition.String.MatchesRegex(POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN),
          ),
          message: "Enter the property value as a number greater than 0",
        }),
      ],
    }),
    GovUKTextInput({
      code: "mortgage",
      label: { text: "How much is left to pay on the mortgage?" },
      hint: { text: "In pounds" },
      // TODO: This field is shown to all owners, but CCQ only shows it when property_owned = "with_mortgage".
      // Forge blocks don't support conditional field rendering (only conditional validation via `when:`).
      // Consider if field should be hidden via CSS or if the current approach (always visible, validated only
      // when relevant) is acceptable. For now, validation handles the conditional requirement.
      validWhen: [
        validation({
          condition: poundsAmountGreaterThanZeroWhenAnswered("property_owned", "with_mortgage"),
          message: "Enter how much is left to pay on the mortgage, as a number greater than 0",
        }),
      ],
    }),
    GovUKTextInput({
      code: "percentage_owned",
      label: { text: "What percentage of the property does the client own?" },
      hint: { text: "Enter a whole number between 1 and 100" },
      validWhen: [
        validation({
          condition: Self().match(
            Condition.String.MatchesRegex(WHOLE_PERCENTAGE_PATTERN),
          ),
          message: "Enter the percentage share your client owns, between 1 and 100",
        }),
      ],
    }),
    GovUKCheckboxInput({
      code: "house_in_dispute",
      fieldset: {
        legend: {
          text: "Property details",
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
        },
      },
      items: [
        {
          value: "true",
          text: "This asset is a subject matter of dispute",
        },
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
