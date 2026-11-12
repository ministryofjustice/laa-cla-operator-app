import { submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { step, type StepDefinition } from '../authoring.js'
import { ControlledWorkEffects } from '../controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES } from '../controlledWork/controlledWorkTypes.js'
import { immigrationOrAsylumPageContent } from './immigrationOrAsylumBlock.js'
import { controlledWorkIncompleteStepCode } from '../controlledWork/controlledWorkIncompleteStep.js'

const { immigrationOrAsylum: STEP_CODE } = CONTROLLED_WORK_STEP_CODES

export const immigrationOrAsylumStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/immigration-or-asylum',
  title: 'Is this an immigration or asylum matter?',
  view: { template: 'case_details/forge_forms/eligibility-question-form' },
  reachability: { entryWhen: true },
  blocks: [immigrationOrAsylumPageContent],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [ControlledWorkEffects.SaveControlledWorkAnswers(STEP_CODE)],
        next: [redirect({ goto: controlledWorkIncompleteStepCode })],
      },
    }),
  ],
})
