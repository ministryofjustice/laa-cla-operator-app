import { submit, redirect, Condition, or, Post, access, validation, Data, Iterator, Answer, Format, Loop, Transformer } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { propertiesHeading, propertySet, addAnotherButton } from './propertiesBlockPartner.js'
import { FinancialEligibilityEffects, PatternEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { savingsStep } from '../savingsPage/savingsStep.js'
import { undisputedSavingsStep } from '../undisputedSavings/undisputedSavingsStep.js'

const STEP_CODE = 'client-partner-properties'
const STORAGE_STEP_CODE = 'properties'
const collectionCode = 'propertySet'
const fieldCodes = ['value', 'mortgage-left', 'disputed', 'main', 'share']

// This is so we can validate that only one property is marked as `main`, which is validated at this step level
const mainPropertiesCount = Data(collectionCode)
  .each(Iterator.Filter(Answer(Format('main_%1', Loop.Index0())).match(Condition.Equals('yes'))))
  .pipe(Transformer.Array.Length())

export const propertiesStepPartner: StepDefinition = step({
  code: STEP_CODE,
  path: '/client-partner-properties',
  title: 'Properties',
  reachability: { entryWhen: true },
  validWhen: [
    validation({
      condition: mainPropertiesCount.match(Condition.Number.LessThanOrEqual(1)),
      message: 'Only one property can be your main property',
    }),
  ],
  blocks: [propertiesHeading, propertySet, addAnotherButton, mainForgeJourneyActions],
  onAccess: [
    access({
      effects: [PatternEffects.InitialiseRepeatingFieldset(STORAGE_STEP_CODE, collectionCode, fieldCodes)],
    }),
  ],
  onSubmission: [
    submit({
      when: Post('action').match(Condition.Equals('add-another-property')),
      validate: false,
      onAlways: {
        effects: [PatternEffects.AddRepeatingItem(STORAGE_STEP_CODE, collectionCode, fieldCodes)],
      },
    }),
    submit({
      when: Post('action').match(Condition.String.StartsWith('remove_')),
      validate: false,
      onAlways: {
        effects: [PatternEffects.RemoveRepeatingItem(STORAGE_STEP_CODE, collectionCode, fieldCodes)],
      },
    }),
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered(), PatternEffects.SaveRepeatingItems(STORAGE_STEP_CODE, collectionCode, fieldCodes)],
        next: [
          redirect({
            when: or (
              Answer('category').match(Condition.Equals('debt')), 
              Answer('category').match(Condition.Equals('family'))
            ),
            goto: undisputedSavingsStep.code
          }),
          redirect({
            goto: savingsStep.code
          }),
        ],
      },
    }),
  ],
})