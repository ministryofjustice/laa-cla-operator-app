import { submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions} from '../commonBlocks.js'
import {
  partnerIncomeHeading, selfEmployedPartnerField,
  earningsPartnerRow,
  incomeTaxPartnerRow,
  nationalInsurancePartnerRow,
  selfEmploymentDrawingsPartnerRow,
  incomeBenefitsPartnerRow,
  taxCreditsPartnerRow,
  maintenanceReceivedPartnerRow,
  pensionIncomePartnerRow,
  otherIncomePartnerRow,
} from './partnerIncomeBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { partnerDependantsStep } from '../partnerDependantsPage/partnerDependantsStep.js'

const STEP_CODE = 'partner-income'

export const partnerIncomeStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/partner-income',
  title: 'Your partner\'s income',
  reachability: { entryWhen: true },
  blocks: [
    partnerIncomeHeading,
    selfEmployedPartnerField,
    ...earningsPartnerRow,
    ...incomeTaxPartnerRow,
    ...nationalInsurancePartnerRow,
    ...selfEmploymentDrawingsPartnerRow,
    ...incomeBenefitsPartnerRow,
    ...taxCreditsPartnerRow,
    ...maintenanceReceivedPartnerRow,
    ...pensionIncomePartnerRow,
    ...otherIncomePartnerRow,
    mainForgeJourneyActions,
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            goto: partnerDependantsStep.code,
          }),
        ],
      },
    }),
  ],
})
