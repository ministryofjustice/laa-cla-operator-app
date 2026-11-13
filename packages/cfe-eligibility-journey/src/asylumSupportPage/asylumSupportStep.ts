import { access, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { asylumSupportPageContent } from './asylumSupportBlock.js'

const {
  asylumSupport: STEP_CODE,
  immigrationOrAsylum: IMMIGRATION_OR_ASYLUM_STEP_CODE,
  immigrationOrAsylumType: IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE,
} = CONTROLLED_WORK_STEP_CODES

export const asylumSupportStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/asylum-support',
  title: 'Does your client get Asylum Support?',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [asylumSupportPageContent],
  onAccess: [
    access({
      next: [
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(IMMIGRATION_OR_ASYLUM_STEP_CODE),
          ),
          goto: controlledWorkIncompleteStepCode,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE),
          ),
          goto: IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE,
        }),
      ],
    }),
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [ControlledWorkEffects.SaveControlledWorkAnswers(STEP_CODE)],
        next: [redirect({ goto: controlledWorkIncompleteStepCode })],
      },
    }),
  ],
})
