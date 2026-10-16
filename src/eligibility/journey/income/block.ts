import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKTextInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const incomeBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "income",
      label: {
        text: "What is the client's monthly income?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: { text: "In pounds per month" },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter the client's monthly income",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
