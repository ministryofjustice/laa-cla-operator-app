import { access, Condition, Data, Post, redirect, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import {
  CONTROLLED_WORK_DATA_KEYS,
  ControlledWorkEffects,
} from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { PatternEffects } from '../effects.js'
import { ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES } from '../additionalPropertyPage/additionalPropertyStep.js'
import {
  partnerAdditionalPropertyDetailsFieldCodes,
  partnerAdditionalPropertyDetailsPageContent,
} from './partnerAdditionalPropertyDetailsBlock.js'

const { partnerAdditionalPropertyDetails: STEP_CODE } = CONTROLLED_WORK_STEP_CODES
const COLLECTION_CODE = CONTROLLED_WORK_DATA_KEYS.partnerAdditionalPropertyCollection
const PREREQUISITE_STEP_CODES = [
  ...ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES,
  CONTROLLED_WORK_STEP_CODES.additionalProperty,
  CONTROLLED_WORK_STEP_CODES.additionalPropertyDetails,
  CONTROLLED_WORK_STEP_CODES.partnerAdditionalProperty,
]

export const partnerAdditionalPropertyDetailsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/partner-additional-property-details',
  title: "The partner's other property, holiday home or land",
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [partnerAdditionalPropertyDetailsPageContent],
  onAccess: [
    access({
      effects: [ControlledWorkEffects.PreparePartnerAdditionalPropertyDetails()],
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
      when: Post('action').match(Condition.Equals('add-another-additional-property')),
      validate: false,
      onAlways: {
        effects: [
          PatternEffects.AddRepeatingItem(STEP_CODE, COLLECTION_CODE, partnerAdditionalPropertyDetailsFieldCodes),
          ControlledWorkEffects.NormalizePartnerAdditionalPropertyDetails(),
        ],
      },
    }),
    submit({
      when: Post('action').match(Condition.String.StartsWith('remove_')),
      validate: false,
      onAlways: {
        effects: [
          PatternEffects.RemoveRepeatingItem(STEP_CODE, COLLECTION_CODE, partnerAdditionalPropertyDetailsFieldCodes),
          ControlledWorkEffects.NormalizePartnerAdditionalPropertyDetails(),
        ],
      },
    }),
    submit({
      validate: true,
      onValid: {
        effects: [
          PatternEffects.SaveRepeatingItems(STEP_CODE, COLLECTION_CODE, partnerAdditionalPropertyDetailsFieldCodes),
          ControlledWorkEffects.NormalizePartnerAdditionalPropertyDetails(),
          ControlledWorkEffects.SaveControlledWorkAnswers(STEP_CODE),
        ],
        next: [
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
