import { access, Condition, Data, Post, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { aggregatedMeansPageContent } from './aggregatedMeansBlock.js'

const { aggregatedMeans: STEP_CODE, howToAggregate: HOW_TO_AGGREGATE_STEP_CODE, regularIncome: REGULAR_INCOME_STEP_CODE } =
  CONTROLLED_WORK_STEP_CODES

export const aggregatedMeansStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/aggregated-means',
  title: "Will you aggregate your client's means with another person's means?",
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [aggregatedMeansPageContent],
  onAccess: [
    access({
      next: [
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum),
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
            when: Post('aggregated-means').match(Condition.Equals('yes')),
            goto: HOW_TO_AGGREGATE_STEP_CODE,
          }),
          redirect({
            when: Post('aggregated-means').match(Condition.Equals('no')),
            goto: REGULAR_INCOME_STEP_CODE,
          }),
          redirect({ goto: controlledWorkIncompleteStepCode }),
        ],
      },
    }),
  ],
})
