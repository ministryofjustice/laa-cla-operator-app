import { submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { over60WithPartnerFieldHeading, over60WithPartnerField  } from './over60WithPartnerBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { benefitsStep } from '../benefitsPage/benefitsStep.js'

const STEP_CODE = '60-or-over-with-partner'

export const over60StepWithPartnerStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/60-or-over-with-partner',
  title: 'Are you or your partner aged 60 or over?',
  reachability: { entryWhen: true },
  blocks: [over60WithPartnerFieldHeading, over60WithPartnerField, mainForgeJourneyActions],
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