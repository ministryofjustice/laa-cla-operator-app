import { submit, redirect, Answer, Condition } from '@ministryofjustice/hmpps-forge/core/authoring'
import { mainForgeJourneyActions } from '../commonBlocks.js'
import {
  expensesHeading,
  mortgageRow,
  rentRow,
  maintenancePaidRow,
  childcareCostsRow,
  legalAidContributionsHeading,
  legalAidContributionsField,
} from './expensesBlock.js'
import { FinancialEligibilityEffects } from '../effects.js'
import { step, type StepDefinition } from '../authoring.js'
import { partnerField } from '../partnerPage/partnerBlock.js'
import { partnerExpensesStep } from '../partnerExpensesPage/partnerExpensesStep.js'
import { checkAnswersStep } from '../checkAnswersPage/checkAnswersStep.js'

const STEP_CODE = 'your-expenses'

export const expensesStep: StepDefinition = step({
  code: STEP_CODE,
  path: '/your-expenses',
  title: 'Your expenses',
  reachability: { entryWhen: true },
  blocks: [
    expensesHeading,
    ...mortgageRow,
    ...rentRow,
    ...maintenancePaidRow,
    ...childcareCostsRow,
    legalAidContributionsHeading,
    legalAidContributionsField,
    mainForgeJourneyActions,
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [FinancialEligibilityEffects.SaveNewAnswerIfAnswered()],
        next: [
          redirect({
            when: Answer(partnerField.code).match(Condition.Equals('yes')),
            goto: partnerExpensesStep.code,
          }),
          redirect({
            goto: checkAnswersStep.code,
          }),
        ],
      },
    }),
  ],
})
