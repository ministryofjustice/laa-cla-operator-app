import { Condition, Data } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKBody, GovUKHeading, GovUKInsetText } from '@ministryofjustice/hmpps-forge/govuk-components'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS } from './controlledWorkEffects.js'

export const controlledWorkCompleteStepCode = 'controlled-work-answers-complete'

export const controlledWorkCompleteStep: StepDefinition = step({
  code: controlledWorkCompleteStepCode,
  path: '/controlled-work-answers-complete',
  title: 'Controlled-work answers complete',
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.complete).match(Condition.Equals(true)),
  },
  blocks: [
    GovUKHeading({ text: 'Controlled-work answers complete', size: 'l' }),
    GovUKInsetText({
      text: 'You have answered all questions that apply to this matter. No financial eligibility assessment has been calculated or completed.',
    }),
    GovUKBody({ text: 'You can return to the matter question to change your answers.' }),
  ],
})
