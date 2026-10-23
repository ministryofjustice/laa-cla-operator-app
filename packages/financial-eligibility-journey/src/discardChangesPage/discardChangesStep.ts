import { access, submit } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { discardPanel, ifPressedDiscardChanges } from './discardChangesBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'

const STEP_CODE = 'discard'

// No branching on this step
export const discardStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/discard',
  title: 'Are you sure you want to discard these changes?',
  reachability: { entryWhen: true },
  blocks: [discardPanel],
  onAccess: [
    access({
      effects: [FinancialEligibilityEffects.ResolveDiscardReturnPath()],
    }),
  ],
  onSubmission: [
    ifPressedDiscardChanges(),
    submit({
      validate: true
    }),
  ],
})