import { expect } from 'chai'
import { checkAnswersStep } from '#packages/cfe-eligibility-journey/src/checkAnswersPage/checkAnswersStep.js'
import {
  CONTROLLED_WORK_CHECK_ANSWER_LABELS,
  CONTROLLED_WORK_CHECK_INTERNAL_ANSWER_CODES,
  controlledWorkCheckAnswersBlocks,
  controlledWorkCheckAnswersSummarySections,
} from '#packages/cfe-eligibility-journey/src/checkAnswersPage/controlledWorkCheckAnswersBlock.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_ANSWER_CODES } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'

describe('Controlled-work check answers', () => {
  it('labels every stored answer and excludes only internal completion markers', () => {
    const unlabeled = CONTROLLED_WORK_ANSWER_CODES.filter(
      (code) => CONTROLLED_WORK_CHECK_ANSWER_LABELS[code] === undefined && !CONTROLLED_WORK_CHECK_INTERNAL_ANSWER_CODES.has(code),
    )

    expect(unlabeled).to.deep.equal([])
  })

  it('orders the summary sections to match CCQ', () => {
    expect(controlledWorkCheckAnswersSummarySections).to.deep.equal([
      'Case details / matter and under-18 route',
      'Client and dependant details',
      'Client income and benefits',
      'Partner details and income',
      'Outgoings',
      'Housing and property',
      'Client assets and partner assets',
    ])
  })

  it('shows only applicable step cards and links Change to the owning page in a change loop', () => {
    const blocks = JSON.stringify(controlledWorkCheckAnswersBlocks)

    expect(blocks).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(blocks).to.include('?change=true')
    for (const { code } of CONTROLLED_WORK_STEPS) {
      if (code === 'how-to-aggregate') continue
      expect(blocks).to.include(code)
    }
  })

  it('validates on access and prepares confirmation only after validation', () => {
    const access = JSON.stringify(checkAnswersStep.onAccess)
    const submission = JSON.stringify(checkAnswersStep.onSubmission)

    expect(access).to.include('ValidateDraftAnswers')
    expect(access).to.include('submissionMissingStep')
    expect(submission).to.include('PrepareSubmission')
    expect(submission).to.include('submission-ready')
    expect(submission).to.include('submissionMissingStep')
  })
})
