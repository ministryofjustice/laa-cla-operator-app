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
  partnerBankAccountsHeadingBlock,
  partnerBankAccountsTableBlock,
  partnerBankAccountsButtonsBlock,
} from "../bank-accounts/block.js";
import { partnerAssetsBlock } from "./block.js";

export const PARTNER_ASSETS_STEP_CODE = "partner_assets";

export const partnerAssetsStep = step({
  code: PARTNER_ASSETS_STEP_CODE,
  path: "/partner-assets",
  title: "Partner assets",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [
    partnerAssetsBlock,
    partnerBankAccountsHeadingBlock,
    partnerBankAccountsTableBlock,
    partnerBankAccountsButtonsBlock,
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
        next: [redirect({ goto: Data("nav.partner_assets") })],
      },
    }),
  ],
});
