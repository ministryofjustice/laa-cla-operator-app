import { Answer, Condition, Format, or, Params } from '@ministryofjustice/hmpps-forge/core/authoring'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKBody, GovUKHeading } from '@ministryofjustice/hmpps-forge/govuk-components'
import { step, type StepDefinition } from '../authoring.js'

export const cannotUseServiceStepCode = 'cannot-use-service'

const mainPropertySharedOwnershipNotSupported = Answer('property-landlord').match(Condition.Equals('no'))
const additionalPropertySharedOwnershipNotSupported = Answer('additional-property-owned').match(
  Condition.Equals('shared_ownership'),
)

export const cannotUseServiceStep: StepDefinition = step({
  code: cannotUseServiceStepCode,
  path: '/cannot-use-service',
  title: 'You cannot use this service',
  reachability: {
    entryWhen: or(mainPropertySharedOwnershipNotSupported, additionalPropertySharedOwnershipNotSupported),
  },
  blocks: [
    GovUKHeading({ text: 'You cannot use this service', size: 'l' }),
    {
      ...GovUKBody({
        text: 'You cannot use this service if your client joint-owns a shared ownership property with the landlord and someone else.',
      }),
      visibleWhen: mainPropertySharedOwnershipNotSupported,
    },
    {
      ...GovUKBody({
        text: 'You cannot use this service if your client owns a shared ownership property that they do not live in.',
      }),
      visibleWhen: additionalPropertySharedOwnershipNotSupported,
    },
    {
      ...HtmlBlock({
        tag: 'a',
        classes: 'govuk-link',
        attributes: {
          href: [Format('/cases/%1/cfe-eligibility/change/property-landlord', Params('caseId'))],
        },
        content: 'Change your answer',
      }),
      visibleWhen: mainPropertySharedOwnershipNotSupported,
    },
    {
      ...HtmlBlock({
        tag: 'a',
        classes: 'govuk-link',
        attributes: {
          href: [Format('/cases/%1/cfe-eligibility/change/additional-property', Params('caseId'))],
        },
        content: 'Change your answer',
      }),
      visibleWhen: additionalPropertySharedOwnershipNotSupported,
    },
  ],
})
