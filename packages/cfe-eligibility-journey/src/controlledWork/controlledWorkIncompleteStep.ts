import { access, Condition, Data, Format, Params, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKHeading, GovUKInsetText } from '@ministryofjustice/hmpps-forge/govuk-components'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS } from './controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES } from './controlledWorkTypes.js'

export const controlledWorkIncompleteStepCode = 'controlled-work-incomplete'

export const controlledWorkIncompleteStep: StepDefinition = step({
  code: controlledWorkIncompleteStepCode,
  path: '/controlled-work-incomplete',
  title: 'Controlled-work journey incomplete',
  reachability: { entryWhen: true },
  blocks: [
    GovUKHeading({ text: 'Controlled-work journey incomplete', size: 'l' }),
    GovUKInsetText({ text: 'Your answer has been saved. Further controlled-work questions are not yet available, so this is not a completed assessment.' }),
    GovUKBody({ text: 'You can return to the matter question to change your answer.' }),
    HtmlBlock({
      tag: 'a',
      classes: 'govuk-link',
      attributes: {
        href: [Format('/cases/%1/cfe-eligibility/change/immigration-or-asylum', Params('caseId'))],
      },
      content: 'Change your answer',
    }),
  ],
  onAccess: [
    access({
      next: [
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.under18Clr),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.under18Clr,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.aggregatedMeans),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.aggregatedMeans,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.regularIncome),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.regularIncome,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.under18Assets),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.under18Assets,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylumType),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.immigrationOrAsylumType,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.asylumSupport),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.asylumSupport,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.applicant),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.applicant,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.dependantDetails),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.dependantDetails,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.dependantIncome),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.dependantIncome,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.dependantIncomeDetails),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.dependantIncomeDetails,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.employmentStatus),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.employmentStatus,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.income),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.income,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.benefits),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.benefits,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.benefitDetails),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.benefitDetails,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.otherIncome),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.otherIncome,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.partnerDetails),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.partnerDetails,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.partnerEmploymentStatus),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.partnerEmploymentStatus,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.partnerIncome),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.partnerIncome,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.partnerBenefits),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.partnerBenefits,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.partnerBenefitDetails),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.partnerBenefitDetails,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.partnerOtherIncome),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.partnerOtherIncome,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.outgoings),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.outgoings,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.partnerOutgoings),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.partnerOutgoings,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.property),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.property,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.propertyLandlord),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.propertyLandlord,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.sharedOwnershipHousingCosts),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.sharedOwnershipHousingCosts,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.mortgageOrLoanPayment),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.mortgageOrLoanPayment,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.housingCosts),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.housingCosts,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.additionalPropertyDetails),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.additionalPropertyDetails,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.partnerAdditionalProperty),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.partnerAdditionalProperty,
        }),
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum,
        }),
      ],
    }),
  ],
})
