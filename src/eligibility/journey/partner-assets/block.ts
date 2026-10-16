import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKRadioInput,
  GovUKTextInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { poundsAmountWhenAnswered } from "../amount-validation.js";

export const partnerAssetsBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "partner_investments_relevant",
      fieldset: {
        legend: {
          text: "Does the partner have any investments?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: "For example, shares in a public limited company, unit trusts or capital bonds. Do not include any investments already entered for your client.",
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select yes if the partner has any investments",
        }),
      ],
    }),
    GovUKTextInput({
      code: "partner_investments",
      label: { text: "Total of all investments" },
      hint: { text: "In pounds" },
      validWhen: [
        validation({
          condition: poundsAmountWhenAnswered(
            "partner_investments_relevant",
            "true",
          ),
          message: "The total value of all investments must be a number",
        }),
      ],
    }),
    GovUKRadioInput({
      code: "partner_valuables_relevant",
      fieldset: {
        legend: {
          text: "Does the partner have valuable items worth £500 or more?",
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
          message: "Select yes if the partner has valuable items worth £500 or more",
        }),
      ],
    }),
    GovUKTextInput({
      code: "partner_valuables",
      label: { text: "Total of all valuable items" },
      hint: { text: "In pounds" },
      validWhen: [
        validation({
          condition: poundsAmountWhenAnswered(
            "partner_valuables_relevant",
            "true",
          ),
          message: "The total value of all valuable items must be a number",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
