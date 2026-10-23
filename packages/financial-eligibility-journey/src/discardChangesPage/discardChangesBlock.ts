import { submit, redirect, Post, Condition, Format, Params, Data } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKButton, GovUKBody } from '@ministryofjustice/hmpps-forge/govuk-components'
import { GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { FinancialEligibilityEffects } from '../effects.js'

// Button and function to trigger the component
export const discardChangesButton = GovUKButton({ text: 'Discard changes', classes: 'govuk-button govuk-button--inverse', name: 'action', value: 'discard-changes' })

/**
 * Clears the financial eligibility draft answers and redirects the user back to the financial eligibility page
 * @returns {Promise<void>} The submit discard changes action
 */
export const ifPressedDiscardChanges = () => submit({
  when: Post('action').match(Condition.Equals('discard-changes')),
  onAlways: {
    effects: [FinancialEligibilityEffects.ClearDraftAnswers()],
    next: [redirect({ goto: Format('/cases/%1/financial-eligibility/', Params('caseId')) })], //`%1` will get resolved to caseId
  },
})

// Return link
export const returnLink = HtmlBlock({
  tag: 'a',
  classes: `govuk-link govuk-link--inverse ${GovUKUtilityClasses.FontSize.Size19} ${GovUKUtilityClasses.Margin.Left1}`,
  attributes: { href: [Data('discardReturnPath')], },
  content: 'Return to means assessment',
})


// Discard panel created using `HtmlBlock` as there's no equivalent forge component 
export const discardPanel = HtmlBlock({
  tag: 'div',
  classes: 'govuk-panel govuk-panel--interruption',
  content: [
    GovUKHeading({ text: 'Are you sure you want to discard these changes?', size: 'l', classes: 'govuk-panel__title' }),
    HtmlBlock({
      tag: 'div',
      classes: 'govuk-panel__body',
      content: [
        GovUKBody({ text: "Any changes you've made to the client's means assessment will be discarded." }),
        GovUKBody({ text: 'Answers will revert back to the previous answers.' }),
      ],
    }),
    HtmlBlock({
      tag: 'div',
      classes: 'govuk-panel__actions',
      content: [
        HtmlBlock({
          tag: 'div',
          classes: 'govuk-button-group',
          content: [discardChangesButton, returnLink],
        }),
      ],
    }),
  ],
})