import { access, Condition, Data, Post, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { PatternEffects } from '../effects.js'
import { dependantIncomeDetailsPageContent } from './dependantIncomeDetailsBlock.js'

const { dependantIncomeDetails: STEP_CODE } = CONTROLLED_WORK_STEP_CODES
const COLLECTION_CODE = CONTROLLED_WORK_DATA_KEYS.dependantIncomeCollection
const FIELD_CODES = ['amount', 'frequency']

const PRIOR_ANSWER_STEPS = [
  CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum,
  CONTROLLED_WORK_STEP_CODES.under18Clr,
  CONTROLLED_WORK_STEP_CODES.aggregatedMeans,
  CONTROLLED_WORK_STEP_CODES.regularIncome,
  CONTROLLED_WORK_STEP_CODES.under18Assets,
  CONTROLLED_WORK_STEP_CODES.immigrationOrAsylumType,
  CONTROLLED_WORK_STEP_CODES.asylumSupport,
  CONTROLLED_WORK_STEP_CODES.applicant,
  CONTROLLED_WORK_STEP_CODES.dependantDetails,
  CONTROLLED_WORK_STEP_CODES.dependantIncome,
]

export const dependantIncomeDetailsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/dependant-income-details',
  title: 'Add income for dependants aged 16 or over',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [dependantIncomeDetailsPageContent],
  onAccess: [
    access({
      effects: [ControlledWorkEffects.PrepareDependantIncomeDetails()],
      next: PRIOR_ANSWER_STEPS.map((stepCode) =>
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(Condition.Equals(stepCode)),
          goto: controlledWorkIncompleteStepCode,
        }),
      ),
    }),
  ],
  onSubmission: [
    submit({
      when: Post('action').match(Condition.Equals('add-another-dependant-income')),
      validate: false,
      onAlways: {
        effects: [PatternEffects.AddRepeatingItem(STEP_CODE, COLLECTION_CODE, FIELD_CODES)],
      },
    }),
    submit({
      when: Post('action').match(Condition.String.StartsWith('remove_')),
      validate: false,
      onAlways: {
        effects: [PatternEffects.RemoveRepeatingItem(STEP_CODE, COLLECTION_CODE, FIELD_CODES)],
      },
    }),
    submit({
      validate: true,
      onValid: {
        effects: [
          PatternEffects.SaveRepeatingItems(STEP_CODE, COLLECTION_CODE, FIELD_CODES),
          ControlledWorkEffects.SaveControlledWorkAnswers(STEP_CODE),
        ],
        next: [redirect({ goto: controlledWorkIncompleteStepCode })],
      },
    }),
  ],
})
