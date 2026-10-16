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
  bankAccountsHeadingBlock,
  bankAccountsTableBlock,
  bankAccountsButtonsBlock,
} from "../bank-accounts/block.js";
import { assetsQuestionsBlock } from "./block.js";

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
    assetsQuestionsBlock,
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
        next: [redirect({ goto: Data("nav.assets") })],
      },
    }),
  ],
});
