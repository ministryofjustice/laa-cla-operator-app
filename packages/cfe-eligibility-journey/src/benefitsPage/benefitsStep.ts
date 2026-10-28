import { submit, redirect, Answer, Condition } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { benefitsHeading, universalCreditField, incomeSupportField, incomeBasedJSAField, pensionCreditField, employmentSupportField } from './benefitsBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { propertiesStepPartner } from '../propertiesPageWithPartner/propertiesStepPartner.js'
import { propertiesStep } from '../propertiesPage/propertiesStep.js'

const STEP_CODE = 'benefits'

export const benefitsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/benefits',
  title: 'Benefits',
  reachability: { entryWhen: true },
  blocks: [benefitsHeading, universalCreditField, incomeSupportField, incomeBasedJSAField, pensionCreditField, employmentSupportField, mainForgeJourneyActions],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            when: Answer('has-partner').match(Condition.Equals('yes')),
            goto: propertiesStepPartner.code
          }),
          redirect({
              when: Answer('has-partner').match(Condition.Equals('no')),
              goto: propertiesStep.code
          }),
        ],
      },
    }),
  ],
})