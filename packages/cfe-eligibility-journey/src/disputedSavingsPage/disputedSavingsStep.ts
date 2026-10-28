import { submit, redirect, Answer, Condition, or } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { disputedSavingsHeading, bankBalanceField, investmentBalanceField, assetBalanceField, creditBalanceField } from './disputedSavingsBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { disregardsStep } from '../disregardsPage/disregardsStep.js'

const STEP_CODE = 'disputed-savings'

export const disputedSavingsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/disputed-savings',
  title: 'Your disputed savings',
  reachability: { entryWhen: true },
  blocks: [disputedSavingsHeading, bankBalanceField, investmentBalanceField, assetBalanceField, creditBalanceField, mainForgeJourneyActions],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [redirect({ goto: disregardsStep.code })
        ],
      },
    }),
  ],
})