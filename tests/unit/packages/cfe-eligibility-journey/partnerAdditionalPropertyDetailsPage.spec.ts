import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
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
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import {
  isPartnerAdditionalPropertyPercentageInRangeValue,
  isPositivePartnerAdditionalPropertyMoneyValue,
  isValidPartnerAdditionalPropertyMoneyValue,
  isValidPartnerAdditionalPropertyPercentageNumberValue,
  isWholePartnerAdditionalPropertyPercentageValue,
  partnerAdditionalPropertyDetailsFieldCodes,
  partnerAdditionalPropertyDetailsFields,
  partnerAdditionalPropertyDetailsPageContent,
} from '#packages/cfe-eligibility-journey/src/partnerAdditionalPropertyDetailsPage/partnerAdditionalPropertyDetailsBlock.js'
import { partnerAdditionalPropertyStep } from '#packages/cfe-eligibility-journey/src/partnerAdditionalPropertyPage/partnerAdditionalPropertyStep.js'
import { partnerAdditionalPropertyDetailsStep } from '#packages/cfe-eligibility-journey/src/partnerAdditionalPropertyDetailsPage/partnerAdditionalPropertyDetailsStep.js'

const QUESTION = "The partner's other property, holiday home or land"
const ADULT = { isUnder18: false }
const PASSPORTED_PARTNER_BASE: ControlledWorkAnswers = {
  'immigration-or-asylum': 'no',
  partner: 'yes',
  passporting: 'yes',
  'partner-over-60': 'no',
  'property-owned': 'none',
  'additional-property-owned': 'none',
  'partner-additional-property-owned': 'outright',
}

describe('Controlled-work partner additional property details page', () => {
  it('uses the shared layout and exact CCQ content without SMOD fields or guidance', () => {
    const steps = eligibilityJourney.steps ?? []
    const selectorIndex = steps.findIndex(({ code }) => code === STEPS.partnerAdditionalProperty)
    const detailsIndex = steps.findIndex(({ code }) => code === STEPS.partnerAdditionalPropertyDetails)
    const content = JSON.stringify(partnerAdditionalPropertyDetailsPageContent)
    const fields = JSON.stringify(partnerAdditionalPropertyDetailsFields)
    const layout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const submission = JSON.stringify(partnerAdditionalPropertyDetailsStep.onSubmission)

    expect(partnerAdditionalPropertyDetailsStep.path).to.equal('/partner-additional-property-details')
    expect(partnerAdditionalPropertyDetailsStep.title).to.equal(QUESTION)
    expect(detailsIndex).to.be.greaterThan(selectorIndex)
    expect(partnerAdditionalPropertyDetailsStep.view?.template).to.equal(
      'case_details/forge_forms/eligibility-question-form',
    )
    expect(JSON.stringify(partnerAdditionalPropertyDetailsStep.reachability)).to.include(
      CONTROLLED_WORK_DATA_KEYS.applicableSteps,
    )
    expect(JSON.stringify(partnerAdditionalPropertyDetailsStep.onAccess)).to.include(
      CONTROLLED_WORK_DATA_KEYS.firstMissingStep,
    )
    expect(submission).to.include('SaveRepeatingItems')
    expect(submission).to.include('NormalizePartnerAdditionalPropertyDetails')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')

    for (const copy of [
      QUESTION,
      'Partner',
      'Do not include any property or land already entered for your client.',
      'Other property, holiday home or land %1',
      'How much is the property, holiday home or land worth?',
      'You can use property websites to find the estimated value. If you have more than one valuation, use the highest. Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.',
      'Is there an outstanding mortgage on the property, holiday home or land?',
      'How much is left to pay on the mortgage?',
      'Enter the value of the outstanding mortgage',
      'Check the statement from the mortgage provider or lender and include any other loans secured against the property',
      'What percentage share does the partner own?',
      'Add another property, holiday home or land',
      'Properties owned that are not the \'main house\' (PDF, 599KB)',
      'Trapped capital (PDF, 599KB)',
      'Save and continue',
      'Guidance',
    ]) {
      expect(content).to.include(copy)
    }

    expect(content).to.include('"level":2')
    expect(content).to.include('govuk-tag--purple')
    expect(content).to.include('"width":"two-thirds"')
    expect(content).to.include('"width":"one-third"')
    expect(content).to.include('"inputmode":"decimal"')
    expect(content).to.include('"inputmode":"numeric"')
    expect(content).to.include('"prefix":{"text":"£"}')
    expect(content).to.include('"suffix":{"text":"%"}')
    expect(content).not.to.include('subject matter of dispute')
    expect(content).not.to.include('Help with subject matter of dispute')
    expect(fields).not.to.include('house_in_dispute')
    expect(layout).to.include('"text":"Save and continue"')
    expect(layout).to.include('"text":"Guidance"')
    expect(partnerAdditionalPropertyDetailsFieldCodes).to.deep.equal([
      'house_value',
      'inline_owned_with_mortgage',
      'mortgage',
      'percentage_owned',
    ])
  })

  it('declares exact validation copy for every repeated field', () => {
    const fields = JSON.stringify(partnerAdditionalPropertyDetailsFields)
    for (const field of [
      partnerAdditionalPropertyDetailsFields.houseValue,
      partnerAdditionalPropertyDetailsFields.predeterminedMortgage,
      partnerAdditionalPropertyDetailsFields.conditionalMortgage,
      partnerAdditionalPropertyDetailsFields.percentageOwned,
    ]) {
      expect(JSON.stringify(field.validWhen)).to.include('IsRequired')
    }
    expect(JSON.stringify(partnerAdditionalPropertyDetailsFields.inlineMortgageQuestion.validWhen)).to.include(
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
      'Enter the percentage share the partner owns',
      'Enter the percentage share the partner owns of property %1',
      'Percentage share the partner owns must be a number between 1 and 100',
      'Percentage share the partner owns of property %1 must be a number between 1 and 100',
      'Percentage share the partner owns must be a whole number between 1 and 100',
      'Percentage share the partner owns of property %1 must be a whole number between 1 and 100',
      'Percentage share the partner owns must be between 1 and 100',
      'Percentage share the partner owns of property %1 must be between 1 and 100',
    ]) {
      expect(fields).to.include(message)
    }
  })

  it('validates property and mortgage amounts and whole percentage shares from 1 to 100', () => {
    for (const value of ['1', '100000', '1,000.50', '£250']) {
      expect(isValidPartnerAdditionalPropertyMoneyValue(value)).to.equal(true)
      expect(isPositivePartnerAdditionalPropertyMoneyValue(value)).to.equal(true)
    }
    for (const value of ['', undefined, null, '1,23', 'not an amount']) {
      expect(isValidPartnerAdditionalPropertyMoneyValue(value)).to.equal(value === '' || value === undefined || value === null)
    }
    for (const value of ['0', '-1', '-1000']) {
      expect(isPositivePartnerAdditionalPropertyMoneyValue(value)).to.equal(false)
    }

    for (const value of ['1', '50', '100', 20]) {
      expect(isValidPartnerAdditionalPropertyPercentageNumberValue(value)).to.equal(true)
      expect(isWholePartnerAdditionalPropertyPercentageValue(value)).to.equal(true)
      expect(isPartnerAdditionalPropertyPercentageInRangeValue(value)).to.equal(true)
    }
    expect(isValidPartnerAdditionalPropertyPercentageNumberValue('not a percentage')).to.equal(false)
    expect(isWholePartnerAdditionalPropertyPercentageValue('1.5')).to.equal(false)
    for (const value of ['0', '101']) {
      expect(isPartnerAdditionalPropertyPercentageInRangeValue(value)).to.equal(false)
    }
  })

  it('follows partner ownership choices and requires explicit completion only for outright or mortgage', () => {
    for (const ownership of ['with_mortgage', 'outright'] as const) {
      const answers: ControlledWorkAnswers = {
        ...PASSPORTED_PARTNER_BASE,
        'partner-additional-property-owned': ownership,
      }

      expect(getApplicableSteps(answers, ADULT)).to.include(STEPS.partnerAdditionalPropertyDetails)
      expect(getNextStep(STEPS.partnerAdditionalProperty, answers, ADULT)).to.equal(
        STEPS.partnerAdditionalPropertyDetails,
      )
      expect(findMissingSteps(answers, ADULT).find(({ stepCode }) => stepCode === STEPS.partnerAdditionalPropertyDetails))
        .to.deep.equal({
          stepCode: STEPS.partnerAdditionalPropertyDetails,
          answerCodes: ['partner-additional-property-details-completed'],
        })
      expect(
        resolveControlledWorkJourney(
          { ...answers, 'partner-additional-property-details-completed': 'yes' },
          ADULT,
        ).answers['partner-additional-property-details-completed'],
      ).to.equal('yes')
    }

    for (const ownership of ['none', 'shared_ownership'] as const) {
      const answers = { ...PASSPORTED_PARTNER_BASE, 'partner-additional-property-owned': ownership } as const
      expect(getApplicableSteps(answers, ADULT)).not.to.include(STEPS.partnerAdditionalPropertyDetails)
    }
    expect(isValidControlledWorkAnswer('partner-additional-property-details-completed', 'yes')).to.equal(true)
    expect(isValidControlledWorkAnswer('partner-additional-property-details-completed', 'no')).to.equal(false)
    expect(JSON.stringify(partnerAdditionalPropertyStep.onSubmission)).to.include(STEPS.partnerAdditionalPropertyDetails)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(
      STEPS.partnerAdditionalPropertyDetails,
    )
  })

  it('prunes partner details when the partner gate changes and preserves the client property route', () => {
    const answers: ControlledWorkAnswers = {
      ...PASSPORTED_PARTNER_BASE,
      'additional-property-owned': 'outright',
      'additional-property-details-completed': 'yes',
      'partner-additional-property-details-completed': 'yes',
    }
    const partnerRemoved = resolveControlledWorkJourney({ ...answers, partner: 'no' }, ADULT)
    expect(partnerRemoved.answers).not.to.have.property('partner-additional-property-owned')
    expect(partnerRemoved.answers).not.to.have.property('partner-additional-property-details-completed')
    expect(partnerRemoved.answers['additional-property-details-completed']).to.equal('yes')

    const clientPropertyChanged = resolveControlledWorkJourney(
      { ...answers, 'additional-property-owned': 'shared_ownership' },
      ADULT,
    )
    expect(clientPropertyChanged.steps).not.to.include(STEPS.additionalPropertyDetails)
    expect(clientPropertyChanged.steps).not.to.include(STEPS.partnerAdditionalPropertyDetails)
    expect(clientPropertyChanged.answers).not.to.have.property('partner-additional-property-details-completed')
  })
})
