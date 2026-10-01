import {
  Condition,
  Self,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKRadioInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { CallerType } from "#src/journeys/types.js";

export const whosCallingBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "callerType",
      fieldset: {
        legend: {
          text: "Are you calling on behalf of yourself or another person?",
          classes: "govuk-fieldset__legend--m",
        },
      },
      items: [
        { value: CallerType.client, text: "Myself" },
        { value: CallerType.thirdParty, text: "Another person" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message:
            "Please select whether you are calling on behalf of yourself or another person.",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
