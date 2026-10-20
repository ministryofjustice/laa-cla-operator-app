import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { under18ClrBlock } from "./block.js";

export const UNDER_18_CLR_STEP_CODE = "under_18_clr";

export const under18ClrStep = step({
  code: UNDER_18_CLR_STEP_CODE,
  path: "/under-18-clr",
  title: eligibilityCopy.controlled_legal_representation,
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [under18ClrBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.under_18_clr") })],
      },
    }),
  ],
});
