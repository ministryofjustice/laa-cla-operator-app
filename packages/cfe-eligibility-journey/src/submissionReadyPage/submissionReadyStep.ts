import { access, Condition, Data, Format, Params, redirect } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKHeading } from '@ministryofjustice/hmpps-forge/govuk-components'
import { step, type StepDefinition } from '../authoring.js'
import { FinancialEligibilityEffects } from '../effects.js'

export const submissionReadyStep: StepDefinition = step({
  code: 'submission-ready',
  path: '/submission-ready',
  title: 'Submission ready',
  reachability: { entryWhen: true },
  blocks: [
    GovUKHeading({ text: 'Submission ready', size: 'l' }),
    GovUKBody({
      text: 'No financial eligibility calculation has run, and no assessment has been saved. Your answers are held in this session only.',
    }),
    HtmlBlock({
      tag: 'a',
      classes: 'govuk-link',
      attributes: { href: [Format('/cases/%1/cfe-eligibility/change/check-answers', Params('caseId'))] },
      content: 'Return to check your answers',
    }),
    HtmlBlock({
      tag: 'a',
      classes: 'govuk-link',
      attributes: { href: [Format('/case/%1/add-client-details', Params('caseId'))] },
      content: 'Return to client details',
    }),
  ],
  onAccess: [
    access({
      effects: [FinancialEligibilityEffects.CheckPreparedSubmission()],
      next: [
        redirect({
          when: Data('preparedSubmissionExists').not.match(Condition.Equals(true)),
          goto: 'check-answers',
        }),
      ],
    }),
  ],
})
