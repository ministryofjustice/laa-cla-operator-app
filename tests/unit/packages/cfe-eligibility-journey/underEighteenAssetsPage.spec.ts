import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { getNextStep, isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  underEighteenAssetsField,
  underEighteenAssetsPageContent,
} from '#packages/cfe-eligibility-journey/src/underEighteenAssetsPage/underEighteenAssetsBlock.js'
import { underEighteenAssetsStep } from '#packages/cfe-eligibility-journey/src/underEighteenAssetsPage/underEighteenAssetsStep.js'

describe('Under-18 assets page', () => {
  it('registers after regular-income screening and uses the shared eligibility form', () => {
    const steps = eligibilityJourney.steps ?? []
    const regularIncomeIndex = steps.findIndex((journeyStep) => journeyStep.code === STEPS.regularIncome)
    const assetsIndex = steps.findIndex((journeyStep) => journeyStep.code === STEPS.under18Assets)

    expect(assetsIndex).to.be.greaterThan(regularIncomeIndex)
    expect(underEighteenAssetsStep.path).to.equal('/under-eighteen-assets')
    expect(underEighteenAssetsStep.title).to.equal('Does your client have assets worth £2,500 or more?')
    expect(underEighteenAssetsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(underEighteenAssetsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(underEighteenAssetsStep.reachability)).to.include('Array.Contains')
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.under18Assets)
  })

  it('renders the exact question, supporting content, options, and guidance links', () => {
    expect(underEighteenAssetsField.code).to.equal('under-18-assets')
    expect(underEighteenAssetsField.fieldset?.legend?.text).to.equal('Does your client have assets worth £2,500 or more?')
    expect(underEighteenAssetsField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(JSON.stringify(underEighteenAssetsField.validWhen)).to.include(
      'Select yes if your client has assets worth £2,500 or more',
    )

    const content = JSON.stringify(underEighteenAssetsPageContent)
    expect(content).to.include('"level":2')
    expect(content).to.include('For example, money in bank accounts, investments, valuable items, property or land.')
    expect(content).to.include('If they have any assets like this, they must have a full means test.')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('Controlled work (PDF, 599KB)')
    expect(content).to.include('Assets (PDF, 599KB)')
    expect(content).to.include('#page=49')
  })

  it('requires an explicit valid Yes/No answer and uses the exact CCQ error message', () => {
    expect(isValidControlledWorkAnswer('under-18-assets', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('under-18-assets', 'no')).to.equal(true)
    for (const invalid of ['', undefined, null, 'true', 'false', 'maybe', true, false]) {
      expect(isValidControlledWorkAnswer('under-18-assets', invalid)).to.equal(false)
    }

    expect(JSON.stringify(underEighteenAssetsField.validWhen)).to.include('^(yes|no)$')
    expect(JSON.stringify(underEighteenAssetsField.validWhen)).to.include(
      'Select yes if your client has assets worth £2,500 or more',
    )
  })

  it('routes Yes to a means-tested matter branch and No to the under-18 exemption route', () => {
    const priorAnswers = {
      'immigration-or-asylum': 'yes',
      'controlled-legal-representation': 'no',
      'aggregated-means': 'no',
      'regular-income': 'no',
    } as const
    const minor = { isUnder18: true }

    expect(
      getNextStep(STEPS.under18Assets, { ...priorAnswers, 'under-18-assets': 'yes' }, minor),
    ).to.equal(STEPS.immigrationOrAsylumType)
    expect(
      getNextStep(STEPS.under18Assets, { ...priorAnswers, 'under-18-assets': 'no' }, minor),
    ).to.equal(undefined)
  })

  it('saves before the incomplete boundary and is exposed there when required', () => {
    const submission = JSON.stringify(underEighteenAssetsStep.onSubmission)
    const access = JSON.stringify(underEighteenAssetsStep.onAccess)
    const boundary = JSON.stringify(controlledWorkIncompleteStep.onAccess)

    expect(access).to.include(STEPS.immigrationOrAsylum)
    expect(access).to.include('controlled-work-incomplete')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')
    expect(boundary).to.include(STEPS.under18Assets)
  })
})
