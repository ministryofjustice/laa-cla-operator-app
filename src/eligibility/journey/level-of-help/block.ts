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

export const levelOfHelpBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "level_of_help",
      fieldset: {
        legend: {
          text: "What type of legal aid is needed?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        {
          value: "controlled",
          text: "Controlled work (advice only)",
        },
        {
          value: "certificated",
          text: "Certificated work (representation)",
        },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select the type of legal aid needed",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
