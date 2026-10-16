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
import { employmentStatusBlock } from "./block.js";

export const EMPLOYMENT_STATUS_STEP_CODE = "employment_status";

export const employmentStatusStep = step({
  code: EMPLOYMENT_STATUS_STEP_CODE,
  reachability: {
    entryWhen: true,
  },
  path: "/employment-status",
  title: "Employment status",
  validWhen: [
    validation({
      condition: Post("employment_status").match(Condition.IsRequired()),
      message: "Select the client's employment status",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [employmentStatusBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.employment_status") })],
      },
    }),
  ],
});
