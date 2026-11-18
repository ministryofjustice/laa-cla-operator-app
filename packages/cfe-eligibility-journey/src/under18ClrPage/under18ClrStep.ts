import { access, Condition, Data, Post, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { ControlledWorkEffects, CONTROLLED_WORK_DATA_KEYS } from '../controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { under18ClrPageContent } from './under18ClrBlock.js'

const {
  under18Clr: STEP_CODE,
  immigrationOrAsylum: IMMIGRATION_OR_ASYLUM_STEP_CODE,
  aggregatedMeans: AGGREGATED_MEANS_STEP_CODE,
} = CONTROLLED_WORK_STEP_CODES

export const under18ClrStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/under-18-clr',
  title: 'Is the work controlled legal representation (CLR)?',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [under18ClrPageContent],
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
            when: Post('controlled-legal-representation').match(Condition.Equals('no')),
            goto: AGGREGATED_MEANS_STEP_CODE,
          }),
          redirect({ goto: controlledWorkIncompleteStepCode }),
        ],
      },
    }),
  ],
})