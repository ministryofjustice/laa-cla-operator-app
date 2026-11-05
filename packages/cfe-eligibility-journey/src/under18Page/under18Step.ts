import { submit, redirect, access, Answer, Condition, Data } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { under18FieldHeading, under18Field } from './under18Block.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { under18RegularPaymentStep }from '../under18RegularPaymentPage/under18RegularPaymentStep.js'
import { partnerStep } from '../partnerPage/partnerStep.js'
import { CLIENT_AGE_DATA_KEY, CLIENT_IS_UNDER_18_DATA_KEY } from '../clientAge.js'

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
  // Skip the question when it has been answered from the client's date of birth
  onAccess: [
    access({
      when: Data(CLIENT_AGE_DATA_KEY).match(Condition.IsRequired()),
      next: [
        redirect({
          when: Data(CLIENT_IS_UNDER_18_DATA_KEY).match(Condition.Equals(true)),
          goto: under18RegularPaymentStep.code,
        }),
        redirect({ goto: partnerStep.code }),
      ],
    }),
  ],
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