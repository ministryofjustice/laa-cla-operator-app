import {
  CollectionBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
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

export const vehiclesBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "vehicles",
      fieldset: {
        legend: {
          text: "Does the client own any vehicles?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: "Include cars, motorcycles, and other vehicles owned by the client or their partner.",
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the client owns vehicles",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const vehicleDetailsBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "vehicle_details",
      label: {
        text: "Provide details of the vehicles",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: {
        text: "Include for each vehicle: make, model, year, estimated value, and any outstanding finance.",
      },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter details of the vehicles",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
