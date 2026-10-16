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

export const sharedOwnershipHousingCostsBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "shared_ownership_housing_costs",
      label: {
        text: "What are the monthly housing costs?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: {
        text: "Include mortgage, rent to landlord, service charges and maintenance. In pounds per month.",
      },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter the monthly housing costs",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
