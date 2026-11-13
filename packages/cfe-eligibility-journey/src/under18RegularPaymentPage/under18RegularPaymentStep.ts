import { submit, redirect, Answer, Condition } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { under18RegularPaymentHeading, under18RegularPaymentField } from './under18RegularPaymentBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { under18HasValuablesStep } from '../under18HasValuablesPage/under18HasValuablesStep.js'
import { partnerStep } from '../partnerPage/partnerStep.js'

const STEP_CODE = 'under-18-receives-regular-payment'

export const under18RegularPaymentStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/under-18-receives-regular-payment',
  title: 'Do you receive any money on a regular basis?',
  reachability: { entryWhen: true },
  blocks: [under18RegularPaymentHeading, under18RegularPaymentField, mainForgeJourneyActions],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            when: Answer(STEP_CODE).match(Condition.Equals('yes')),
            goto: partnerStep.code,
          }),
          redirect({
            when: Answer(STEP_CODE).match(Condition.Equals('no')),
            goto: under18HasValuablesStep.code,
          })
        ],
      },
    }),
  ],
})