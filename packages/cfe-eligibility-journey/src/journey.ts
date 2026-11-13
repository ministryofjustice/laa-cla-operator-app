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
import { submissionReadyStep } from './submissionReadyPage/submissionReadyStep.js'
import { ControlledWorkEffects } from './controlledWork/controlledWorkEffects.js'
import { controlledWorkIncompleteStep } from './controlledWork/controlledWorkIncompleteStep.js'
import { immigrationOrAsylumStep } from './immigrationOrAsylumPage/immigrationOrAsylumStep.js'
import { under18ClrStep } from './under18ClrPage/under18ClrStep.js'
import { aggregatedMeansStep } from './aggregatedMeansPage/aggregatedMeansStep.js'
import { howToAggregateStep } from './howToAggregatePage/howToAggregateStep.js'
import { regularIncomeStep } from './regularIncomePage/regularIncomeStep.js'
import { underEighteenAssetsStep } from './underEighteenAssetsPage/underEighteenAssetsStep.js'
import { immigrationOrAsylumTypeStep } from './immigrationOrAsylumTypePage/immigrationOrAsylumTypeStep.js'
import { asylumSupportStep } from './asylumSupportPage/asylumSupportStep.js'
import { applicantStep } from './applicantPage/applicantStep.js'
import { dependantDetailsStep } from './dependantDetailsPage/dependantDetailsStep.js'
import { dependantIncomeStep } from './dependantIncomePage/dependantIncomeStep.js'
import { dependantIncomeDetailsStep } from './dependantIncomeDetailsPage/dependantIncomeDetailsStep.js'

// Drafts are case-scoped in the session. Review and preparation only expose active-branch answers.
export const eligibilityJourney = journey({
  code: 'cfe-eligibility',
  title: 'Financial eligibility',
  path: '/cases/:caseId/cfe-eligibility/change',
  onAccess: [
    access({
      effects: [
        FinancialEligibilityEffects.LoadCaseDetails(),
        FinancialEligibilityEffects.RestoreCaseDraft(),
        FinancialEligibilityEffects.ApplyClientAgeFromDob(),
        ControlledWorkEffects.RestoreControlledWorkAnswers(),
        FinancialEligibilityEffects.RestoreSubmissionError(),
        FinancialEligibilityEffects.SaveDiscardReturnPath(),
      ],
    }),
  ],
  view: { template: 'case_details/forge_forms/cfe-eligibility-form' },
  steps: [
    immigrationOrAsylumStep,
    controlledWorkIncompleteStep,
    under18ClrStep,
    aggregatedMeansStep,
    howToAggregateStep,
    regularIncomeStep,
    underEighteenAssetsStep,
    immigrationOrAsylumTypeStep,
    asylumSupportStep,
    applicantStep,
    dependantDetailsStep,
    dependantIncomeStep,
    dependantIncomeDetailsStep,
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
    submissionReadyStep,
  ],
})