import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { immigrationOrAsylumTypeBlock } from "../matter-type-blocks.js";

export const IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE =
  "immigration_or_asylum_type";

export const immigrationOrAsylumTypeStep = step({
  code: IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE,
  path: "/immigration-or-asylum-type",
  title: "Immigration or asylum type",
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [immigrationOrAsylumTypeBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.immigration_or_asylum_type") })],
      },
    }),
  ],
});
