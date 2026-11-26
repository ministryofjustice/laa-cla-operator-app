import { access, Condition, Data } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKBody, GovUKHeading, GovUKInsetText } from '@ministryofjustice/hmpps-forge/govuk-components'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS, ControlledWorkEffects } from './controlledWorkEffects.js'

/**
 * Where users land once every applicable question is answered, including at the end of a change-answer loop.
 * It stands in for check answers until controlled-work check answers exist (spec checklist item 14).
 */
export const controlledWorkCompleteStepCode = 'controlled-work-answers-complete'

export const controlledWorkCompleteStep: StepDefinition = step({
  code: controlledWorkCompleteStepCode,
  path: '/controlled-work-answers-complete',
  title: 'Controlled-work answers complete',
  reachability: {
    entryWhen: Data(CONTROLLED_WORK_DATA_KEYS.complete).match(Condition.Equals(true)),
  },
  onAccess: [access({ effects: [ControlledWorkEffects.EndControlledWorkChange()] })],
  blocks: [
    GovUKHeading({ text: 'Controlled-work answers complete', size: 'l' }),
    GovUKInsetText({
      text: 'You have answered all questions that apply to this matter. No financial eligibility assessment has been calculated or completed.',
    }),
    GovUKBody({ text: 'You can return to the matter question to change your answers.' }),
  ],
})
