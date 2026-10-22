import eligibilityCopy from "../../locales/en.json" with { type: "json" };
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

export const howToAggregateBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "how_to_aggregate",
      fieldset: {
        legend: {
          text: eligibilityCopy.how_should_income_be_aggregated,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        {
          value: "child_income",
          text: eligibilityCopy.add_all_child_income_to_the_client_s_income,
        },
        {
          value: "combined",
          text: eligibilityCopy.combine_all_income_and_assess_together,
        },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: eligibilityCopy.select_how_income_should_be_aggregated,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
