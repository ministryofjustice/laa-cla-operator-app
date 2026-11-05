import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { mortgageOrLoanPaymentBlock } from "./block.js";

export const MORTGAGE_OR_LOAN_PAYMENT_STEP_CODE = "mortgage_or_loan_payment";

export const mortgageOrLoanPaymentStep = step({
  code: MORTGAGE_OR_LOAN_PAYMENT_STEP_CODE,
  path: "/mortgage-or-loan-payment",
  title: eligibilityCopy.mortgage_or_loan_payment,
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [mortgageOrLoanPaymentBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.mortgage_or_loan_payment") })],
      },
    }),
  ],
});
