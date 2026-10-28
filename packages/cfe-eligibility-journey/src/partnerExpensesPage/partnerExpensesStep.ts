import { submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import {
  partnerExpensesHeading,
  mortgagePartnerRow,
  rentPartnerRow,
  maintenancePaidPartnerRow,
  childcareCostsPartnerRow,
  legalAidContributionsPartnerHeading,
  legalAidContributionsPartnerField,
} from './partnerExpensesBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { checkAnswersStep } from '../checkAnswersPage/checkAnswersStep.js'

const STEP_CODE = 'partner-expenses'

export const partnerExpensesStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/partner-expenses',
  title: 'Your partner\'s expenses',
  reachability: { entryWhen: true },
  blocks: [
    partnerExpensesHeading,
    ...mortgagePartnerRow,
    ...rentPartnerRow,
    ...maintenancePaidPartnerRow,
    ...childcareCostsPartnerRow,
    legalAidContributionsPartnerHeading,
    legalAidContributionsPartnerField,
    mainForgeJourneyActions,
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            goto: checkAnswersStep.code,
          }),
        ],
      },
    }),
  ],
})
