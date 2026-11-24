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
import { incomeStep as legacyIncomeStep } from './incomePage/incomeStep.js'
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
import { employmentStatusStep } from './employmentStatusPage/employmentStatusStep.js'
import { incomeStep } from './controlledWorkIncomePage/incomeStep.js'
import { controlledWorkBenefitsStep } from './controlledWorkBenefitsPage/controlledWorkBenefitsStep.js'
import { benefitDetailsStep } from './benefitDetailsPage/benefitDetailsStep.js'
import { otherIncomeStep } from './otherIncomePage/otherIncomeStep.js'
import { partnerDetailsStep } from './partnerDetailsPage/partnerDetailsStep.js'
import { partnerEmploymentStatusStep } from './partnerEmploymentStatusPage/partnerEmploymentStatusStep.js'
import { partnerEmploymentIncomeStep } from './partnerEmploymentIncomePage/partnerEmploymentIncomeStep.js'
import { partnerBenefitsStep } from './partnerBenefitsPage/partnerBenefitsStep.js'
import { partnerBenefitDetailsStep } from './partnerBenefitDetailsPage/partnerBenefitDetailsStep.js'
import { partnerOtherIncomeStep } from './partnerOtherIncomePage/partnerOtherIncomeStep.js'
import { outgoingsStep } from './outgoingsPage/outgoingsStep.js'
import { partnerOutgoingsStep } from './partnerOutgoingsPage/partnerOutgoingsStep.js'
import { propertyStep } from './propertyPage/propertyStep.js'
import { propertyLandlordStep } from './propertyLandlordPage/propertyLandlordStep.js'
import { cannotUseServiceStep } from './propertyLandlordPage/cannotUseServiceStep.js'
import { sharedOwnershipHousingCostsStep } from './sharedOwnershipHousingCostsPage/sharedOwnershipHousingCostsStep.js'
import { mortgageOrLoanPaymentStep } from './mortgageOrLoanPaymentPage/mortgageOrLoanPaymentStep.js'
import { propertyEntryStep } from './propertyEntryPage/propertyEntryStep.js'
import { additionalPropertyStep } from './additionalPropertyPage/additionalPropertyStep.js'
import { additionalPropertyDetailsStep } from './additionalPropertyDetailsPage/additionalPropertyDetailsStep.js'
import { partnerAdditionalPropertyStep } from './partnerAdditionalPropertyPage/partnerAdditionalPropertyStep.js'

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
    employmentStatusStep,
    incomeStep,
    controlledWorkBenefitsStep,
    benefitDetailsStep,
    otherIncomeStep,
    partnerDetailsStep,
    partnerEmploymentStatusStep,
    partnerEmploymentIncomeStep,
    partnerBenefitsStep,
    partnerBenefitDetailsStep,
    partnerOtherIncomeStep,
    outgoingsStep,
    partnerOutgoingsStep,
    propertyStep,
    propertyLandlordStep,
    cannotUseServiceStep,
    sharedOwnershipHousingCostsStep,
    mortgageOrLoanPaymentStep,
    propertyEntryStep,
    additionalPropertyStep,
    additionalPropertyDetailsStep,
    partnerAdditionalPropertyStep,
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
    legacyIncomeStep,
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