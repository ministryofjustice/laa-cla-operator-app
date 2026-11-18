import { access, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { PROPERTY_PREVIOUS_STEP_CODES } from '../propertyPage/propertyStep.js'
import { sharedOwnershipHousingCostsPageContent } from './sharedOwnershipHousingCostsBlock.js'

const { sharedOwnershipHousingCosts: STEP_CODE } = CONTROLLED_WORK_STEP_CODES
const PREREQUISITE_STEP_CODES = [
  ...PROPERTY_PREVIOUS_STEP_CODES,
  CONTROLLED_WORK_STEP_CODES.property,
  CONTROLLED_WORK_STEP_CODES.propertyLandlord,
]

export const sharedOwnershipHousingCostsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/shared-ownership-housing-costs',
  title: 'Housing costs',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [sharedOwnershipHousingCostsPageContent],
  onAccess: [
    access({
      next: PREREQUISITE_STEP_CODES.map((stepCode) =>
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
              Condition.Equals(CONTROLLED_WORK_STEP_CODES.propertyEntry),
            ),
            goto: CONTROLLED_WORK_STEP_CODES.propertyEntry,
          }),
          redirect({ goto: controlledWorkIncompleteStepCode }),
        ],
      },
    }),
  ],
})
