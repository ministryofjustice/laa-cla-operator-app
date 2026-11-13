import { access, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { underEighteenAssetsPageContent } from './underEighteenAssetsBlock.js'

const {
  under18Assets: STEP_CODE,
  immigrationOrAsylum: IMMIGRATION_OR_ASYLUM_STEP_CODE,
  immigrationOrAsylumType: IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE,
} = CONTROLLED_WORK_STEP_CODES

export const underEighteenAssetsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/under-eighteen-assets',
  title: 'Does your client have assets worth £2,500 or more?',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [underEighteenAssetsPageContent],
  onAccess: [
    access({
      next: [
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(IMMIGRATION_OR_ASYLUM_STEP_CODE),
          ),
          goto: controlledWorkIncompleteStepCode,
        }),
      ],
    }),
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [ControlledWorkEffects.SaveControlledWorkAnswers(STEP_CODE)],
        next: [
          redirect({
            when: Data(CONTROLLED_WORK_DATA_KEYS.nextStep).match(
              Condition.Equals(IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE),
            ),
            goto: IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE,
          }),
          redirect({ goto: controlledWorkIncompleteStepCode }),
        ],
      },
    }),
  ],
})
