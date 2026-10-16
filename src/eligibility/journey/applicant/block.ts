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
          text: "Does the client have a partner?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: "Include married couples, civil partners, and those in long-term relationships.",
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
    GovUKButton({ text: "Continue" }),
  ],
});
