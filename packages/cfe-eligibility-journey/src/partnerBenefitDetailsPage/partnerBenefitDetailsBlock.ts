import { CONTROLLED_WORK_DATA_KEYS } from '../controlledWork/controlledWorkEffects.js'
import { createBenefitDetailsPageContent } from '../benefitDetailsPage/benefitDetailsBlock.js'

export const partnerBenefitDetailsPageContent = createBenefitDetailsPageContent({
  collectionCode: CONTROLLED_WORK_DATA_KEYS.partnerBenefitCollection,
  includeCostOfLivingExamples: true,
  recipient: 'partner',
  suggestionListId: 'suggestions',
})
