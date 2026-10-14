import { step, submit, access, redirect, Data, validation, Post, Condition } from "@ministryofjustice/hmpps-forge/core/authoring";
import { EligibilityEffects } from "../../registries/effects.js";
import { immigrationOrAsylumTypeBlock } from "../matter-type-blocks.js";

export const IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE = "immigration_or_asylum_type";

export const immigrationOrAsylumTypeStep = step({
  code: IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE,
  path: "/immigration-or-asylum-type",
  title: "Immigration or asylum type",
  validWhen: [validation({ condition: Post("immigration_or_asylum_type").match(Condition.IsRequired()), message: "Select the type of immigration or asylum matter" })],
  onAccess: [access({ effects: [EligibilityEffects.LoadAnswers()] })],
  view: { template: "main/eligibility/step.njk" },
  blocks: [immigrationOrAsylumTypeBlock],
  onSubmission: [submit({ validate: true, onValid: { effects: [EligibilityEffects.SaveAnswers()], next: [redirect({ goto: Data("nav.immigration_or_asylum_type") })] } })],
});
