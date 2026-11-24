import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  getApplicableSteps,
  getNextStep,
  findMissingSteps,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  propertyEntryFields,
  propertyEntryPageContent,
} from '#packages/cfe-eligibility-journey/src/propertyEntryPage/propertyEntryBlock.js'
import { propertyEntryStep } from '#packages/cfe-eligibility-journey/src/propertyEntryPage/propertyEntryStep.js'

const ADULT = { isUnder18: false }
const PASSPORTED_ANSWERS = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'yes',
  'property-owned': 'outright',
} as const satisfies ControlledWorkAnswers
const PROPERTY_ANSWERS = {
  house_value: '350000',
  percentage_owned: '100',
  house_in_dispute: 'yes',
} as const satisfies ControlledWorkAnswers
const VALID_PROPERTY_ENTRY_NUMBER = 20

describe('Controlled-work property-entry page', () => {
  it('uses the shared question layout and follows the property step in the journey', () => {
    const steps = eligibilityJourney.steps ?? []
    const propertyIndex = steps.findIndex(({ code }) => code === STEPS.property)
    const propertyEntryIndex = steps.findIndex(({ code }) => code === STEPS.propertyEntry)
    const content = JSON.stringify(propertyEntryPageContent)
    const layout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const submission = JSON.stringify(propertyEntryStep.onSubmission)

    expect(propertyEntryStep.path).to.equal('/property-entry')
    expect(propertyEntryStep.title).to.equal('The home your client usually lives in')
    expect(propertyEntryStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(propertyEntryIndex).to.be.greaterThan(propertyIndex)
    expect(JSON.stringify(propertyEntryStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(propertyEntryStep.onAccess)).to.include(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)
    expect(JSON.stringify(propertyEntryStep.onAccess)).to.include(STEPS.mortgageOrLoanPayment)
    expect(JSON.stringify(propertyEntryStep.onAccess)).not.to.include('controlledWorkPropertyEntryBlocked')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')

    for (const copy of [
      'The home your client usually lives in',
      "Your client's name must be on the property deeds, lease, freehold or mortgage.",
      'Your client or their partner’s name must be on the property deeds, lease, freehold or mortgage.',
      'Home value',
      'You can use property websites to find the estimated value.',
      'If you have more than one valuation, use the highest.',
      'Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.',
      'How much is left to pay on the mortgage?',
      'Check the statement from the mortgage provider or lender and include any other loans secured against the property.',
      'What percentage of the home do they own?',
      'Add the percentage the client and partner own together. We do not need to know what percentage each of them owns.',
      'This asset is a subject matter of dispute',
      'Help with subject matter of dispute',
      'Any asset owned or partially owned by your client that is the subject of a claim by their opponent in a case is the subject matter of dispute.',
      'These assets will be disregarded from the calculation, up to a total of £100,000.',
      'Properties (PDF, 599KB)',
      'Equity disregard for domestic abuse (PDF, 599KB)',
      'Trapped capital (PDF, 599KB)',
      'Save and continue',
      'Guidance',
    ]) {
      expect(content).to.include(copy)
    }

    expect(content).to.include('"level":2')
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include('"inputType":"text"')
    expect(content).to.include('"inputmode":"decimal"')
    expect(content).to.include('"inputmode":"numeric"')
    expect(content).to.include('"prefix":{"text":"£"}')
    expect(content).to.include('"suffix":{"text":"%"}')
    expect(layout).to.include('"text":"Guidance"')
    expect(layout).to.include('"text":"Save and continue"')
    expect(propertyEntryFields.mortgage.visibleWhen).to.not.equal(undefined)
    expect(propertyEntryFields.houseInDispute.visibleWhen).to.not.equal(undefined)
    expect(propertyEntryFields.singlePercentageOwned.dependentWhen).to.not.equal(undefined)
    expect(propertyEntryFields.partnerPercentageOwned.dependentWhen).to.not.equal(undefined)
  })

  it('declares the exact CCQ validation messages for value, mortgage, percentage, and dispute fields', () => {
    const fields = JSON.stringify(propertyEntryFields)

    for (const message of [
      'Enter how much the home they live in is worth',
      "How much your client's home is worth must be a number",
      "Your client's home must be worth more than 0",
      'Enter how much is left to pay on the mortgage',
      'The amount left to pay on the mortgage must be a number',
      'The amount left to pay on the mortgage must be more than 0',
      'Enter the percentage share that they own of the home',
      'The percentage that they own of the home must be a number between 1 and 100',
      'The percentage that they own of the home must be a whole number',
      'The percentage that they own of the home must be between 1 and 100',
    ]) {
      expect(fields).to.include(message)
    }
  })

  it('accepts only positive money values and whole ownership percentages from 1 to 100', () => {
    for (const value of ['1', '350000', '£1,234.50', VALID_PROPERTY_ENTRY_NUMBER]) {
      expect(isValidControlledWorkAnswer('house_value', value)).to.equal(true)
      expect(isValidControlledWorkAnswer('mortgage', value)).to.equal(true)
    }
    for (const value of ['', undefined, null, '0', '-1', 'not an amount', '1,23']) {
      expect(isValidControlledWorkAnswer('house_value', value)).to.equal(false)
      expect(isValidControlledWorkAnswer('mortgage', value)).to.equal(false)
    }

    for (const value of ['1', '50', '100', VALID_PROPERTY_ENTRY_NUMBER]) {
      expect(isValidControlledWorkAnswer('percentage_owned', value)).to.equal(true)
    }
    for (const value of ['', undefined, null, '0', '101', '1.5', 'not a percentage']) {
      expect(isValidControlledWorkAnswer('percentage_owned', value)).to.equal(false)
    }
    expect(isValidControlledWorkAnswer('house_in_dispute', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('house_in_dispute', 'no')).to.equal(true)
    expect(isValidControlledWorkAnswer('house_in_dispute', 'maybe')).to.equal(false)
  })

  it('requires only rendered fields and conditionally requires the mortgage and dispute values', () => {
    const outrightMissing = findMissingSteps(PASSPORTED_ANSWERS, ADULT).find(
      ({ stepCode }) => stepCode === STEPS.propertyEntry,
    )
    expect(outrightMissing?.answerCodes).to.deep.equal(['house_value', 'percentage_owned', 'house_in_dispute'])

    const immigrationMatter: ControlledWorkAnswers = {
      ...PASSPORTED_ANSWERS,
      'immigration-or-asylum': 'yes',
      'immigration-or-asylum-type': 'asylum',
      'asylum-support': 'no',
    }
    const immigrationMissing = findMissingSteps(immigrationMatter, ADULT).find(
      ({ stepCode }) => stepCode === STEPS.propertyEntry,
    )
    expect(immigrationMissing?.answerCodes).to.deep.equal(['house_value', 'percentage_owned'])

    const mortgageAnswers: ControlledWorkAnswers = { ...PASSPORTED_ANSWERS, 'property-owned': 'with_mortgage' }
    const mortgageMissing = findMissingSteps(mortgageAnswers, ADULT).find(
      ({ stepCode }) => stepCode === STEPS.propertyEntry,
    )
    expect(mortgageMissing?.answerCodes).to.deep.equal(['house_value', 'mortgage', 'percentage_owned', 'house_in_dispute'])
  })

  it('routes outright and passported ownership to this page, and non-passported mortgages through mortgage payments', () => {
    expect(getApplicableSteps(PASSPORTED_ANSWERS, ADULT)).to.include(STEPS.propertyEntry)
    expect(getNextStep(STEPS.property, PASSPORTED_ANSWERS, ADULT)).to.equal(STEPS.propertyEntry)

    const passportedMortgage = { ...PASSPORTED_ANSWERS, 'property-owned': 'with_mortgage' } as const
    expect(getNextStep(STEPS.property, passportedMortgage, ADULT)).to.equal(STEPS.propertyEntry)

    const meansMortgage: ControlledWorkAnswers = {
      ...PASSPORTED_ANSWERS,
      passporting: 'no',
      'property-owned': 'with_mortgage',
    }
    expect(getApplicableSteps(meansMortgage, ADULT)).to.include(STEPS.propertyEntry)
    expect(getNextStep(STEPS.property, meansMortgage, ADULT)).to.equal(STEPS.mortgageOrLoanPayment)
    expect(getNextStep(STEPS.mortgageOrLoanPayment, meansMortgage, ADULT)).to.equal(STEPS.propertyEntry)
    expect(findMissingSteps(meansMortgage, ADULT).map(({ stepCode }) => stepCode)).to.include(STEPS.mortgageOrLoanPayment)
  })

  it('routes shared ownership through landlord and housing-cost steps before this page', () => {
    const sharedMeans: ControlledWorkAnswers = {
      ...PASSPORTED_ANSWERS,
      passporting: 'no',
      'property-owned': 'shared_ownership',
      'property-landlord': 'yes',
    }
    expect(getNextStep(STEPS.property, sharedMeans, ADULT)).to.equal(STEPS.propertyLandlord)
    expect(getNextStep(STEPS.propertyLandlord, sharedMeans, ADULT)).to.equal(STEPS.sharedOwnershipHousingCosts)
    expect(getNextStep(STEPS.sharedOwnershipHousingCosts, sharedMeans, ADULT)).to.equal(STEPS.propertyEntry)

    const sharedPassported: ControlledWorkAnswers = {
      ...PASSPORTED_ANSWERS,
      'property-owned': 'shared_ownership',
      'property-landlord': 'yes',
    }
    expect(getNextStep(STEPS.propertyLandlord, sharedPassported, ADULT)).to.equal(STEPS.propertyEntry)

    const landlordNo = { ...sharedMeans, 'property-landlord': 'no' } as const
    expect(getApplicableSteps(landlordNo, ADULT)).not.to.include(STEPS.propertyEntry)
  })

  it('prunes only answers made irrelevant by ownership or matter changes', () => {
    const complete: ControlledWorkAnswers = { ...PASSPORTED_ANSWERS, ...PROPERTY_ANSWERS, mortgage: '100000' }
    const outright = resolveControlledWorkJourney({ ...complete, 'property-owned': 'outright' }, ADULT)
    expect(outright.answers).to.include({ house_value: '350000', percentage_owned: '100', house_in_dispute: 'yes' })
    expect(outright.answers).not.to.have.property('mortgage')

    const immigrationMatter: ControlledWorkAnswers = {
      ...complete,
      'immigration-or-asylum': 'yes',
      'immigration-or-asylum-type': 'asylum',
      'asylum-support': 'no',
      'property-owned': 'with_mortgage',
    }
    const noDispute = resolveControlledWorkJourney(immigrationMatter, ADULT)
    expect(noDispute.answers).to.include({ house_value: '350000', mortgage: '100000', percentage_owned: '100' })
    expect(noDispute.answers).not.to.have.property('house_in_dispute')

    const noHome = resolveControlledWorkJourney({ ...complete, 'property-owned': 'none' }, ADULT)
    expect(noHome.answers).not.to.have.property('house_value')
    expect(noHome.answers).not.to.have.property('mortgage')
    expect(noHome.answers).not.to.have.property('percentage_owned')
    expect(noHome.answers).not.to.have.property('house_in_dispute')
  })
})
