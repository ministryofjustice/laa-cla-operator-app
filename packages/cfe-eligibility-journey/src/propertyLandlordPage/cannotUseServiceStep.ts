import { Answer, Condition, Format, Params } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKHeading } from '@ministryofjustice/hmpps-forge/govuk-components'
import { step, type StepDefinition } from '../authoring.js'

export const cannotUseServiceStepCode = 'cannot-use-service'

export const cannotUseServiceStep: StepDefinition = step({
  code: cannotUseServiceStepCode,
  path: '/cannot-use-service',
  title: 'You cannot use this service',
  reachability: {
    entryWhen: Answer('property-landlord').match(Condition.Equals('no')),
  },
  blocks: [
    GovUKHeading({ text: 'You cannot use this service', size: 'l' }),
    GovUKBody({
      text: 'You cannot use this service if your client joint-owns a shared ownership property with the landlord and someone else.',
    }),
    HtmlBlock({
      tag: 'a',
      classes: 'govuk-link',
      attributes: {
        href: [Format('/cases/%1/cfe-eligibility/change/property-landlord', Params('caseId'))],
      },
      content: 'Change your answer',
    }),
  ],
})
