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
import { propertyBlock } from "./block.js";

export const PROPERTY_STEP_CODE = "property";

export const propertyStep = step({
  code: PROPERTY_STEP_CODE,
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(PROPERTY_STEP_CODE),
  },
  path: "/property",
  title: "Property details",
  validWhen: [
    validation({
      condition: Post("property_owned").match(Condition.IsRequired()),
      message: "Select how the property is owned",
    }),
  ],
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadAnswers()],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [propertyBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [EligibilityEffects.SaveAnswers()],
        next: [redirect({ goto: Data("nav.property") })],
      },
    }),
  ],
});
