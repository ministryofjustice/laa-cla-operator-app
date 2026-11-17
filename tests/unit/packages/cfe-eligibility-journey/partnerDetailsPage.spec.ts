import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  controlledWorkIncompleteStep,
  controlledWorkIncompleteStepCode,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import {
  findMissingSteps,
  getApplicableSteps,
  getNextStep,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { applicantStep } from '#packages/cfe-eligibility-journey/src/applicantPage/applicantStep.js'
import { otherIncomeStep } from '#packages/cfe-eligibility-journey/src/otherIncomePage/otherIncomeStep.js'
import { partnerDetailsPageContent, partnerOver60Field } from '#packages/cfe-eligibility-journey/src/partnerDetailsPage/partnerDetailsBlock.js'
import { partnerDetailsStep } from '#packages/cfe-eligibility-journey/src/partnerDetailsPage/partnerDetailsStep.js'

const ADULT = { isUnder18: false }

describe('Partner details page', () => {
  it('registers after other income and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const otherIncomeIndex = steps.findIndex(({ code }) => code === STEPS.otherIncome)
    const partnerDetailsIndex = steps.findIndex(({ code }) => code === STEPS.partnerDetails)

    expect(partnerDetailsIndex).to.be.greaterThan(otherIncomeIndex)
    expect(partnerDetailsStep.path).to.equal('/partner-details')
    expect(partnerDetailsStep.title).to.equal('Tell us about the partner')
    expect(partnerDetailsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(partnerDetailsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(partnerDetailsStep.reachability)).to.include(STEPS.partnerDetails)
    expect(JSON.stringify(partnerDetailsStep.onSubmission)).to.include('SaveControlledWorkAnswers')
    expect(JSON.stringify(partnerDetailsStep.onSubmission)).to.include(controlledWorkIncompleteStepCode)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.partnerDetails)

    const applicantSubmission = JSON.stringify(applicantStep.onSubmission)
    const otherIncomeSubmission = JSON.stringify(otherIncomeStep.onSubmission)
    expect(applicantSubmission).to.include(STEPS.partnerDetails)
    expect(otherIncomeSubmission).to.include(STEPS.partnerDetails)
  })

  it('renders the exact heading, required Yes/No question, hint and validation', () => {
    expect(partnerOver60Field.code).to.equal('partner-over-60')
    expect(partnerOver60Field.fieldset?.legend?.text).to.equal('Is the partner aged 60 or over?')
    expect(partnerOver60Field.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(JSON.stringify(partnerOver60Field)).to.include(
      'Clients with partners aged 60 or over may have some of their capital excluded from a financial eligibility assessment.',
    )
    expect(JSON.stringify(partnerOver60Field.validWhen)).to.include(
      '"message":"Select yes if the partner is aged 60 or over"',
    )

    for (const value of ['yes', 'no']) {
      expect(isValidControlledWorkAnswer('partner-over-60', value)).to.equal(true)
    }
    for (const value of ['', undefined, null, 'true', 'false', 'maybe', true, false, 1]) {
      expect(isValidControlledWorkAnswer('partner-over-60', value)).to.equal(false)
    }

    const content = JSON.stringify(partnerDetailsPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(content).to.include('"text":"Tell us about the partner"')
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('requires partner details only when a partner is present on a means-tested route', () => {
    const passported = { 'immigration-or-asylum': 'no', partner: 'yes', passporting: 'yes' } as const
    const meansTested = { 'immigration-or-asylum': 'no', partner: 'yes', passporting: 'no' } as const
    const applicantIncomplete = { 'immigration-or-asylum': 'no', partner: 'yes' } as const
    const noPartner = { 'immigration-or-asylum': 'no', partner: 'no', passporting: 'yes' } as const

    expect(getApplicableSteps(passported, ADULT)).to.include(STEPS.partnerDetails)
    expect(getApplicableSteps(passported, ADULT)).to.not.include(STEPS.partnerEmploymentStatus)
    expect(getApplicableSteps(meansTested, ADULT)).to.include(STEPS.partnerDetails)
    expect(getApplicableSteps(meansTested, ADULT)).to.include(STEPS.partnerEmploymentStatus)
    expect(getApplicableSteps(applicantIncomplete, ADULT)).to.not.include(STEPS.partnerDetails)
    expect(getApplicableSteps(noPartner, ADULT)).to.not.include(STEPS.partnerDetails)
    expect(findMissingSteps(passported, ADULT).map(({ stepCode }) => stepCode)).to.deep.equal([STEPS.partnerDetails])
  })

  it('navigates to partner details from the applicant or client income branch when appropriate', () => {
    const passported = { 'immigration-or-asylum': 'no', partner: 'yes', passporting: 'yes' } as const
    const afterIncome = {
      'immigration-or-asylum': 'no',
      partner: 'yes',
      passporting: 'no',
      'employment-status': 'unemployed',
      'receives-benefits': 'no',
      'other-income-completed': 'yes',
    } as const

    expect(getNextStep(STEPS.applicant, passported, ADULT)).to.equal(STEPS.partnerDetails)
    expect(getNextStep(STEPS.otherIncome, afterIncome, ADULT)).to.equal(STEPS.partnerDetails)
  })

  it('removes the saved answer when the partner gate changes to No but retains it for passporting changes', () => {
    const saved = {
      'immigration-or-asylum': 'no',
      partner: 'yes',
      passporting: 'yes',
      'partner-over-60': 'yes',
    } as const

    const passportingChanged = resolveControlledWorkJourney({ ...saved, passporting: 'no' }, ADULT)
    expect(passportingChanged.answers['partner-over-60']).to.equal('yes')

    const partnerRemoved = resolveControlledWorkJourney({ ...saved, partner: 'no' }, ADULT)
    expect(partnerRemoved.answers).to.not.have.property('partner-over-60')
    expect(partnerRemoved.removedCodes).to.include('partner-over-60')
  })
})
