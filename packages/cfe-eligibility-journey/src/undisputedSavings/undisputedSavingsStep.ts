import { submit, redirect, Answer, Condition } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { savingsHeading, bankBalanceField, investmentBalanceField, assetBalanceField, creditBalanceField } from './undisputedSavingsBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { disputedSavingsStep } from '../disputedSavingsPage/disputedSavingsStep.js'
import { partnerUndisputedSavingsStep } from '../partnerUndisputedSavings/partnerUndisputedSavingsStep.js'

const STEP_CODE = 'your-undisputed-savings'

export const undisputedSavingsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/your-undisputed-savings',
  title: 'Your undisputed savings',
  reachability: { entryWhen: true },
  blocks: [savingsHeading, bankBalanceField, investmentBalanceField, assetBalanceField, creditBalanceField, mainForgeJourneyActions],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            when: Answer('has-partner').match(Condition.Equals('yes')),
            goto: partnerUndisputedSavingsStep.code
          }),
          redirect({ goto: disputedSavingsStep.code }),
        ],
      },
    }),
  ],
})