import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  findMissingSteps,
  getApplicableSteps,
  getNextStep,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  PROPERTY_OWNERSHIP_OPTIONS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { additionalPropertyStep } from '#packages/cfe-eligibility-journey/src/additionalPropertyPage/additionalPropertyStep.js'
import {
  additionalPropertyDetailsFieldCodes,
  additionalPropertyDetailsFields,
  additionalPropertyDetailsPageContent,
  isAdditionalPropertyPercentageInRangeValue,
  isPositiveAdditionalPropertyMoneyValue,
  isValidAdditionalPropertyMoneyValue,
  isValidAdditionalPropertyPercentageNumberValue,
  isWholeAdditionalPropertyPercentageValue,
} from '#packages/cfe-eligibility-journey/src/additionalPropertyDetailsPage/additionalPropertyDetailsBlock.js'
import { additionalPropertyDetailsStep } from '#packages/cfe-eligibility-journey/src/additionalPropertyDetailsPage/additionalPropertyDetailsStep.js'

const QUESTION = 'Client’s other property, holiday home or land'
const ADULT = { isUnder18: false }
const PASSPORTED_HOME: ControlledWorkAnswers = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'yes',
  'property-owned': 'none',
}

describe('Controlled-work additional property details page', () => {
  it('uses the shared eligibility-question layout, H2 and CCQ page copy', () => {
    const steps = eligibilityJourney.steps ?? []
    const additionalPropertyIndex = steps.findIndex(({ code }) => code === STEPS.additionalProperty)
    const detailsIndex = steps.findIndex(({ code }) => code === STEPS.additionalPropertyDetails)
    const content = JSON.stringify(additionalPropertyDetailsPageContent)
    const layout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const submission = JSON.stringify(additionalPropertyDetailsStep.onSubmission)

    expect(additionalPropertyDetailsStep.path).to.equal('/additional-property-details')
    expect(additionalPropertyDetailsStep.title).to.equal(QUESTION)
    expect(additionalPropertyDetailsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(detailsIndex).to.be.greaterThan(additionalPropertyIndex)
    expect(JSON.stringify(additionalPropertyDetailsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(additionalPropertyDetailsStep.onAccess)).to.include(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)
    expect(submission).to.include('SaveRepeatingItems')
    expect(submission).to.include('NormalizeAdditionalPropertyDetails')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')

    for (const copy of [
      QUESTION,
      'If your client and their partner share other property, a holiday home or land, include this here',
      'Other property, holiday home or land %1',
      'How much is the property, holiday home or land worth?',
      'You can use property websites to find the estimated value. If you have more than one valuation, use the highest. Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.',
      'Is there an outstanding mortgage on the property, holiday home or land?',
      'How much is left to pay on the mortgage?',
      'Enter the value of the outstanding mortgage',
      'Check the statement from the mortgage provider or lender and include any other loans secured against the property',
      'What percentage share does your client own?',
      'If the property, holiday home or land is shared with the partner, add the percentage the client and partner own together. We do not need to know what percentage each of them owns.',
      'This asset is a subject matter of dispute',
      'Help with subject matter of dispute',
      'Any asset owned or partially owned by your client that is the subject of a claim by their opponent in a case is the subject matter of dispute.',
      'These assets will be disregarded from the calculation, up to a total of £100,000.',
      'Add another property, holiday home or land',
      'Properties owned that are not the \'main house\' (PDF, 599KB)',
      'Trapped capital (PDF, 599KB)',
      'Subject matter of dispute (PDF, 599KB)',
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
    expect(layout).to.include('"text":"Save and continue"')
    expect(layout).to.include('"text":"Guidance"')
    expect(additionalPropertyDetailsFields.inlineMortgageQuestion.visibleWhen).to.not.equal(undefined)
    expect(additionalPropertyDetailsFields.predeterminedMortgage.visibleWhen).to.not.equal(undefined)
    expect(additionalPropertyDetailsFields.conditionalMortgage.visibleWhen).to.not.equal(undefined)
    expect(additionalPropertyDetailsFields.houseInDispute.visibleWhen).to.not.equal(undefined)
    expect(additionalPropertyDetailsFieldCodes).to.deep.equal([
      'house_value',
      'inline_owned_with_mortgage',
      'mortgage',
      'percentage_owned',
      'house_in_dispute',
    ])
  })

  it('declares the exact CCQ validation copy, including repeated-row variants', () => {
    const fields = JSON.stringify(additionalPropertyDetailsFields)
    for (const field of [
      additionalPropertyDetailsFields.houseValue,
      additionalPropertyDetailsFields.predeterminedMortgage,
      additionalPropertyDetailsFields.conditionalMortgage,
      additionalPropertyDetailsFields.percentageOwned,
    ]) {
      expect(JSON.stringify(field.validWhen)).to.include('IsRequired')
    }
    expect(JSON.stringify(additionalPropertyDetailsFields.inlineMortgageQuestion.validWhen)).to.include(
      '^(yes|no)$',
    )

    for (const message of [
      'Enter how much the property, holiday home or land is worth',
      'Enter how much property, holiday home or land %1 is worth',
      'How much the property, holiday home or land is worth must be a number',
      'How much property, holiday home or land %1 is worth must be a number',
      'The property, holiday home or land must be worth more than 0',
      'Property, holiday home or land %1 must be worth more than 0',
      'Select yes if there is an outstanding mortgage',
      'Select yes if there is an outstanding mortgage on other property, holiday home or land %1',
      'Enter how much is left to pay on the mortgage',
      'Enter how much is left to pay on the mortgage for property, holiday home or land %1',
      'How much is left to pay on the mortgage must be a number',
      'How much is left to pay on the mortgage for property, holiday home or land %1 must be a number',
      'How much is left to pay on the mortgage must be more than 0',
      'How much is left to pay on the mortgage for property, holiday home or land %1 must be more than 0',
      'Enter the percentage share your client owns',
      'Enter the percentage share your client owns of property %1',
      'Percentage share your client owns must be a number between 1 and 100',
      'Percentage share your client owns of property %1 must be a number between 1 and 100',
      'Percentage share your client owns must be a whole number between 1 and 100',
      'Percentage share your client owns of property %1 must be a whole number between 1 and 100',
      'Percentage share your client owns must be between 1 and 100',
      'Percentage share your client owns of property %1 must be between 1 and 100',
    ]) {
      expect(fields).to.include(message)
    }
  })

  it('validates positive property values and whole ownership percentages from 1 to 100', () => {
    for (const value of ['1', '100000', '1,000.50', '£250']) {
      expect(isValidAdditionalPropertyMoneyValue(value)).to.equal(true)
      expect(isPositiveAdditionalPropertyMoneyValue(value)).to.equal(true)
    }
    for (const value of ['', undefined, null, '1,23', 'not an amount']) {
      expect(isValidAdditionalPropertyMoneyValue(value)).to.equal(value === '' || value === undefined || value === null)
    }
    for (const value of ['0', '-1', '-1000']) {
      expect(isPositiveAdditionalPropertyMoneyValue(value)).to.equal(false)
    }

    for (const value of ['1', '50', '100', 20]) {
      expect(isValidAdditionalPropertyPercentageNumberValue(value)).to.equal(true)
      expect(isWholeAdditionalPropertyPercentageValue(value)).to.equal(true)
      expect(isAdditionalPropertyPercentageInRangeValue(value)).to.equal(true)
    }
    expect(isValidAdditionalPropertyPercentageNumberValue('not a percentage')).to.equal(false)
    expect(isWholeAdditionalPropertyPercentageValue('1.5')).to.equal(false)
    for (const value of ['0', '101']) {
      expect(isAdditionalPropertyPercentageInRangeValue(value)).to.equal(false)
    }
  })

  it('routes owned additional property choices here and requires an explicit completion answer', () => {
    for (const ownership of ['with_mortgage', 'outright'] as const) {
      const answers: ControlledWorkAnswers = {
        ...PASSPORTED_HOME,
        'additional-property-owned': ownership,
      }

      expect(getApplicableSteps(answers, ADULT)).to.include(STEPS.additionalPropertyDetails)
      expect(getNextStep(STEPS.additionalProperty, answers, ADULT)).to.equal(STEPS.additionalPropertyDetails)
      expect(findMissingSteps(answers, ADULT).find(({ stepCode }) => stepCode === STEPS.additionalPropertyDetails))
        .to.deep.equal({
          stepCode: STEPS.additionalPropertyDetails,
          answerCodes: ['additional-property-details-completed'],
        })

      const completed = resolveControlledWorkJourney(
        { ...answers, 'additional-property-details-completed': 'yes' },
        ADULT,
      )
      expect(completed.answers['additional-property-details-completed']).to.equal('yes')
    }

    const noProperty = { ...PASSPORTED_HOME, 'additional-property-owned': 'none' } as const
    const sharedOwnership = { ...PASSPORTED_HOME, 'additional-property-owned': 'shared_ownership' } as const
    expect(getApplicableSteps(noProperty, ADULT)).not.to.include(STEPS.additionalPropertyDetails)
    expect(getApplicableSteps(sharedOwnership, ADULT)).not.to.include(STEPS.additionalPropertyDetails)
    expect(JSON.stringify(additionalPropertyStep.onSubmission)).to.include(STEPS.additionalPropertyDetails)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.additionalPropertyDetails)
  })

  it('accepts only the valid mortgage-choice, ownership and dispute answer values', () => {
    for (const value of PROPERTY_OWNERSHIP_OPTIONS) {
      expect(isValidControlledWorkAnswer('additional-property-owned', value)).to.equal(true)
    }
    expect(isValidControlledWorkAnswer('additional-property-details-completed', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('additional-property-details-completed', 'no')).to.equal(false)
  })
})
