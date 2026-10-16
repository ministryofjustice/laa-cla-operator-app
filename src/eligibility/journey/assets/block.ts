import { CollectionBlock, HtmlBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKRadioInput,
  GovUKTextInput,
  GovUKCheckboxInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
  Answer,
  or,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  smodDisputeWhenApplicable,
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  POUNDS_AMOUNT_MIN_500_PATTERN,
} from "../amount-validation.js";

export const assetsHeadingBlock = HtmlBlock({
  tag: "h1",
  content: "Assets",
  classes: "govuk-heading-xl",
});

export const assetsQuestionsBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "investments_relevant",
      fieldset: {
        legend: {
          text: "Does your client have any investments?",
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
        },
      },
      hint: {
        text: "For example, shares in a public limited company, unit trusts or capital bonds.",
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select yes if client has any investments",
        }),
      ],
    }),
    GovUKTextInput({
      code: "investments",
      label: { text: "Total of all investments" },
      hint: { text: "In pounds" },
      validWhen: [
        validation({
          condition: or([
            Answer("investments_relevant").not.match(Condition.Equals("true")),
            Self().match(Condition.String.MatchesRegex(POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN)),
          ]),
          message: "Enter the total value of investments as a number greater than 0",
        }),
      ],
    }),
    GovUKCheckboxInput({
      code: "investments_in_dispute",
      fieldset: {
        legend: {
          text: "Investments",
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
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
    GovUKRadioInput({
      code: "valuables_relevant",
      fieldset: {
        legend: {
          text: "Does your client have valuable items worth £500 or more?",
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
        },
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select yes if client has valuable items worth £500 or more",
        }),
      ],
    }),
    GovUKTextInput({
      code: "valuables",
      label: { text: "Total of all valuable items" },
      hint: { text: "In pounds" },
      validWhen: [
        validation({
          condition: or([
            Answer("valuables_relevant").not.match(Condition.Equals("true")),
            Self().match(Condition.String.MatchesRegex(POUNDS_AMOUNT_MIN_500_PATTERN)),
          ]),
          message: "Enter the total value of valuable items as at least £500",
        }),
      ],
    }),
    GovUKCheckboxInput({
      code: "valuables_in_dispute",
      fieldset: {
        legend: {
          text: "Valuable items",
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
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
  ],
});

