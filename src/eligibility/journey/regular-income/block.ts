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

export const regularIncomeBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "regular_income",
      fieldset: {
        legend: {
          text: eligibilityCopy.does_the_client_have_regular_income,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
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
          message: eligibilityCopy.select_whether_the_client_has_regular_income,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
