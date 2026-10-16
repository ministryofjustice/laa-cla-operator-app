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

export const applicantBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "applicant",
      fieldset: {
        legend: {
          text: "Tell us about your client",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        {
          value: "true",
          text: "Yes",
        },
        {
          value: "false",
          text: "No",
        },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the client has a partner",
        }),
      ],
    }),
    GovUKRadioInput({
      code: "passporting",
      fieldset: {
        legend: {
          text: "Does your client receive a passporting benefit?",
        },
      },
      hint: {
        text: "Such as Universal Credit, Income Support, Income-based Jobseeker's Allowance, Income-related Employment and Support Allowance, Pension Credit, or Housing Benefit.",
      },
      items: [
        {
          value: "true",
          text: "Yes",
        },
        {
          value: "false",
          text: "No",
        },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the client receives a passporting benefit",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
