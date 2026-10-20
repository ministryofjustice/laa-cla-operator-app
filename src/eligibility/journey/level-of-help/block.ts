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

export const levelOfHelpBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "level_of_help",
      fieldset: {
        legend: {
          text: eligibilityCopy.what_type_of_legal_aid_is_needed,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        {
          value: "controlled",
          text: eligibilityCopy.controlled_work_advice_only,
        },
        {
          value: "certificated",
          text: eligibilityCopy.certificated_work_representation,
        },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: eligibilityCopy.select_the_type_of_legal_aid_needed,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
