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
  content: "The home your client usually lives in",
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
        text: "Home value",
        classes: "govuk-label--m",
      },
      hint: {
        text: "You can use property websites to find the estimated value. If you have more than one valuation, use the highest.",
      },
      validWhen: [
        validation({
          condition: Self().match(
            Condition.String.MatchesRegex(
              POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
            ),
          ),
          message: "Enter the property value as a number greater than 0",
        }),
      ],
    }),
    GovUKTextInput({
      code: "mortgage",
      label: { text: "How much is left to pay on the mortgage?" },
      hint: {
        text: "Check the statement from the mortgage provider or lender and include any other loans secured against the property.",
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
            "Enter how much is left to pay on the mortgage, as a number greater than 0",
        }),
        validation({
          condition: poundsAmountGreaterThanZeroWhenAnswered(
            "property_owned",
            "shared_ownership",
          ),
          message:
            "Enter how much is left to pay on the mortgage, as a number greater than 0",
        }),
      ],
    }),
    GovUKTextInput({
      code: "percentage_owned",
      label: { text: "What percentage of the home do they own?" },
      hint: { text: Data("propertyPercentageHint") },
      validWhen: [
        validation({
          condition: Self().match(
            Condition.String.MatchesRegex(WHOLE_PERCENTAGE_PATTERN),
          ),
          message:
            "Enter the percentage share your client owns, between 1 and 100",
        }),
      ],
    }),
    GovUKCheckboxInput({
      code: "house_in_dispute",
      visibleWhen: Data("smodApplicable"),
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
