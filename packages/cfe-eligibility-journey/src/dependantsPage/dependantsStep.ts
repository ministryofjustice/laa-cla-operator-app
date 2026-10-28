import { submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { dependantsHeading, dependants16OverField, dependants15UnderField } from './dependantsBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { expensesStep } from '../expensesPage/expensesStep.js'

const STEP_CODE = 'dependants'

export const dependantsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/dependants',
  title: 'Dependants',
  reachability: { entryWhen: true },
  blocks: [
    dependantsHeading,
    dependants16OverField,
    dependants15UnderField,
    mainForgeJourneyActions,
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            goto: expensesStep.code,
          }),
        ],
      },
    }),
  ],
})
