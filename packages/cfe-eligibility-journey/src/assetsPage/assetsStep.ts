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
import { assetsBankAccountFieldCodes, assetsPageContent } from './assetsBlock.js'

const { assets: STEP_CODE } = CONTROLLED_WORK_STEP_CODES
const COLLECTION_CODE = CONTROLLED_WORK_DATA_KEYS.assetBankAccountCollection
const PREREQUISITE_STEP_CODES = [
  ...ADDITIONAL_PROPERTY_PREREQUISITE_STEP_CODES,
  CONTROLLED_WORK_STEP_CODES.additionalProperty,
  CONTROLLED_WORK_STEP_CODES.additionalPropertyDetails,
  CONTROLLED_WORK_STEP_CODES.partnerAdditionalProperty,
  CONTROLLED_WORK_STEP_CODES.partnerAdditionalPropertyDetails,
]

export const assetsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/assets',
  title: 'Client assets',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.applicableSteps).match(Condition.Array.Contains(STEP_CODE)),
  },
  blocks: [assetsPageContent],
  onAccess: [
    access({
      effects: [ControlledWorkEffects.PrepareAssets()],
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
      when: Post('action').match(Condition.Equals('add-another-bank-account')),
      validate: false,
      onAlways: {
        effects: [
          PatternEffects.AddRepeatingItem(STEP_CODE, COLLECTION_CODE, assetsBankAccountFieldCodes),
          ControlledWorkEffects.NormalizeAssets(),
        ],
      },
    }),
    submit({
      when: Post('action').match(Condition.String.StartsWith('remove_')),
      validate: false,
      onAlways: {
        effects: [
          PatternEffects.RemoveRepeatingItem(STEP_CODE, COLLECTION_CODE, assetsBankAccountFieldCodes),
          ControlledWorkEffects.NormalizeAssets(),
        ],
      },
    }),
    submit({
      validate: true,
      onValid: {
        effects: [
          PatternEffects.SaveRepeatingItems(STEP_CODE, COLLECTION_CODE, assetsBankAccountFieldCodes),
          ControlledWorkEffects.NormalizeAssets(),
          ControlledWorkEffects.SaveControlledWorkAnswers(STEP_CODE),
        ],
        next: [redirect({ goto: controlledWorkIncompleteStepCode })],
      },
    }),
  ],
})
