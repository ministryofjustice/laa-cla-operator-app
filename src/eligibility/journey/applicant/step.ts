import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  step,
  submit,
  access,
  redirect,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { applicantHeadingBlock, applicantBlock } from "./block.js";

export const APPLICANT_STEP_CODE = "applicant";

export const applicantStep = step({
  code: APPLICANT_STEP_CODE,
  path: "/applicant",
  title: eligibilityCopy.applicant_details,
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [applicantHeadingBlock, applicantBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.applicant") })],
      },
    }),
  ],
});
