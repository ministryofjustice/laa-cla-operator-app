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

export const howToAggregateBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "how_to_aggregate",
      fieldset: {
        legend: {
          text: "How should income be aggregated?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        {
          value: "child_income",
          text: "Add all child income to the client's income",
        },
        {
          value: "combined",
          text: "Combine all income and assess together",
        },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select how income should be aggregated",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
