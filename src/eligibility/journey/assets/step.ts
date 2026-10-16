import {
  step,
  submit,
  access,
  redirect,
  Data,
  Post,
  Condition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import {
  addBankAccountButtonBlock,
  assetsContinueButtonBlock,
  assetsHeadingBlock,
  assetsQuestionsBlock,
  bankAccountsGuidanceBlock,
  bankAccountsHeadingBlock,
  bankAccountsTableBlock,
  bankruptClientsDetailsBlock,
  costOfLivingPaymentsDetailsBlock,
} from "./block.js";

export const ASSETS_STEP_CODE = "assets";

export const assetsStep = step({
  code: ASSETS_STEP_CODE,
  path: "/assets",
  title: "Assets",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [
    assetsHeadingBlock,
    bankruptClientsDetailsBlock,
    bankAccountsHeadingBlock,
    bankAccountsGuidanceBlock,
    bankAccountsTableBlock,
    costOfLivingPaymentsDetailsBlock,
    addBankAccountButtonBlock,
    assetsQuestionsBlock,
    assetsContinueButtonBlock,
  ],
  onSubmission: [
    submit({
      when: Post("action").match(Condition.Equals("add")),
      validate: false,
      onValid: {
        effects: [
          EligibilityEffects.SaveAnswers(),
          EligibilityEffects.AddBankAccountRow(),
        ],
        next: [redirect({ goto: Post("currentStep") })],
      },
    }),
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.assets") })],
      },
    }),
  ],
});
