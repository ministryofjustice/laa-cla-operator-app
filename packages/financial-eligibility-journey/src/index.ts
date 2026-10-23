import { createForgePackage, type ForgePackage } from '@ministryofjustice/hmpps-forge/core/authoring'
import { eligibilityJourney } from './journey.js'
import { FinancialEligibilityEffectsRegistry } from './effects.js'
import { type Deps } from './api.js'

/**
 * Forge package entry point.
 * @returns {ForgePackage} The configured Forge package for the financial eligibility journey
 */
export default createForgePackage<Deps>({
    journey: eligibilityJourney,
    functions: FinancialEligibilityEffectsRegistry,
  })

export * from './api.js'
export * from './authoring.js'
export * from './effects.js'
export * from './context.type.js'
export * from './journey.js'

export * from './under18Page/under18Step.js'
export * from './under18RegularPaymentPage/under18RegularPaymentStep.js'
export * from './under18HasValuablesPage/under18HasValuablesStep.js'
export * from './partnerPage/partnerStep.js'
export * from './over60Page/over60Step.js'
export * from './over60PWithPartnerPage/over60WithPartnerStep.js'
export * from './benefitsPage/benefitsStep.js'
export * from './propertiesPage/propertiesStep.js'
export * from './propertiesPageWithPartner/propertiesStepPartner.js'
export * from './savingsPage/savingsStep.js'
export * from './undisputedSavings/undisputedSavingsStep.js'
export * from './partnerUndisputedSavings/partnerUndisputedSavingsStep.js'
export * from './partnerSavingsPage/partnerSavingsStep.js'
export * from './disputedSavingsPage/disputedSavingsStep.js'
export * from './disregardsPage/disregardsStep.js'
export * from './incomePage/incomeStep.js'
export * from './partnerIncomePage/partnerIncomeStep.js'
export * from './dependantsPage/dependantsStep.js'
export * from './expensesPage/expensesStep.js'
export * from './partnerExpensesPage/partnerExpensesStep.js'
export * from './checkAnswersPage/checkAnswersStep.js'
export * from './partnerDependantsPage/partnerDependantsStep.js'
export * from './discardChangesPage/discardChangesStep.js'