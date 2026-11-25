import { access, Answer, Condition, Data, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { cannotUseServiceStepCode } from '../propertyLandlordPage/cannotUseServiceStep.js'
import { ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES } from '../additionalPropertyPage/additionalPropertyStep.js'
import { partnerAdditionalPropertyPageContent } from './partnerAdditionalPropertyBlock.js'

const { partnerAdditionalProperty: STEP_CODE } = CONTROLLED_WORK_STEP_CODES

export const PARTNER_ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES = [
  ...ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES,
  CONTROLLED_WORK_STEP_CODES.additionalProperty,
  CONTROLLED_WORK_STEP_CODES.additionalPropertyDetails,
]

export const partnerAdditionalPropertyStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/partner-additional-property',
  title: 'Does the partner own any other property, a holiday home or land?',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [partnerAdditionalPropertyPageContent],
  onAccess: [
    access({
      next: PARTNER_ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES.map((stepCode) =>
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
            when: Answer('partner-additional-property-owned').match(Condition.Equals('shared_ownership')),
            goto: cannotUseServiceStepCode,
          }),
          redirect({
            when: Answer('partner-additional-property-owned').match(
              Condition.String.MatchesRegex('^(with_mortgage|outright)$'),
            ),
            goto: CONTROLLED_WORK_STEP_CODES.partnerAdditionalPropertyDetails,
          }),
          redirect({
            when: Data(CONTROLLED_WORK_DATA_KEYS.nextStep).match(Condition.Equals(CONTROLLED_WORK_STEP_CODES.assets)),
            goto: CONTROLLED_WORK_STEP_CODES.assets,
          }),
          redirect({ goto: controlledWorkIncompleteStepCode }),
        ],
      },
    }),
  ],
})
