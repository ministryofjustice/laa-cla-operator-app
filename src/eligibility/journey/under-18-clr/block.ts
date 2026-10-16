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
          text: "Controlled legal representation",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      hint: {
        text: "Does the client have controlled legal representation?",
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
          message:
            "Select whether the client has controlled legal representation",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
