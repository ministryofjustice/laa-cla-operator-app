import { access, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { partnerDetailsPageContent } from './partnerDetailsBlock.js'

const {
  partnerDetails: STEP_CODE,
  partnerEmploymentStatus: PARTNER_EMPLOYMENT_STATUS_STEP_CODE,
  property: PROPERTY_STEP_CODE,
} = CONTROLLED_WORK_STEP_CODES

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
  CONTROLLED_WORK_STEP_CODES.dependantIncomeDetails,
  CONTROLLED_WORK_STEP_CODES.employmentStatus,
  CONTROLLED_WORK_STEP_CODES.income,
  CONTROLLED_WORK_STEP_CODES.benefits,
  CONTROLLED_WORK_STEP_CODES.benefitDetails,
  CONTROLLED_WORK_STEP_CODES.otherIncome,
]

export const partnerDetailsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/partner-details',
  title: 'Tell us about the partner',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [partnerDetailsPageContent],
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
        next: [
          redirect({
            when: Data(CONTROLLED_WORK_DATA_KEYS.nextStep).match(
              Condition.Equals(PARTNER_EMPLOYMENT_STATUS_STEP_CODE),
            ),
            goto: PARTNER_EMPLOYMENT_STATUS_STEP_CODE,
          }),
          redirect({
            when: Data(CONTROLLED_WORK_DATA_KEYS.nextStep).match(Condition.Equals(PROPERTY_STEP_CODE)),
            goto: PROPERTY_STEP_CODE,
          }),
          redirect({ goto: controlledWorkIncompleteStepCode }),
        ],
      },
    }),
  ],
})
