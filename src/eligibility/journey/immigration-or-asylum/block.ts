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

export const immigrationOrAsylumBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "immigration_or_asylum",
      fieldset: {
        legend: {
          text: "Is the legal problem related to immigration or asylum?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the legal problem is related to immigration or asylum",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
