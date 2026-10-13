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

export const dependantDetailsBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "dependant_details",
      fieldset: {
        legend: {
          text: "Does the client have any dependants?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: "Include children and other dependants who depend on the client financially.",
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the client has dependants",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const dependantIncomeBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "dependant_income",
      fieldset: {
        legend: {
          text: "Do the dependants have their own income?",
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
          message: "Select whether the dependants have income",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const dependantIncomeDetailsBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "dependant_income_details",
      label: {
        text: "What is the dependants' total monthly income?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: { text: "In pounds per month" },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter the dependants' monthly income",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
