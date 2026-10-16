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

export const employmentStatusBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "employment_status",
      fieldset: {
        legend: {
          text: "What is the client's employment status?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        {
          value: "in_work",
          text: "In work",
        },
        {
          value: "not_in_work",
          text: "Not in work",
        },
        {
          value: "self_employed",
          text: "Self-employed",
        },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select the client's employment status",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
