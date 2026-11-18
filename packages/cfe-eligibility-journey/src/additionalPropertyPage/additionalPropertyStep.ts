import { access, Answer, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { PROPERTY_PREVIOUS_STEP_CODES } from '../propertyPage/propertyStep.js'
import { cannotUseServiceStepCode } from '../propertyLandlordPage/cannotUseServiceStep.js'
import { additionalPropertyPageContent } from './additionalPropertyBlock.js'

const { additionalProperty: STEP_CODE } = CONTROLLED_WORK_STEP_CODES
export const ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES = [
  ...PROPERTY_PREVIOUS_STEP_CODES,
  CONTROLLED_WORK_STEP_CODES.property,
  CONTROLLED_WORK_STEP_CODES.propertyLandlord,
  CONTROLLED_WORK_STEP_CODES.sharedOwnershipHousingCosts,
  CONTROLLED_WORK_STEP_CODES.propertyEntry,
]

export const additionalPropertyStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/additional-property',
  title: 'Does your client own any other property, a holiday home or land?',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [additionalPropertyPageContent],
  onAccess: [
    access({
      next: ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES.map((stepCode) =>
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
            when: Answer('additional-property-owned').match(Condition.Equals('shared_ownership')),
            goto: cannotUseServiceStepCode,
          }),
          redirect({
            when: Answer('additional-property-owned').match(Condition.String.MatchesRegex('^(with_mortgage|outright)$')),
            goto: CONTROLLED_WORK_STEP_CODES.additionalPropertyDetails,
          }),
          redirect({ goto: controlledWorkIncompleteStepCode }),
        ],
      },
    }),
  ],
})
