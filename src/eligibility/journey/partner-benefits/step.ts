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
import { EligibilityConditions } from "../../registries/effects.js";
import { partnerBenefitsBlock } from "../partner-blocks.js";

export const PARTNER_BENEFITS_STEP_CODE = "partner_benefits";

export const partnerBenefitsStep = step({
  code: PARTNER_BENEFITS_STEP_CODE,
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(PARTNER_BENEFITS_STEP_CODE),
  },
  path: "/partner-benefits",
  title: "Partner benefits",
  validWhen: [
    validation({
      condition: Post("partner_benefits").match(Condition.IsRequired()),
      message: "Select whether the partner receives benefits",
    }),
  ],
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [partnerBenefitsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.partner_benefits") })],
      },
    }),
  ],
});
