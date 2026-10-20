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

export const aggregatedMeansBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "aggregated_means",
      fieldset: {
        legend: {
          text: eligibilityCopy.should_the_client_s_income_be_aggregated,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: eligibilityCopy.select_yes_if_the_client_s_income_should_be_combined_wi_9db0925766,
      },
      items: [
        {
          value: "true",
          text: eligibilityCopy.yes,
        },
        {
          value: "false",
          text: eligibilityCopy.no,
        },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: eligibilityCopy.select_whether_income_should_be_aggregated,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
