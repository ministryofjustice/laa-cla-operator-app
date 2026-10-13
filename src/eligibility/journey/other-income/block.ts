import {
  CollectionBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKRadioInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const otherIncomeBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "other_income",
      fieldset: {
        legend: {
          text: "Does the client have any other income?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: "For example, pensions, rental income, or savings interest",
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the client has other income",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
