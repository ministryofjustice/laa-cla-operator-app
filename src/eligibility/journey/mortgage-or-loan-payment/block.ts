import {
  CollectionBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKTextInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const mortgageOrLoanPaymentBlock = CollectionBlock({
  collection: [
    GovUKTextInput({
      code: "mortgage_or_loan_payment",
      label: {
        text: "What is the monthly mortgage or loan payment?",
        classes: "govuk-label--l",
        isPageHeading: true,
      },
      hint: {
        text: "In pounds per month",
      },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter the monthly mortgage or loan payment",
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
