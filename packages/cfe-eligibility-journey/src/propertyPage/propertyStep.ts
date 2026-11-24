import { access, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { propertyPageContent } from './propertyBlock.js'

const { property: STEP_CODE } = CONTROLLED_WORK_STEP_CODES

export const PROPERTY_PREVIOUS_STEP_CODES = [
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
  CONTROLLED_WORK_STEP_CODES.partnerDetails,
  CONTROLLED_WORK_STEP_CODES.partnerEmploymentStatus,
  CONTROLLED_WORK_STEP_CODES.partnerIncome,
  CONTROLLED_WORK_STEP_CODES.partnerBenefits,
  CONTROLLED_WORK_STEP_CODES.partnerBenefitDetails,
  CONTROLLED_WORK_STEP_CODES.partnerOtherIncome,
  CONTROLLED_WORK_STEP_CODES.outgoings,
  CONTROLLED_WORK_STEP_CODES.partnerOutgoings,
] as const

export const propertyStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/property',
  title: 'Does your client own the home they usually live in?',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [propertyPageContent],
  onAccess: [
    access({
      next: PROPERTY_PREVIOUS_STEP_CODES.map((stepCode) =>
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
              Condition.Equals(CONTROLLED_WORK_STEP_CODES.propertyLandlord),
            ),
            goto: CONTROLLED_WORK_STEP_CODES.propertyLandlord,
          }),
          redirect({
            when: Data(CONTROLLED_WORK_DATA_KEYS.nextStep).match(
              Condition.Equals(CONTROLLED_WORK_STEP_CODES.mortgageOrLoanPayment),
            ),
            goto: CONTROLLED_WORK_STEP_CODES.mortgageOrLoanPayment,
          }),
          redirect({
            when: Data(CONTROLLED_WORK_DATA_KEYS.nextStep).match(
              Condition.Equals(CONTROLLED_WORK_STEP_CODES.propertyEntry),
            ),
            goto: CONTROLLED_WORK_STEP_CODES.propertyEntry,
          }),
          redirect({
            when: Data(CONTROLLED_WORK_DATA_KEYS.nextStep).match(
              Condition.Equals(CONTROLLED_WORK_STEP_CODES.additionalProperty),
            ),
            goto: CONTROLLED_WORK_STEP_CODES.additionalProperty,
          }),
          redirect({ goto: controlledWorkIncompleteStepCode }),
        ],
      },
    }),
  ],
})
