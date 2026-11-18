import { submit, redirect, access, Condition, Data } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { over60WithPartnerFieldHeading, over60WithPartnerField  } from './over60WithPartnerBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { benefitsStep } from '../benefitsPage/benefitsStep.js'
import { CLIENT_IS_60_OR_OVER_DATA_KEY } from '../clientAge.js'

const STEP_CODE = '60-or-over-with-partner'

export const over60StepWithPartnerStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/60-or-over-with-partner',
  title: 'Are you or your partner aged 60 or over?',
  reachability: { entryWhen: true },
  blocks: [over60WithPartnerFieldHeading, over60WithPartnerField, mainForgeJourneyActions],
  // Skip the question when the client's date of birth shows they are 60 or over; otherwise the partner's age decides it
  onAccess: [
    access({
      when: Data(CLIENT_IS_60_OR_OVER_DATA_KEY).match(Condition.Equals(true)),
      next: [redirect({ goto: benefitsStep.code })],
    }),
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [redirect({ goto: benefitsStep.code })],
      },
    }),
  ],
})