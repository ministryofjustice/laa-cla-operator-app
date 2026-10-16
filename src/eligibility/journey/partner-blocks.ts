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

export const partnerEmploymentStatusBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "partner_employment_status",
      fieldset: {
        legend: {
          text: "What is the partner's employment status?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        { value: "in_work", text: "In work" },
        { value: "not_in_work", text: "Not in work" },
        { value: "self_employed", text: "Self-employed" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select the partner's employment status",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const partnerIncomeBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "partner_income",
      label: {
        text: "What is the partner's monthly income?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: { text: "In pounds per month" },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter the partner's monthly income",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const partnerBenefitsBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "partner_benefits",
      fieldset: {
        legend: {
          text: "Does the partner receive any state benefits?",
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
          message: "Select whether the partner receives benefits",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const partnerBenefitDetailsBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "partner_benefit_details",
      label: {
        text: "Which state benefits does the partner receive?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: { text: "List all benefits received" },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter which benefits the partner receives",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const partnerOtherIncomeBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "partner_other_income",
      fieldset: {
        legend: {
          text: "Does the partner have any other income?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: "For example, pensions, rental income, or savings interest",
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the partner has other income",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
