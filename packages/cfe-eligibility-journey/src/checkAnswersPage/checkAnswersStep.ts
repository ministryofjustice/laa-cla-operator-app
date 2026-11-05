import { step, submit, redirect, access, Condition, Data, Format, Params } from '@ministryofjustice/hmpps-forge/core/authoring'
import { checkYourAnswersForgeJourneyActions } from '../commonBlocks.js'
import { checkYourAnswersHeading, detailsHeading, aboutYouSummaryList, benefitsSummaryList, financesHeading, propertyOwnershipSummaryList, propertiesSummaryList, savingsSummaryList, partnerSavingsSummaryList, disputedSavingsSummaryList, disregardsSummaryList, incomeHeading, incomeSummaryList, partnerIncomeSummaryList, dependantsSummaryList, expensesHeading, expensesSummaryList, partnerExpensesSummaryList, undisputedSavingsSummaryList, partnerUndisputedSavingsSummaryList, partnerDependantsSummaryList, noPropertiesSummaryList } from './checkAnswersBlock.js'
import { FinancialEligibilityEffects, PatternEffects } from '../effects.js'
import { type StepDefinition } from '../authoring.js'

const STEP_CODE = 'check-answers'
const propertiesStepCode = 'properties'
const propertiesCollectionCode = 'propertySet'
const propertiesFieldCodes = ['value', 'mortgage-left', 'disputed', 'main', 'share']

export const checkAnswersStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/check-answers',
  title: 'Check your answers',
  reachability: { entryWhen: true },
  blocks: [checkYourAnswersHeading, detailsHeading, aboutYouSummaryList, benefitsSummaryList, financesHeading, propertyOwnershipSummaryList, propertiesSummaryList, noPropertiesSummaryList, savingsSummaryList, undisputedSavingsSummaryList, partnerSavingsSummaryList, partnerUndisputedSavingsSummaryList, disputedSavingsSummaryList, disregardsSummaryList, incomeHeading, incomeSummaryList, partnerIncomeSummaryList, partnerDependantsSummaryList, dependantsSummaryList, expensesHeading, expensesSummaryList, partnerExpensesSummaryList, checkYourAnswersForgeJourneyActions],
  onAccess: [
    access({
      effects: [
        PatternEffects.InitialiseRepeatingFieldset(propertiesStepCode, propertiesCollectionCode, propertiesFieldCodes),
        FinancialEligibilityEffects.ValidateDraftAnswers(),
      ],
      next: [
        redirect({
          when: Data('submissionMissingStep').match(Condition.IsRequired()),
          goto: Format('/cases/%1/cfe-eligibility/change/%2', Params('caseId'), Data('submissionMissingStep')),
        }),
      ],
    }),
  ],
  onSubmission: [
    submit({
      validate: false,
      onAlways: {
        effects: [
          FinancialEligibilityEffects.PrepareSubmission(),
        ],
        next: [
          redirect({
            when: Data('submissionMissingStep').match(Condition.IsRequired()),
            goto: Format('/cases/%1/cfe-eligibility/change/%2', Params('caseId'), Data('submissionMissingStep')),
          }),
          redirect({
            goto: 'submission-ready',
          }),
        ],
      },
    }),
  ],
})