// TODO: Review if this step is required. Bank accounts are currently collected as part
// of the assets and partner_assets steps via blocks (bankAccountsTableBlock, etc.).
// This standalone step is not registered in the journey and is therefore unreachable.
// If not needed, remove this file and bank-accounts/block.ts exports that are specific
// to this step (e.g., bankAccountsStep definition).

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
import {
  bankAccountsHeadingBlock,
  bankAccountsTableBlock,
  bankAccountsButtonsBlock,
} from "./block.js";

export const BANK_ACCOUNTS_STEP_CODE = "bank_accounts";

export const bankAccountsStep = step({
  code: BANK_ACCOUNTS_STEP_CODE,
  path: "/bank-accounts",
  title: "Bank accounts",
  validWhen: [
    validation({
      condition: Post("action").not.match(Condition.Equals("add")),
      message: "Enter bank account details",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [
    bankAccountsHeadingBlock,
    bankAccountsTableBlock,
    bankAccountsButtonsBlock,
  ],
  onSubmission: [
    submit({
      when: Post("action").match(Condition.Equals("add")),
      validate: false,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Post("currentStep") })],
      },
    }),
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.bank_accounts") })],
      },
    }),
  ],
});
