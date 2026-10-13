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

export const propertyBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "property_owned",
      fieldset: {
        legend: {
          text: "Does the client own the property?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        {
          value: "outright",
          text: "Owned outright",
        },
        {
          value: "with_mortgage",
          text: "Owned with a mortgage",
        },
        {
          value: "shared_ownership",
          text: "Shared ownership",
        },
        {
          value: "rented",
          text: "Rented",
        },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select how the property is owned",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
