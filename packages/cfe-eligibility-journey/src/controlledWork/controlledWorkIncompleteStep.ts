import { access, Condition, Data, Format, Params, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKHeading, GovUKInsetText } from '@ministryofjustice/hmpps-forge/govuk-components'
import { step, type StepDefinition } from '../authoring.js'
import { CONTROLLED_WORK_DATA_KEYS } from './controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES } from './controlledWorkTypes.js'

export const controlledWorkIncompleteStepCode = 'controlled-work-incomplete'

export const controlledWorkIncompleteStep: StepDefinition = step({
  code: controlledWorkIncompleteStepCode,
  path: '/controlled-work-incomplete',
  title: 'Controlled-work journey incomplete',
  reachability: { entryWhen: true },
  blocks: [
    GovUKHeading({ text: 'Controlled-work journey incomplete', size: 'l' }),
    GovUKInsetText({ text: 'Your answer has been saved. Further controlled-work questions are not yet available, so this is not a completed assessment.' }),
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
        redirect({
          when: Data(CONTROLLED_WORK_DATA_KEYS.firstMissingStep).match(
            Condition.Equals(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum),
          ),
          goto: CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum,
        }),
      ],
    }),
  ],
})
