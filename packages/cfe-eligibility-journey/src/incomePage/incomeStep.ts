import { submit, redirect, Answer, Condition } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import {
  incomeHeading, selfEmployedField,
  earningsRow,
  incomeTaxRow,
  nationalInsuranceRow,
  selfEmploymentDrawingsRow,
  incomeBenefitsRow,
  taxCreditsRow,
  maintenanceReceivedRow,
  pensionIncomeRow,
  otherIncomeRow,
  childBenefitRow,
} from './incomeBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { partnerField } from '../partnerPage/partnerBlock.js'
import { partnerIncomeStep } from '../partnerIncomePage/partnerIncomeStep.js'
import { dependantsStep } from '../dependantsPage/dependantsStep.js'

const STEP_CODE = 'your-income'

export const incomeStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/your-income',
  title: 'Your income',
  reachability: { entryWhen: true },
  blocks: [
    incomeHeading,
    selfEmployedField,
    ...earningsRow,
    ...incomeTaxRow,
    ...nationalInsuranceRow,
    ...selfEmploymentDrawingsRow,
    ...incomeBenefitsRow,
    ...taxCreditsRow,
    ...childBenefitRow,
    ...maintenanceReceivedRow,
    ...pensionIncomeRow,
    ...otherIncomeRow,
    mainForgeJourneyActions,
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            when: Answer(partnerField.code).match(Condition.Equals('yes')),
            goto: partnerIncomeStep.code,
          }),
          redirect({
            goto: dependantsStep.code,
          }),
        ],
      },
    }),
  ],
})
