import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { immigrationOrAsylumBlock } from "./block.js";

export const IMMIGRATION_OR_ASYLUM_STEP_CODE = "immigration_or_asylum";

export const immigrationOrAsylumStep = step({
  code: IMMIGRATION_OR_ASYLUM_STEP_CODE,
  path: "/immigration-or-asylum",
  title: "Immigration or asylum",
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [immigrationOrAsylumBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.immigration_or_asylum") })],
      },
    }),
  ],
});
