import { GovUKButton } from '@ministryofjustice/hmpps-forge/govuk-components'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { Format, Params } from '@ministryofjustice/hmpps-forge/core/authoring'

export const continueButton = GovUKButton({ text: 'Continue' })

export const submitButton = GovUKButton({ text: 'Submit' })

export const discardChangesLink = HtmlBlock({
  tag: 'a',
  classes: `govuk-link ${GovUKUtilityClasses.FontSize.Size19} ${GovUKUtilityClasses.Margin.Left1}`,
  attributes: { href: [Format('/cases/%1/financial-eligibility/change/discard', Params('caseId'))], },
  content: 'Discard changes',
})

export const mainForgeJourneyActions = HtmlBlock({
  tag: 'div',
  classes: "govuk-button-group",
  content: [
    continueButton,
    discardChangesLink,
  ],
})

export const checkYourAnswersForgeJourneyActions = HtmlBlock({
  tag: 'div',
  classes: "govuk-button-group",
  content: [
    submitButton,
    discardChangesLink,
  ],
})