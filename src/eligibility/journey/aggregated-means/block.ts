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

export const aggregatedMeansBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "aggregated_means",
      fieldset: {
        legend: {
          text: "Should the client's income be aggregated?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: "Select yes if the client's income should be combined with dependents for assessment.",
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
          message: "Select whether income should be aggregated",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
