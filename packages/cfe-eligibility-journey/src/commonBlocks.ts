import { GovUKButton, GovUKInsetText } from '@ministryofjustice/hmpps-forge/govuk-components'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { Condition, Data, Format, Params } from '@ministryofjustice/hmpps-forge/core/authoring'

export const continueButton = GovUKButton({ text: 'Continue' })

export const submitButton = GovUKButton({ text: 'Prepare submission' })

export const eligibilitySubmissionError = GovUKInsetText({
  text: 'Complete or correct this answer before preparing the submission.',
  visibleWhen: Data('submissionValidationStep').match(Condition.IsRequired()),
})

export const discardChangesLink = HtmlBlock({
  tag: 'a',
  classes: `govuk-link ${GovUKUtilityClasses.FontSize.Size19} ${GovUKUtilityClasses.Margin.Left1}`,
  attributes: { href: [Format('/cases/%1/cfe-eligibility/change/discard', Params('caseId'))], },
  content: 'Discard changes',
})

export const mainForgeJourneyActions = HtmlBlock({
  tag: 'div',
  classes: "govuk-button-group",
  content: [
    eligibilitySubmissionError,
    continueButton,
    discardChangesLink,
  ],
})

export const checkYourAnswersForgeJourneyActions = HtmlBlock({
  tag: 'div',
  classes: "govuk-button-group",
  content: [
    eligibilitySubmissionError,
    submitButton,
    discardChangesLink,
  ],
})