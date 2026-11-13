import { access, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { dependantDetailsPageContent } from './dependantDetailsBlock.js'

const { dependantDetails: STEP_CODE } = CONTROLLED_WORK_STEP_CODES

const PRIOR_ANSWER_STEPS = [
  CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum,
  CONTROLLED_WORK_STEP_CODES.under18Clr,
  CONTROLLED_WORK_STEP_CODES.aggregatedMeans,
  CONTROLLED_WORK_STEP_CODES.regularIncome,
  CONTROLLED_WORK_STEP_CODES.under18Assets,
  CONTROLLED_WORK_STEP_CODES.immigrationOrAsylumType,
  CONTROLLED_WORK_STEP_CODES.asylumSupport,
  CONTROLLED_WORK_STEP_CODES.applicant,
]

export const dependantDetailsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/dependant-details',
  title: "Tell us about your client's dependants",
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [dependantDetailsPageContent],
  onAccess: [
    access({
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
      validate: true,
      onValid: {
        effects: [ControlledWorkEffects.SaveControlledWorkAnswers(STEP_CODE)],
        next: [redirect({ goto: controlledWorkIncompleteStepCode })],
      },
    }),
  ],
})
