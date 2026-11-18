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
import { additionalPropertyDetailsFieldCodes, additionalPropertyDetailsPageContent } from './additionalPropertyDetailsBlock.js'

const { additionalPropertyDetails: STEP_CODE } = CONTROLLED_WORK_STEP_CODES
const COLLECTION_CODE = CONTROLLED_WORK_DATA_KEYS.additionalPropertyCollection
const PREREQUISITE_STEP_CODES = [...ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES, CONTROLLED_WORK_STEP_CODES.additionalProperty]

export const additionalPropertyDetailsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/additional-property-details',
  title: 'Client’s other property, holiday home or land',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [additionalPropertyDetailsPageContent],
  onAccess: [
    access({
      effects: [ControlledWorkEffects.PrepareAdditionalPropertyDetails()],
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
          PatternEffects.AddRepeatingItem(STEP_CODE, COLLECTION_CODE, additionalPropertyDetailsFieldCodes),
          ControlledWorkEffects.NormalizeAdditionalPropertyDetails(),
        ],
      },
    }),
    submit({
      when: Post('action').match(Condition.String.StartsWith('remove_')),
      validate: false,
      onAlways: {
        effects: [
          PatternEffects.RemoveRepeatingItem(STEP_CODE, COLLECTION_CODE, additionalPropertyDetailsFieldCodes),
          ControlledWorkEffects.NormalizeAdditionalPropertyDetails(),
        ],
      },
    }),
    submit({
      validate: true,
      onValid: {
        effects: [
          PatternEffects.SaveRepeatingItems(STEP_CODE, COLLECTION_CODE, additionalPropertyDetailsFieldCodes),
          ControlledWorkEffects.NormalizeAdditionalPropertyDetails(),
          ControlledWorkEffects.SaveControlledWorkAnswers(STEP_CODE),
        ],
        next: [redirect({ goto: controlledWorkIncompleteStepCode })],
      },
    }),
  ],
})
