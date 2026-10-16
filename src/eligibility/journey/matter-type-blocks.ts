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
          text: "What type of immigration or asylum matter is it?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        { value: "immigration", text: "Immigration" },
        { value: "asylum", text: "Asylum" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select the type of immigration or asylum matter",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const immigrationOrAsylumTypeUpperTribunalBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "immigration_or_asylum_type_upper_tribunal",
      fieldset: {
        legend: {
          text: "What type of immigration or asylum matter is it?",
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        { value: "upper_tribunal", text: "Upper tribunal appeal" },
        { value: "other", text: "Other immigration matter" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select the type of matter",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const asylumSupportBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "asylum_support",
      fieldset: {
        legend: {
          text: "Is the client receiving asylum support?",
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
          message: "Select whether the client is receiving asylum support",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});

export const domesticAbuseApplicantBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "domestic_abuse_applicant",
      fieldset: {
        legend: {
          text: "Is this a domestic abuse case?",
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
          message: "Select whether this is a domestic abuse case",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
