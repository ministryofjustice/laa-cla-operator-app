import { access, Condition, Data, Format, Params, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKHeading, GovUKInsetText } from '@ministryofjustice/hmpps-forge/govuk-components'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS } from './controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODE_LIST } from './controlledWorkTypes.js'
import { checkAnswersStepCode } from '../checkAnswersPage/checkAnswersStep.js'

/** Sends a change-answer loop on to the step it chose, even when the saved step's own redirects don't name it */
export const CONTROLLED_WORK_CHANGE_STEP_REDIRECTS = CONTROLLED_WORK_STEP_CODE_LIST.map((stepCode) =>
  redirect({
    when: Data(CONTROLLED_WORK_DATA_KEYS.changeNextStep).match(Condition.Equals(stepCode)),
    goto: stepCode,
  }),
)

export const controlledWorkIncompleteStepCode = 'controlled-work-incomplete'

export const CONTROLLED_WORK_INCOMPLETE_STEP_REDIRECTS = CONTROLLED_WORK_STEP_CODE_LIST.map((stepCode) =>
  redirect({
    when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(Condition.Equals(stepCode)),
    goto: stepCode,
  }),
)

export const controlledWorkIncompleteStep: StepDefinition = step({
  code: controlledWorkIncompleteStepCode,
  path: '/controlled-work-incomplete',
  title: 'Controlled-work journey incomplete',
  reachability: { entryWhen: true },
  blocks: [
    GovUKHeading({ text: 'Controlled-work journey incomplete', size: 'l' }),
    GovUKInsetText({
      text: 'Your answer has been saved. You must answer all questions that apply to this matter before this journey is complete.',
    }),
    GovUKBody({ text: 'You can return to the matter question to change your answer.' }),
    HtmlBlock({
      tag: 'a',
      classes: 'govuk-link',
      attributes: {
        href: [Format('/cases/%1/cfe-eligibility/change/immigration-or-asylum', Params('caseId'))],
      },
      content: 'Change your answer',
    }),
  ],
  onAccess: [
    access({
      next: [
        ...CONTROLLED_WORK_INCOMPLETE_STEP_REDIRECTS,
        ...CONTROLLED_WORK_CHANGE_STEP_REDIRECTS,
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.complete).match(Condition.Equals(true)),
          goto: checkAnswersStepCode,
        }),
      ],
    }),
  ],
})
