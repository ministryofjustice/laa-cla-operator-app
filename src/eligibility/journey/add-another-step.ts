import {
  step,
  submit,
  access,
  redirect,
  Condition,
  Data,
  Post,
  type StepDefinition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { BlockDefinition } from "@ministryofjustice/hmpps-forge/core/components";
import { EligibilityEffects } from "../registries/effects.js";
import { defaultSubmitBlock } from "./income/block.js";

export interface AddAnotherStepOptions {
  code: string;
  title: string;
  /** The session key of the list the step edits. */
  listKey: string;
  blocks: BlockDefinition[];
  /** Extra access hooks, run before the answers load. */
  onAccess?: Array<ReturnType<typeof access>>;
}

/**
 * A step that edits an add-another list: Add another saves the rows and
 * returns to the step with one more, Remove drops a row, and Continue
 * validates every row and moves on.
 * @param {AddAnotherStepOptions} options - the step's code, title, list and blocks
 * @returns {StepDefinition} the step
 */
export function createAddAnotherStep(
  options: AddAnotherStepOptions,
): StepDefinition {
  const path = options.code.replace(/_/gu, "-");
  const stayHere = [redirect({ goto: path })];

  return step({
    code: options.code,
    path: `/${path}`,
    title: options.title,
    onAccess: [
      ...(options.onAccess ?? []),
      access({ effects: [EligibilityEffects.LoadAnswers()] }),
    ],
    view: { template: "main/eligibility/step.njk" },
    blocks: [defaultSubmitBlock, ...options.blocks],
    onSubmission: [
      submit({
        when: Post("action").match(Condition.Equals("add")),
        validate: false,
        onValid: {
          effects: [
            EligibilityEffects.SaveAnswers(),
            EligibilityEffects.AddListRow(options.listKey),
          ],
          next: stayHere,
        },
      }),
      submit({
        when: Post("remove").match(Condition.IsRequired()),
        validate: false,
        onValid: {
          effects: [
            EligibilityEffects.SaveAnswers(),
            EligibilityEffects.RemoveListRow(options.listKey),
          ],
          next: stayHere,
        },
      }),
      submit({
        validate: true,
        onValid: {
          effects: [EligibilityEffects.SaveAnswers()],
          next: [redirect({ goto: Data(`nav.${options.code}`) })],
        },
      }),
    ],
  });
}
