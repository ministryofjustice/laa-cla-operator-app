import { step, submit, redirect, access, Condition, Data, Format, or, Params } from '@ministryofjustice/hmpps-forge/core/authoring'
import { checkYourAnswersForgeJourneyActions } from '../commonBlocks.js'
import { checkYourAnswersHeading, detailsHeading, aboutYouSummaryList, benefitsSummaryList, financesHeading, propertyOwnershipSummaryList, propertiesSummaryList, savingsSummaryList, partnerSavingsSummaryList, disputedSavingsSummaryList, disregardsSummaryList, incomeHeading, incomeSummaryList, partnerIncomeSummaryList, dependantsSummaryList, expensesHeading, expensesSummaryList, partnerExpensesSummaryList, undisputedSavingsSummaryList, partnerUndisputedSavingsSummaryList, partnerDependantsSummaryList, noPropertiesSummaryList } from './checkAnswersBlock.js'
import { FinancialEligibilityEffects, PatternEffects } from '../effects.js'
import type { StepDefinition } from '../authoring.js'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { controlledWorkCheckAnswersBlocks } from './controlledWorkCheckAnswersBlock.js'

export const checkAnswersStepCode = 'check-answers'
const propertiesStepCode = 'properties'
const propertiesCollectionCode = 'propertySet'
const propertiesFieldCodes = ['value', 'mortgage-left', 'disputed', 'main', 'share']

const financialEligibilityCheckAnswers = HtmlBlock({
  tag: 'div',
  visibleWhen: Data(CONTROLLED_WORK_DATA_KEYS.controlledJourney).not.match(Condition.Equals(true)),
  content: [checkYourAnswersHeading, detailsHeading, aboutYouSummaryList, benefitsSummaryList, financesHeading, propertyOwnershipSummaryList, propertiesSummaryList, noPropertiesSummaryList, savingsSummaryList, undisputedSavingsSummaryList, partnerSavingsSummaryList, partnerUndisputedSavingsSummaryList, disputedSavingsSummaryList, disregardsSummaryList, incomeHeading, incomeSummaryList, partnerIncomeSummaryList, partnerDependantsSummaryList, dependantsSummaryList, expensesHeading, expensesSummaryList, partnerExpensesSummaryList],
})

const controlledWorkCheckAnswers = HtmlBlock({
  tag: 'div',
  visibleWhen: Data(CONTROLLED_WORK_DATA_KEYS.controlledJourney).match(Condition.Equals(true)),
  content: controlledWorkCheckAnswersBlocks,
})

export const checkAnswersStep: StepDefinition = step({
  code: checkAnswersStepCode,
  path: '/check-answers',
  title: 'Check your answers',
  reachability: {
    entryWhen: or(
      Data(CONTROLLED_WORK_DATA_KEYS.controlledJourney).not.match(Condition.Equals(true)),
      Data(CONTROLLED_WORK_DATA_KEYS.complete).match(Condition.Equals(true)),
    ),
  },
  blocks: [financialEligibilityCheckAnswers, controlledWorkCheckAnswers, checkYourAnswersForgeJourneyActions],
  onAccess: [
    access({
      effects: [
        PatternEffects.InitialiseRepeatingFieldset(propertiesStepCode, propertiesCollectionCode, propertiesFieldCodes),
        ControlledWorkEffects.PrepareCheckAnswers(),
        FinancialEligibilityEffects.ValidateDraftAnswers(),
        ControlledWorkEffects.EndControlledWorkChange(),
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