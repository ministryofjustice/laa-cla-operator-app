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

export const outgoingsBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "outgoings",
      label: {
        text: "What are the client's monthly outgoings?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: {
        text: "Include rent/mortgage, utilities, food, transport, childcare and other regular expenses. In pounds per month.",
      },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter the client's monthly outgoings",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
