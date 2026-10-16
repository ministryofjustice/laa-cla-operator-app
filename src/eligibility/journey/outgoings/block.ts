import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKRadioInput,
  GovUKTextInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Condition,
  Self,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { poundsAmountWhenAnswered } from "../amount-validation.js";

export const outgoingsBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "childcare_payments",
      fieldset: {
        legend: {
          text: "What are the client's monthly outgoings?",
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
          message: "Select whether the client pays for childcare",
        }),
      ],
    }),
    GovUKTextInput({
      code: "childcare_payments_amount",
      label: {
        text: "Childcare payment amount",
      },
      hint: { text: "In pounds per month" },
      validWhen: [
        validation({
          condition: poundsAmountWhenAnswered("childcare_payments", "true"),
          message: "Childcare payment amount must be a number",
        }),
      ],
    }),
    GovUKRadioInput({
      code: "childcare_payments_frequency",
      fieldset: {
        legend: {
          text: "How often is the childcare payment made?",
        },
      },
      items: [
        { value: "weekly", text: "Every week" },
        { value: "fortnightly", text: "Every 2 weeks" },
        { value: "four_weekly", text: "Every 4 weeks" },
        { value: "monthly", text: "Every month" },
        { value: "three_monthly", text: "Total in last 3 months" },
      ],
    }),
    GovUKRadioInput({
      code: "maintenance_payments",
      fieldset: {
        legend: {
          text: "Does your client make maintenance payments to a former partner?",
        },
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the client makes maintenance payments",
        }),
      ],
    }),
    GovUKTextInput({
      code: "maintenance_payments_amount",
      label: {
        text: "Maintenance payment amount",
      },
      hint: { text: "In pounds per month" },
      validWhen: [
        validation({
          condition: poundsAmountWhenAnswered("maintenance_payments", "true"),
          message: "Maintenance payment amount must be a number",
        }),
      ],
    }),
    GovUKRadioInput({
      code: "maintenance_payments_frequency",
      fieldset: {
        legend: {
          text: "How often is the maintenance payment made?",
        },
      },
      items: [
        { value: "weekly", text: "Every week" },
        { value: "fortnightly", text: "Every 2 weeks" },
        { value: "four_weekly", text: "Every 4 weeks" },
        { value: "monthly", text: "Every month" },
        { value: "three_monthly", text: "Total in last 3 months" },
      ],
    }),
    GovUKRadioInput({
      code: "legal_aid_payments",
      fieldset: {
        legend: {
          text: "Does your client make payments towards legal aid for a criminal case?",
        },
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select whether the client makes legal aid payments",
        }),
      ],
    }),
    GovUKTextInput({
      code: "legal_aid_payments_amount",
      label: {
        text: "Legal aid payment amount",
      },
      hint: { text: "In pounds per month" },
      validWhen: [
        validation({
          condition: poundsAmountWhenAnswered("legal_aid_payments", "true"),
          message: "Legal aid payment amount must be a number",
        }),
      ],
    }),
    GovUKRadioInput({
      code: "legal_aid_payments_frequency",
      fieldset: {
        legend: {
          text: "How often is the legal aid payment made?",
        },
      },
      items: [
        { value: "weekly", text: "Every week" },
        { value: "fortnightly", text: "Every 2 weeks" },
        { value: "four_weekly", text: "Every 4 weeks" },
        { value: "monthly", text: "Every month" },
        { value: "three_monthly", text: "Total in last 3 months" },
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
