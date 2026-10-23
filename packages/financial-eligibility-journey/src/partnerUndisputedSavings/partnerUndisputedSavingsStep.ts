import { submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { savingsHeading, bankBalanceField, investmentBalanceField, assetBalanceField, creditBalanceField } from './partnerUndisputedSavingsBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { disputedSavingsStep } from '../disputedSavingsPage/disputedSavingsStep.js'

const STEP_CODE = 'partner-undisputed-savings'

export const partnerUndisputedSavingsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/partner-undisputed-savings',
  title: 'Partner undisputed savings',
  reachability: { entryWhen: true },
  blocks: [savingsHeading, bankBalanceField, investmentBalanceField, assetBalanceField, creditBalanceField, mainForgeJourneyActions],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [redirect({goto: disputedSavingsStep.code}),],
      },
    }),
  ],
})