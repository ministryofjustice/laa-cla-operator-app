import eligibilityCopy from "../locales/en.json" with { type: "json" };
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

export const immigrationOrAsylumTypeBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "immigration_or_asylum_type",
      fieldset: {
        legend: {
          text: eligibilityCopy.what_type_of_immigration_or_asylum_matter_is_this,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        {
          value: "immigration_clr",
          text: eligibilityCopy.immigration_clr,
        },
        {
          value: "immigration_legal_help",
          text: eligibilityCopy.immigration_legal_help,
        },
        { value: "asylum", text: eligibilityCopy.asylum_legal_help_or_clr },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message:
            eligibilityCopy.select_the_type_of_immigration_or_asylum_matter,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});

export const immigrationOrAsylumTypeUpperTribunalBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "immigration_or_asylum_type_upper_tribunal",
      fieldset: {
        legend: {
          text: eligibilityCopy.what_type_of_immigration_or_asylum_matter_is_it,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        {
          value: "upper_tribunal",
          text: eligibilityCopy.upper_tribunal_appeal,
        },
        { value: "other", text: eligibilityCopy.other_immigration_matter },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: eligibilityCopy.select_the_type_of_matter,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});

export const asylumSupportBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "asylum_support",
      fieldset: {
        legend: {
          text: eligibilityCopy.is_the_client_receiving_asylum_support,
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
            eligibilityCopy.select_whether_the_client_is_receiving_asylum_support,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});

export const domesticAbuseApplicantBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "domestic_abuse_applicant",
      fieldset: {
        legend: {
          text: eligibilityCopy.is_this_a_domestic_abuse_case,
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
          message: eligibilityCopy.select_whether_this_is_a_domestic_abuse_case,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
