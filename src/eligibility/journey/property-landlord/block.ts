import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKRadioInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const propertyLandlordBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "property_landlord",
      fieldset: {
        legend: {
          text: "Is the landlord the only other joint-owner?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select yes if the landlord is the only other joint-owner",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
