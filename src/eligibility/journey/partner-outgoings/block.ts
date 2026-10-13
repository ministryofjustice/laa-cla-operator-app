import {
  CollectionBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKTextInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const partnerOutgoingsBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "partner_outgoings",
      label: {
        text: "What are the partner's monthly outgoings?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: {
        text: "In pounds per month",
      },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter the partner's monthly outgoings",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
