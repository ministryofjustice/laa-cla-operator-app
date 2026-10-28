import { submit, redirect, Condition, or, Post, access, validation, Data, Iterator, Answer, Format, Loop, Transformer } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { propertiesHeading, propertySet, addAnotherButton } from './propertiesBlock.js'
import { FinancialEligibilityEffects, PatternEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { savingsStep } from '../savingsPage/savingsStep.js'
import { undisputedSavingsStep } from '../undisputedSavings/undisputedSavingsStep.js'

const STEP_CODE = 'properties'
const collectionCode = 'propertySet'
const fieldCodes = ['value', 'mortgage-left', 'disputed', 'main', 'share']

// This is so we can validate that only one property is marked as `main`, which is validated at this step level
const mainPropertiesCount = Data(collectionCode)
  .each(Iterator.Filter(Answer(Format('main_%1', Loop.Index0())).match(Condition.Equals('yes'))))
  .pipe(Transformer.Array.Length())

export const propertiesStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/properties',
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
      effects: [PatternEffects.InitialiseRepeatingFieldset(STEP_CODE, collectionCode, fieldCodes)],
    }),
  ],
  onSubmission: [
    submit({
      when: Post('action').match(Condition.Equals('add-another-property')),
      validate: false,
      onAlways: {
        effects: [PatternEffects.AddRepeatingItem(STEP_CODE, collectionCode, fieldCodes)],
      },
    }),
    submit({
      when: Post('action').match(Condition.String.StartsWith('remove_')),
      validate: false,
      onAlways: {
        effects: [PatternEffects.RemoveRepeatingItem(STEP_CODE, collectionCode, fieldCodes)],
      },
    }),
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered(), PatternEffects.SaveRepeatingItems(STEP_CODE, collectionCode, fieldCodes)],
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