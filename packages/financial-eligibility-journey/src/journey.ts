import { journey, access } from '@ministryofjustice/hmpps-forge/core/authoring'
import { FinancialEligibilityEffects } from './effects.js'
import { under18Step } from './under18Page/under18Step.js'
import { under18RegularPaymentStep }from './under18RegularPaymentPage/under18RegularPaymentStep.js'
import { under18HasValuablesStep }from './under18HasValuablesPage/under18HasValuablesStep.js'
import { partnerStep } from './partnerPage/partnerStep.js'
import { over60Step } from './over60Page/over60Step.js'
import { over60StepWithPartnerStep } from './over60PWithPartnerPage/over60WithPartnerStep.js'
import { benefitsStep } from './benefitsPage/benefitsStep.js'
import { propertiesStep } from './propertiesPage/propertiesStep.js'
import { savingsStep } from './savingsPage/savingsStep.js'
import { partnerSavingsStep } from './partnerSavingsPage/partnerSavingsStep.js'
import { disputedSavingsStep } from './disputedSavingsPage/disputedSavingsStep.js'
import { disregardsStep } from './disregardsPage/disregardsStep.js'
import { incomeStep } from './incomePage/incomeStep.js'
import { partnerIncomeStep } from './partnerIncomePage/partnerIncomeStep.js'
import { dependantsStep } from './dependantsPage/dependantsStep.js'
import { expensesStep } from './expensesPage/expensesStep.js'
import { partnerExpensesStep } from './partnerExpensesPage/partnerExpensesStep.js'
import { checkAnswersStep } from './checkAnswersPage/checkAnswersStep.js'
import { propertiesStepPartner } from './propertiesPageWithPartner/propertiesStepPartner.js'
import { undisputedSavingsStep } from './undisputedSavings/undisputedSavingsStep.js'
import { partnerUndisputedSavingsStep } from './partnerUndisputedSavings/partnerUndisputedSavingsStep.js'
import { partnerDependantsStep } from './partnerDependantsPage/partnerDependantsStep.js'
import { discardStep } from './discardChangesPage/discardChangesStep.js'

// The loads any stored draft answers on every access, so switching between branches preserves earlier input.
// The summary page filters rows to the  branch the user is currently on.
export const eligibilityJourney = journey({
  code: 'financial-eligibility',
  title: 'Financial eligibility',
  path: '/cases/:caseId/financial-eligibility/change',
  onAccess: [
    access({
      effects: [
        FinancialEligibilityEffects.LoadCaseDetails(),
        FinancialEligibilityEffects.LoadCaseFinancialEligibility(),
        FinancialEligibilityEffects.SaveDiscardReturnPath(),
      ],
    }),
  ],
  view: { template: 'case_details/forge_forms/financial-eligibility-form' },
  steps: [
    under18Step,
    under18RegularPaymentStep,
    under18HasValuablesStep,
    partnerStep,
    over60Step,
    over60StepWithPartnerStep,
    benefitsStep,
    propertiesStep,
    propertiesStepPartner,
    savingsStep,
    undisputedSavingsStep,
    partnerUndisputedSavingsStep,
    partnerSavingsStep,
    disputedSavingsStep,
    disregardsStep,
    incomeStep,
    partnerIncomeStep,
    dependantsStep,
    expensesStep,
    partnerExpensesStep,
    checkAnswersStep,
    partnerDependantsStep,
    discardStep,
  ],
})