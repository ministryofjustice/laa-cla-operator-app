import { submit, redirect, Answer, Condition } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { under18HasValuablesHeading, under18HasValuablesField } from './under18HasValuablesBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { partnerStep } from '../partnerPage/partnerStep.js'
import { checkAnswersStep } from '../checkAnswersPage/checkAnswersStep.js'

const STEP_CODE = 'under-18-has-valuables'

export const under18HasValuablesStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/under-18-has-valuables',
  title: 'Do you receive any money on a regular basis?',
  reachability: { entryWhen: true },
  blocks: [under18HasValuablesHeading, under18HasValuablesField, mainForgeJourneyActions],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            when: Answer(STEP_CODE).match(Condition.Equals('yes')),
            goto: partnerStep.code,
          }),
          redirect({
            when: Answer(STEP_CODE).match(Condition.Equals('no')),
            goto: checkAnswersStep.code,
          })
        ],
      },
    }),
  ],
})