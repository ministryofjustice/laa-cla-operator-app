import { access, Answer, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { propertyLandlordPageContent } from './propertyLandlordBlock.js'
import { cannotUseServiceStepCode } from './cannotUseServiceStep.js'
import { PROPERTY_PREVIOUS_STEP_CODES } from '../propertyPage/propertyStep.js'

const { propertyLandlord: STEP_CODE } = CONTROLLED_WORK_STEP_CODES
const PROPERTY_PREREQUISITE_STEP_CODES = [...PROPERTY_PREVIOUS_STEP_CODES, CONTROLLED_WORK_STEP_CODES.property]

export const propertyLandlordStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/property-landlord',
  title: 'Is the landlord the only other joint-owner?',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [propertyLandlordPageContent],
  onAccess: [
    access({
      next: PROPERTY_PREREQUISITE_STEP_CODES.map((stepCode) =>
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
            when: Answer('property-landlord').match(Condition.Equals('no')),
            goto: cannotUseServiceStepCode,
          }),
          redirect({
            when: Data(CONTROLLED_WORK_DATA_KEYS.nextStep).match(
              Condition.Equals(CONTROLLED_WORK_STEP_CODES.sharedOwnershipHousingCosts),
            ),
            goto: CONTROLLED_WORK_STEP_CODES.sharedOwnershipHousingCosts,
          }),
          redirect({ goto: controlledWorkIncompleteStepCode }),
        ],
      },
    }),
  ],
})
