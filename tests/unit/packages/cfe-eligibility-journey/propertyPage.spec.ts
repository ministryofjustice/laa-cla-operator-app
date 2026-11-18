import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  getApplicableSteps,
  getFirstMissingStep,
  getNextStep,
  isControlledWorkComplete,
  isValidControlledWorkAnswer,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  PROPERTY_OWNERSHIP_OPTIONS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { propertyPageContent, propertyQuestionFields } from '#packages/cfe-eligibility-journey/src/propertyPage/propertyBlock.js'
import { propertyStep } from '#packages/cfe-eligibility-journey/src/propertyPage/propertyStep.js'

const ADULT = { isUnder18: false }
const SINGLE_QUESTION = 'Does your client own the home they usually live in?'
const PARTNER_QUESTION = 'Does your client or their partner own the home the client usually lives in?'
const GUIDANCE_URL =
  'https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf'
const PASSPORTED_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'yes',
} as const satisfies ControlledWorkAnswers

describe('Controlled-work property page', () => {
  it('follows partner outgoings in the existing journey and uses the shared form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const partnerOutgoingsIndex = steps.findIndex(({ code }) => code === STEPS.partnerOutgoings)
    const propertyIndex = steps.findIndex(({ code }) => code === STEPS.property)
    const submission = JSON.stringify(propertyStep.onSubmission)

    expect(propertyIndex).to.be.greaterThan(partnerOutgoingsIndex)
    expect(propertyStep.path).to.equal('/property')
    expect(propertyStep.title).to.equal(SINGLE_QUESTION)
    expect(propertyStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(propertyStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(propertyStep.reachability)).to.include(STEPS.property)
    expect(JSON.stringify(propertyStep.onAccess)).to.include(STEPS.partnerOutgoings)
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('"validate":true')
    expect(submission).to.include('controlled-work-incomplete')
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.property)

    const content = JSON.stringify(propertyPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('matches the CCQ single and partner questions, supporting details, and ownership options', () => {
    const content = JSON.stringify(propertyPageContent)
    const fields = JSON.stringify(propertyQuestionFields)

    expect(content).to.include(`"text":"${SINGLE_QUESTION}"`)
    expect(content).to.include(`"text":"${PARTNER_QUESTION}"`)
    expect(content).to.include('"level":2')
    expect(content).to.include('"summaryText":"Clients who are away from their usual home"')
    expect(content).to.include('Select yes if your client is temporarily away from the home they own and usually live in.')
    expect(content).to.include(
      'Select yes if your client or their partner owns the home the client usually lives in, but the client is temporarily away from this home.',
    )
    expect(content).to.include('If they have temporarily left this home due to domestic abuse, selecting yes ensures the equity disregard is applied.')
    expect(content).to.include('"summaryText":"Clients in prison"')
    expect(content).to.include(
      'If your client is in prison but their partner lives in a property either of them owns, include this as the main dwelling and any housing costs the partner pays.',
    )

    expect(propertyQuestionFields.single.dependentWhen).to.not.equal(undefined)
    expect(propertyQuestionFields.partner.dependentWhen).to.not.equal(undefined)
    expect(fields).to.include(SINGLE_QUESTION)
    expect(fields).to.include(PARTNER_QUESTION)
    expect(fields).to.include('"value":"with_mortgage","text":"Yes, with a mortgage or loan"')
    expect(fields).to.include('"value":"shared_ownership","text":"Yes, through a shared ownership scheme"')
    expect(fields).to.include('"value":"outright","text":"Yes, owned outright"')
    expect(fields).to.include('"value":"none","text":"No"')
    expect(PROPERTY_OWNERSHIP_OPTIONS).to.deep.equal(['with_mortgage', 'shared_ownership', 'outright', 'none'])
  })

  it('requires an allowed ownership option and reports the exact CCQ error', () => {
    const fields = JSON.stringify(propertyQuestionFields)

    expect(fields).to.include('^(with_mortgage|shared_ownership|outright|none)$')
    expect(fields).to.include('"message":"Select if your client owns the home they live in"')
    for (const value of PROPERTY_OWNERSHIP_OPTIONS) {
      expect(isValidControlledWorkAnswer('property-owned', value)).to.equal(true)
    }
    for (const value of ['', undefined, null, 'yes', 'mortgage', true, false]) {
      expect(isValidControlledWorkAnswer('property-owned', value)).to.equal(false)
    }
    expect(isValidControlledWorkAnswer('property-owned', 'none')).to.equal(true)
  })

  it('shows the property guidance links in the shared right-hand Guidance column', () => {
    const content = JSON.stringify(propertyPageContent)

    expect(content).to.include('"content":"Properties (PDF, 599KB)"')
    expect(content).to.include(`"href":["${GUIDANCE_URL}#page=36"]`)
    expect(content).to.include('"content":"Equity disregard for domestic abuse (PDF, 599KB)"')
    expect(content).to.include(`"href":["${GUIDANCE_URL}#page=42"]`)
    expect(content).to.include('"content":"Trapped capital (PDF, 599KB)"')
    expect(content).to.include(`"href":["${GUIDANCE_URL}#page=26"]`)
  })

  it('applies after applicant and outgoings on means-tested and passported routes without completing the journey', () => {
    expect(getApplicableSteps(PASSPORTED_ANSWERS, ADULT)).to.deep.equal([
      STEPS.immigrationOrAsylum,
      STEPS.applicant,
      STEPS.property,
    ])
    expect(getFirstMissingStep(PASSPORTED_ANSWERS, ADULT)).to.equal(STEPS.property)
    expect(getNextStep(STEPS.applicant, PASSPORTED_ANSWERS, ADULT)).to.equal(STEPS.property)

    const meansAnswers: ControlledWorkAnswers = {
      ...PASSPORTED_ANSWERS,
      passporting: 'no',
      'child-dependants': 'no',
      'adult-dependants': 'no',
      'employment-status': 'unemployed',
      'receives-benefits': 'no',
      friends_or_family_relevant: 'no',
      maintenance_relevant: 'no',
      property_or_lodger_relevant: 'no',
      pension_relevant: 'no',
      student_finance_relevant: 'no',
      other_relevant: 'no',
      'other-income-completed': 'yes',
      maintenance_payments_relevant: 'no',
      legal_aid_payments_relevant: 'no',
    }
    const lastApplicableMeansStep = getApplicableSteps(meansAnswers, ADULT).pop()
    expect(lastApplicableMeansStep).to.equal(STEPS.property)
    expect(getNextStep(STEPS.outgoings, meansAnswers, ADULT)).to.equal(STEPS.property)

    const partnerPassportedAnswers = { ...PASSPORTED_ANSWERS, partner: 'yes' } as const
    expect(getNextStep(STEPS.partnerDetails, partnerPassportedAnswers, ADULT)).to.equal(STEPS.property)
  })

  it('routes shared ownership to the implemented landlord question and leaves other property pages incomplete', () => {
    for (const propertyOwned of PROPERTY_OWNERSHIP_OPTIONS) {
      const answers: ControlledWorkAnswers = {
        ...PASSPORTED_ANSWERS,
        'property-owned': propertyOwned,
      }

      expect(getNextStep(STEPS.property, answers, ADULT)).to.equal(
        propertyOwned === 'shared_ownership' ? STEPS.propertyLandlord : undefined,
      )
      expect(isControlledWorkComplete(answers, ADULT)).to.equal(false)
    }
  })
})
