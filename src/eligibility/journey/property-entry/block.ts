import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
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
  smodDisputeWhenApplicable,
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
} from "../amount-validation.js";

export const propertyEntryBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "house_value",
      label: {
        text: "How much is the property worth?",
        classes: "govuk-label--l",
        isPageHeading: true,
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
        },
      },
      items: [
        {
          value: "true",
          text: "This asset is a subject matter of dispute",
        },
      ],
      validWhen: [
        validation({
          condition: smodDisputeWhenApplicable(),
          message: "Select whether this asset is a subject matter of dispute",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

