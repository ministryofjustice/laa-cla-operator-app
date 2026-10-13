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

export const benefitDetailsBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "benefit_details",
      label: {
        text: "Which state benefits does the client receive?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: { text: "List all benefits received" },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter which benefits the client receives",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
