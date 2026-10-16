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
import { immigrationOrAsylumBlock } from "./block.js";

export const IMMIGRATION_OR_ASYLUM_STEP_CODE = "immigration_or_asylum";

export const immigrationOrAsylumStep = step({
  code: IMMIGRATION_OR_ASYLUM_STEP_CODE,
  path: "/immigration-or-asylum",
  title: "Immigration or asylum",
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(IMMIGRATION_OR_ASYLUM_STEP_CODE),
  },
  validWhen: [
    validation({
      condition: Post("immigration_or_asylum").match(Condition.IsRequired()),
      message:
        "Select whether the legal problem is related to immigration or asylum",
    }),
  ],
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
