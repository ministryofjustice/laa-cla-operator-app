import { submit, redirect, access, Condition, Data } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { over60FieldHeading, over60Field  } from './over60Block.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { benefitsStep } from '../benefitsPage/benefitsStep.js'
import { CLIENT_AGE_DATA_KEY } from '../clientAge.js'

const STEP_CODE = '60-or-over'

export const over60Step: StepDefinition = step({
  code: STEP_CODE,
  path: '/60-or-over',
  title: 'Are you aged over 60?',
  reachability: { entryWhen: true },
  blocks: [over60FieldHeading, over60Field, mainForgeJourneyActions],
  // Skip the question when it has been answered from the client's date of birth
  onAccess: [
    access({
      when: Data(CLIENT_AGE_DATA_KEY).match(Condition.IsRequired()),
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