import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_STEP_CODES } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { under18ClrField, under18ClrPageContent } from '#packages/cfe-eligibility-journey/src/under18ClrPage/under18ClrBlock.js'
import { under18ClrStep } from '#packages/cfe-eligibility-journey/src/under18ClrPage/under18ClrStep.js'

describe('Under-18 CLR page', () => {
  it('registers the CLR page after the incomplete boundary and uses the shared eligibility form', () => {
    const steps = eligibilityJourney.steps ?? []
    const boundaryIndex = steps.findIndex((journeyStep) => journeyStep.code === 'controlled-work-incomplete')

    expect(steps[boundaryIndex + 1].code).to.equal(CONTROLLED_WORK_STEP_CODES.under18Clr)
    expect(under18ClrStep.path).to.equal('/under-18-clr')
    expect(under18ClrStep.title).to.equal('Is the work controlled legal representation (CLR)?')
    expect(under18ClrStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(under18ClrStep.reachability)).to.include('Array.Contains')
  })

  it('renders the exact required Yes/No question with CCQ validation copy', () => {
    expect(under18ClrField.code).to.equal('controlled-legal-representation')
    expect(under18ClrField.fieldset?.legend?.text).to.equal('Is the work controlled legal representation (CLR)?')
    expect(under18ClrField.items).to.deep.equal([
      { value: 'yes', text: 'Yes' },
      { value: 'no', text: 'No' },
    ])
    expect(JSON.stringify(under18ClrField.validWhen)).to.include(
      'Select yes if the work is controlled legal representation (CLR)',
    )
    expect(isValidControlledWorkAnswer('controlled-legal-representation', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('controlled-legal-representation', 'no')).to.equal(true)
    for (const invalid of ['', 'true', 'false', 'maybe', true, false]) {
      expect(isValidControlledWorkAnswer('controlled-legal-representation', invalid)).to.equal(false)
    }
  })

  it('renders CCQ details and all three guidance links in the shared two-column layout', () => {
    const content = JSON.stringify(under18ClrPageContent)
    expect(content).to.include('"level":2')
    expect(content).to.include('Civil controlled legal representation (CLR)')
    expect(content).to.include('Regulation 21(2)(e)')
    expect(content).to.include('Health, Education and Social Care Chamber of the First-tier Tribunal')
    expect(content).to.include('Mental Health Review Tribunal for Wales')
    expect(content).to.include('Immigration and Asylum Chamber of the First tier Tribunal')
    expect(content).to.include('https://www.legislation.gov.uk/uksi/2012/3098/regulation/21/made')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('Controlled work (PDF, 599KB)')
    expect(content).to.include('Mental Health (PDF, 288KB)')
    expect(content).to.include('Controlled legal representation (CLR) for child applicants - Controlled work (PDF, 599KB)')
    expect(content).to.include('https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1143984/Mental_Health_Guidance_-_Contract_management_-_GOV.UK_2023.pdf')
    expect(content).to.include('#page=4')
  })

  it('saves before returning to the incomplete boundary and the boundary forwards to CLR when required', () => {
    const submission = JSON.stringify(under18ClrStep.onSubmission)
    const access = JSON.stringify(under18ClrStep.onAccess)
    const boundary = JSON.stringify(controlledWorkIncompleteStep.onAccess)

    expect(access).to.include(CONTROLLED_WORK_STEP_CODES.immigrationOrAsylum)
    expect(access).to.include('controlled-work-incomplete')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')
    expect(submission).to.include(CONTROLLED_WORK_STEP_CODES.aggregatedMeans)
    expect(boundary).to.include(CONTROLLED_WORK_STEP_CODES.under18Clr)
  })
})