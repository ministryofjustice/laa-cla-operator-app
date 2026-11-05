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

export const immigrationOrAsylumBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "immigration_or_asylum",
      fieldset: {
        legend: {
          text: eligibilityCopy.is_the_legal_problem_related_to_immigration_or_asylum,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        { value: "true", text: eligibilityCopy.yes },
        { value: "false", text: eligibilityCopy.no },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message:
            eligibilityCopy.select_whether_the_legal_problem_is_related_to_immigration_or_asylum,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
