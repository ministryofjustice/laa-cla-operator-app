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
import { EligibilityEffects } from "../registries/effects.js";
import { EligibilityConditions } from "../registries/conditions.js";
import {
  immigrationOrAsylumTypeUpperTribunalBlock,
  asylumSupportBlock,
  domesticAbuseApplicantBlock,
} from "./matter-type-blocks.js";

export const IMMIGRATION_OR_ASYLUM_TYPE_UPPER_TRIBUNAL_STEP_CODE =
  "immigration_or_asylum_type_upper_tribunal";
export const ASYLUM_SUPPORT_STEP_CODE = "asylum_support";
export const DOMESTIC_ABUSE_APPLICANT_STEP_CODE = "domestic_abuse_applicant";

export const immigrationOrAsylumTypeUpperTribunalStep = step({
  code: IMMIGRATION_OR_ASYLUM_TYPE_UPPER_TRIBUNAL_STEP_CODE,
  path: "/immigration-or-asylum-type-upper-tribunal",
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(
      IMMIGRATION_OR_ASYLUM_TYPE_UPPER_TRIBUNAL_STEP_CODE,
    ),
  },
  title: "Immigration or asylum type (upper tribunal)",
  validWhen: [
    validation({
      condition: Post("immigration_or_asylum_type_upper_tribunal").match(
        Condition.IsRequired(),
      ),
      message: "Select the type of matter",
    }),
  ],
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [immigrationOrAsylumTypeUpperTribunalBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [
          redirect({
            goto: Data("nav.immigration_or_asylum_type_upper_tribunal"),
          }),
        ],
      },
    }),
  ],
});

export const asylumSupportStep = step({
  code: ASYLUM_SUPPORT_STEP_CODE,
  path: "/asylum-support",
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(ASYLUM_SUPPORT_STEP_CODE),
  },
  title: "Asylum support",
  validWhen: [
    validation({
      condition: Post("asylum_support").match(Condition.IsRequired()),
      message: "Select whether the client is receiving asylum support",
    }),
  ],
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [asylumSupportBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.asylum_support") })],
      },
    }),
  ],
});

export const domesticAbuseApplicantStep = step({
  code: DOMESTIC_ABUSE_APPLICANT_STEP_CODE,
  path: "/domestic-abuse-applicant",
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(
      DOMESTIC_ABUSE_APPLICANT_STEP_CODE,
    ),
  },
  title: "Domestic abuse",
  validWhen: [
    validation({
      condition: Post("domestic_abuse_applicant").match(Condition.IsRequired()),
      message: "Select whether this is a domestic abuse case",
    }),
  ],
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [domesticAbuseApplicantBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.domestic_abuse_applicant") })],
      },
    }),
  ],
});
