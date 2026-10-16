import {
  step,
  submit,
  access,
  redirect,
  Data,
  validation,
  Condition,
  Post,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { EligibilityConditions } from "../../registries/effects.js";
import { levelOfHelpBlock } from "./block.js";

export const LEVEL_OF_HELP_STEP_CODE = "level_of_help";

export const levelOfHelpStep = step({
  code: LEVEL_OF_HELP_STEP_CODE,
  path: "/level-of-help",
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(LEVEL_OF_HELP_STEP_CODE),
  },
  title: "Level of legal aid",
  validWhen: [
    validation({
      condition: Post("level_of_help").match(Condition.IsRequired()),
      message: "Select the type of legal aid needed",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [levelOfHelpBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.level_of_help") })],
      },
    }),
  ],
});
