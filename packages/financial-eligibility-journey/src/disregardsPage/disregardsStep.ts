import { submit, redirect, Answer, Condition, or } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { disregardsHeading, disregardsField } from './disregardsBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { incomeStep } from '../incomePage/incomeStep.js'
import { checkAnswersStep } from '../checkAnswersPage/checkAnswersStep.js'

const STEP_CODE = 'disregards'

// Receiving any of these passporting benefits means the client is automatically financially eligible,
// so income and expenses questions are skipped entirely.
const benefitsPassported = or(
  Answer('universal-credit').match(Condition.Equals('yes')),
  Answer('income-support').match(Condition.Equals('yes')),
  Answer('income-based-jsa').match(Condition.Equals('yes')),
  Answer('pension-credit').match(Condition.Equals('yes')),
  Answer('employment-support').match(Condition.Equals('yes')),
)

export const disregardsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/disregards',
  title: 'Disregards',
  reachability: { entryWhen: true },
  blocks: [disregardsHeading, disregardsField, mainForgeJourneyActions],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            when: benefitsPassported,
            goto: checkAnswersStep.code,
          }),
          redirect({ goto: incomeStep.code }),
        ],
      },
    }),
  ],
})