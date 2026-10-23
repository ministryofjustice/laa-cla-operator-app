import { submit, redirect, Answer, Condition } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { under18FieldHeading, under18Field } from './under18Block.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { under18RegularPaymentStep }from '../under18RegularPaymentPage/under18RegularPaymentStep.js'
import { partnerStep } from '../partnerPage/partnerStep.js'

const STEP_CODE = 'under-18'

// The branching happens here. After saving, the next[] array is evaluated in order: 
// - the first redirect whose `when` matches wins. 
// - only one of them will fire per submit.
export const under18Step: StepDefinition = step({
  code: STEP_CODE,
  path: '/under-18',
  title: 'Are you aged 17 or under?',
  reachability: { entryWhen: true },
  blocks: [under18FieldHeading, under18Field, mainForgeJourneyActions],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            when: Answer(under18Field.code).match(Condition.Equals('yes')),
            goto: under18RegularPaymentStep.code,
          }),
          redirect({
            when: Answer(under18Field.code).match(Condition.Equals('no')),
            goto: partnerStep.code,
          }),
          redirect({
            goto: partnerStep.code,
          })
        ],
      },
    }),
  ],
})