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

export const additionalPropertyBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "additional_property",
      fieldset: {
        legend: {
          text: "Does the client own any additional properties?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: "Include any other properties owned by the client or their partner.",
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the client owns additional properties",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const additionalPropertyDetailsBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "additional_property_details",
      label: {
        text: "Provide details of the additional properties",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: {
        text: "Include information about each property: type, ownership, value, mortgage details.",
      },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter details of the additional properties",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
