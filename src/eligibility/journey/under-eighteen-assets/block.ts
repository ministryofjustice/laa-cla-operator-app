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

export const underEighteenAssetsBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "under_eighteen_assets",
      fieldset: {
        legend: {
          text: "Does the client have assets?",
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
          message: "Select whether the client has assets",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
