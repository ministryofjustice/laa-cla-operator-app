import { submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import { dependantsHeading, partnerDependants16OverField, partnerDependants15UnderField } from './partnerDependantsBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { expensesStep } from '../expensesPage/expensesStep.js'

const STEP_CODE = 'partner-dependants'

export const partnerDependantsStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/partner-dependants',
  title: 'Dependants',
  reachability: { entryWhen: true },
  blocks: [
    dependantsHeading,
    partnerDependants16OverField,
    partnerDependants15UnderField,
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