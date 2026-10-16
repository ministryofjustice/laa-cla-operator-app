import {
  step,
  submit,
  access,
  redirect,
  Data,
  validation,
  Post,
  Condition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { EligibilityConditions } from "../../registries/conditions.js";
import { mortgageOrLoanPaymentBlock } from "./block.js";

export const MORTGAGE_OR_LOAN_PAYMENT_STEP_CODE = "mortgage_or_loan_payment";

export const mortgageOrLoanPaymentStep = step({
  code: MORTGAGE_OR_LOAN_PAYMENT_STEP_CODE,
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(MORTGAGE_OR_LOAN_PAYMENT_STEP_CODE),
  },
  path: "/mortgage-or-loan-payment",
  title: "Mortgage or loan payment",
  validWhen: [
    validation({
      condition: Post("mortgage_or_loan_payment").match(Condition.IsRequired()),
      message: "Enter the monthly mortgage or loan payment",
    }),
  ],
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
