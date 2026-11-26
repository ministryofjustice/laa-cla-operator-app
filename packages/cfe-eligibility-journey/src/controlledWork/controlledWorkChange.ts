import { CONTROLLED_WORK_STEPS, findMissingSteps, getApplicableSteps } from './controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
  type ControlledWorkStepCode,
} from './controlledWorkTypes.js'

/**
 * Steps CCQ walks through together in a change loop (`Steps::Group`): a gate and the pages it opens.
 * Which steps are in a group at any moment still comes from the shared applicable-step logic; this only says
 * which applicable steps belong together.
 */
export const CHANGE_ANSWER_GROUPS: readonly (readonly ControlledWorkStepCode[])[] = [
  [STEPS.immigrationOrAsylum, STEPS.immigrationOrAsylumType, STEPS.asylumSupport],
  [STEPS.under18Clr, STEPS.aggregatedMeans, STEPS.howToAggregate, STEPS.regularIncome, STEPS.under18Assets],
  [STEPS.applicant],
  [STEPS.dependantDetails, STEPS.dependantIncome, STEPS.dependantIncomeDetails],
  [STEPS.employmentStatus],
  [STEPS.income],
  [STEPS.benefits, STEPS.benefitDetails],
  [STEPS.otherIncome],
  [STEPS.partnerDetails],
  [STEPS.partnerEmploymentStatus],
  [STEPS.partnerIncome],
  [STEPS.partnerBenefits, STEPS.partnerBenefitDetails],
  [STEPS.partnerOtherIncome],
  [STEPS.outgoings],
  [STEPS.partnerOutgoings],
  [
    STEPS.property,
    STEPS.propertyLandlord,
    STEPS.sharedOwnershipHousingCosts,
    STEPS.mortgageOrLoanPayment,
    STEPS.housingCosts,
    STEPS.propertyEntry,
  ],
  [STEPS.additionalProperty, STEPS.additionalPropertyDetails],
  [STEPS.partnerAdditionalProperty, STEPS.partnerAdditionalPropertyDetails],
  [STEPS.assets],
  [STEPS.partnerAssets],
]

const STEP_ORDER = CONTROLLED_WORK_STEPS.map(({ code }) => code)

/**
 * Decides where a change-answer loop goes after a valid save, following CCQ's `ChangeAnswersMethods#update`:
 *
 * 1. After shared-ownership housing costs, always show property entry (CCQ's shared-ownership special case).
 * 2. Otherwise go to the first later applicable step that still has no valid answer, so a newly required
 *    question can't be skipped. Aggregated means is exempt so the how-to-aggregate page is always shown.
 * 3. Otherwise walk the rest of the step's group, re-showing answered pages (CCQ's "mini-loop").
 * 4. At the end of the group, return to check answers.
 *
 * The loop only ever moves forward, and every step it names is applicable and later than the current step, so it
 * can't loop. The incomplete hub still sends users to any earlier missing step before the journey can complete.
 * @param {ControlledWorkStepCode} currentStep The step just saved
 * @param {ControlledWorkAnswers} answers The resolved answers including the saved one; irrelevant answers already removed
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {ControlledWorkStepCode | undefined} The next step, or undefined to return to check answers
 */
export function getChangeAnswerNextStep(
  currentStep: ControlledWorkStepCode,
  answers: ControlledWorkAnswers,
  context: ControlledWorkContext,
): ControlledWorkStepCode | undefined {
  const position = STEP_ORDER.indexOf(currentStep)
  const applicable = new Set(getApplicableSteps(answers, context))

  if (currentStep === STEPS.sharedOwnershipHousingCosts && applicable.has(STEPS.propertyEntry)) {
    return STEPS.propertyEntry
  }

  if (currentStep !== STEPS.aggregatedMeans) {
    const missing = findMissingSteps(answers, context).find(({ stepCode }) => STEP_ORDER.indexOf(stepCode) > position)
    if (missing) return missing.stepCode
  }

  const group = CHANGE_ANSWER_GROUPS.find((candidate) => candidate.includes(currentStep)) ?? []
  return STEP_ORDER.slice(position + 1).find((code) => applicable.has(code) && group.includes(code))
}
