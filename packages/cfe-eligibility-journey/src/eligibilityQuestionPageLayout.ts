import { GovUKButton, GovUKGridRow, GovUKHeading } from '@ministryofjustice/hmpps-forge/govuk-components'
import type { BlockDefinition } from '@ministryofjustice/hmpps-forge/core/components'

interface ControlledWorkQuestionPageOptions {
  questionBlocks: BlockDefinition[]
  guidanceBlocks: BlockDefinition[]
}

/**
 * Places a controlled-work question form and its guidance in the shared two-column layout.
 * @param {ControlledWorkQuestionPageOptions} options Question and guidance blocks for the page
 * @returns {BlockDefinition} The standard controlled-work question layout
 */
export function eligibilityQuestionPageLayout({
  questionBlocks,
  guidanceBlocks,
}: ControlledWorkQuestionPageOptions): BlockDefinition {
  return GovUKGridRow({
    columns: [
      {
        width: 'two-thirds',
        blocks: [...questionBlocks, GovUKButton({ text: 'Save and continue' })],
      },
      {
        width: 'one-third',
        blocks: [GovUKHeading({ text: 'Guidance', size: 'm' }), ...guidanceBlocks],
      },
    ],
  })
}
