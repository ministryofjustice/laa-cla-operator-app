import { access, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { howToAggregatePageContent } from './howToAggregateBlock.js'

const {
  howToAggregate: STEP_CODE,
  immigrationOrAsylumType: IMMIGRATION_OR_ASYLUM_TYPE_STEP_CODE,
} = CONTROLLED_WORK_STEP_CODES

export const howToAggregateStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/how-to-aggregate',
  title: "You are going to aggregate your client's means with another person's means",
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [howToAggregatePageContent],
  onAccess: [
    access({
      next: [
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum),
          ),
          goto: controlledWorkIncompleteStepCode,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.under18Clr),
          ),
          goto: controlledWorkIncompleteStepCode,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.aggregatedMeans),
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
