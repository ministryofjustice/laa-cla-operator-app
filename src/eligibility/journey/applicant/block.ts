import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
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

export const applicantHeadingBlock = HtmlBlock({
  tag: "h1",
  content: eligibilityCopy.about_your_client,
  classes: "govuk-heading-xl",
});

export const applicantBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "partner",
      fieldset: {
        legend: {
          text: eligibilityCopy.does_your_client_have_a_partner,
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
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
          message: eligibilityCopy.select_whether_the_client_has_a_partner,
        }),
      ],
    }),
    GovUKRadioInput({
      code: "passporting",
      fieldset: {
        legend: {
          text: eligibilityCopy.does_your_client_receive_a_passporting_benefit,
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
        },
      },
      hint: {
        text: eligibilityCopy.such_as_universal_credit_income_support_income_based_jo_a0306ce834,
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
            eligibilityCopy.select_whether_the_client_receives_a_passporting_benefit,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
