import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  controlledWorkIncompleteStep,
  controlledWorkIncompleteStepCode,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { getApplicableSteps, getNextStep, isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { applicantPageContent, partnerField, passportingField } from '#packages/cfe-eligibility-journey/src/applicantPage/applicantBlock.js'
import { applicantStep } from '#packages/cfe-eligibility-journey/src/applicantPage/applicantStep.js'

const ADULT = { isUnder18: false }

describe('Applicant page', () => {
  it('registers after asylum support and uses the shared eligibility form', () => {
    const steps = eligibilityJourney.steps ?? []
    const supportIndex = steps.findIndex(({ code }) => code === STEPS.asylumSupport)
    const applicantIndex = steps.findIndex(({ code }) => code === STEPS.applicant)

    expect(applicantIndex).to.be.greaterThan(supportIndex)
    expect(applicantStep.path).to.equal('/applicant')
    expect(applicantStep.title).to.equal('Tell us about your client')
    expect(applicantStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(applicantStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(applicantStep.reachability)).to.include(STEPS.applicant)
  })

  it('renders the exact required partner and passporting Yes/No fields and CCQ validation messages', () => {
    expect(partnerField.code).to.equal('partner')
    expect(partnerField.fieldset?.legend?.text).to.equal('Does your client have a partner?')
    expect(partnerField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(JSON.stringify(partnerField.validWhen)).to.include(
      '"message":"Select yes if the client has a partner"',
    )

    expect(passportingField.code).to.equal('passporting')
    expect(passportingField.fieldset?.legend?.text).to.equal('Does your client receive a passporting benefit?')
    expect(passportingField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(JSON.stringify(passportingField.validWhen)).to.include(
      "\"message\":\"Select yes if your client receives a passporting benefit or if they are named on their partner's passporting benefit\"",
    )

    for (const code of ['partner', 'passporting'] as const) {
      expect(isValidControlledWorkAnswer(code, 'yes')).to.equal(true)
      expect(isValidControlledWorkAnswer(code, 'no')).to.equal(true)
      for (const invalid of ['', undefined, null, 'true', 'false', 'maybe', true, false, Number.NaN]) {
        expect(isValidControlledWorkAnswer(code, invalid)).to.equal(false)
      }
    }
  })

  it('renders CCQ help content and the controlled-work passporting guidance in the shared layout', () => {
    const content = JSON.stringify(applicantPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))

    expect(content).to.include('"text":"Tell us about your client"')
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(content).to.include('Help with definition of a partner')
    expect(content).to.include('A partner is someone your client is:')
    expect(content).to.include('married to')
    expect(content).to.include('in a civil partnership with')
    expect(content).to.include(
      'living with as if they are married or in a civil partnership, or living separately due to financial or practical reasons, for example one of them is in prison, getting hospital care, or another reason',
    )
    expect(content).to.include('Do not include anyone who:')
    expect(content).to.include('is separated from the client in a way that is likely to be permanent')
    expect(content).to.include('is an opponent in the case')
    expect(content).to.include(
      'has a contrary interest in the case - this means they want a different outcome to your client',
    )
    expect(content).to.include('Help with passporting benefits')
    expect(content).to.include(
      'They will not need an income assessment if they receive any of these passporting benefits:',
    )
    expect(content).to.include('Universal Credit')
    expect(content).to.include('Income Support')
    expect(content).to.include("income-based Jobseeker's Allowance (JSA)")
    expect(content).to.include('income-related Employment and Support Allowance (ESA)')
    expect(content).to.include('Guarantee Credit element of Pension Credit')
    expect(content).to.include(
      "Also select yes if your client is named on their partner's passporting benefit claim.",
    )
    expect(content).to.include('"content":"Passporting (PDF, 599KB)"')
    expect(content).to.include(
      'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf#page=12',
    )
    expect(content).not.to.include('Prisoners (PDF')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('routes into applicant only on a means-tested route and preserves the subsequent branch conditions', () => {
    const noMatter = { 'immigration-or-asylum': 'no' } as const
    expect(getNextStep(STEPS.immigrationOrAsylum, noMatter, ADULT)).to.equal(STEPS.applicant)
    expect(getApplicableSteps({ ...noMatter, partner: 'yes', passporting: 'no' }, ADULT)).to.include(
      STEPS.partnerEmploymentStatus,
    )
    expect(getApplicableSteps({ ...noMatter, partner: 'no', passporting: 'yes' }, ADULT)).to.not.include(
      STEPS.partnerEmploymentStatus,
    )
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.applicant)
    expect(JSON.stringify(applicantStep.onAccess)).to.include(STEPS.asylumSupport)
    expect(JSON.stringify(applicantStep.onSubmission)).to.include('SaveControlledWorkAnswers')
    expect(JSON.stringify(applicantStep.onSubmission)).to.include(controlledWorkIncompleteStepCode)
  })
})
