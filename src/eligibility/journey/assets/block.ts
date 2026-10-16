import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKRadioInput,
  GovUKTextInput,
  GovUKCheckboxInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  poundsAmountWhenAnswered,
  smodDisputeWhenApplicable,
} from "../amount-validation.js";

export const assetsQuestionsBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "investments_relevant",
      fieldset: {
        legend: {
          text: "Does your client have any investments?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
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
          condition: poundsAmountWhenAnswered("investments_relevant", "true"),
          message: "The total value of all investments must be a number",
        }),
      ],
    }),
    GovUKCheckboxInput({
      code: "investments_in_dispute",
      fieldset: {
        legend: {
          text: "Investments",
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
          classes: "govuk-fieldset__legend--l",
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
          condition: poundsAmountWhenAnswered("valuables_relevant", "true"),
          message: "The total value of all valuable items must be a number",
        }),
      ],
    }),
    GovUKCheckboxInput({
      code: "valuables_in_dispute",
      fieldset: {
        legend: {
          text: "Valuable items",
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

