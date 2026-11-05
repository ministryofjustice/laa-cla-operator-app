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

export const under18ClrBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "controlled_legal_representation",
      fieldset: {
        legend: {
          text: eligibilityCopy.controlled_legal_representation,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: eligibilityCopy.does_the_client_have_controlled_legal_representation,
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
          message:
            eligibilityCopy.select_whether_the_client_has_controlled_legal_representation,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
