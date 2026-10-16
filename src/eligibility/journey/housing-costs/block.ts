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

export const housingCostsBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "housing_costs",
      label: {
        text: "What is the monthly housing cost?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: {
        text: "Usually rent or council tax. In pounds per month.",
      },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter the monthly housing cost",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
