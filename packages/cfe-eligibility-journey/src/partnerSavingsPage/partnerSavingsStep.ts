import { submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { partnerSavingsHeading, bankBalanceField, investmentBalanceField, assetBalanceField, creditBalanceField } from './partnerSavingsBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { disregardsStep } from '../disregardsPage/disregardsStep.js'

const STEP_CODE = 'partner-savings'

export const partnerSavingsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/partner-savings',
  title: 'Your partner\'s savings',
  reachability: { entryWhen: true },
  blocks: [partnerSavingsHeading, bankBalanceField, investmentBalanceField, assetBalanceField, creditBalanceField, mainForgeJourneyActions],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({ goto: disregardsStep.code })
        ],
      },
    }),
  ],
})