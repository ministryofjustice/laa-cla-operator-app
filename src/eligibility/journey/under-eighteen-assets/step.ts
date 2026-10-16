import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { underEighteenAssetsBlock } from "./block.js";

export const UNDER_EIGHTEEN_ASSETS_STEP_CODE = "under_eighteen_assets";

export const underEighteenAssetsStep = step({
  code: UNDER_EIGHTEEN_ASSETS_STEP_CODE,
  path: "/under-eighteen-assets",
  title: "Assets",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [underEighteenAssetsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.under_eighteen_assets") })],
      },
    }),
  ],
});
