import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  findMissingSteps,
  getApplicableSteps,
  getNextStep,
  isStepApplicable,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  isAtLeastValuablesThreshold,
  isNonNegativeAssetAmount,
  isPositiveInvestmentAmount,
  isValidAssetAmount,
} from '#packages/cfe-eligibility-journey/src/controlledWork/assetsAnswers.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import { assetsBankAccountFieldCodes, assetsFields, assetsPageContent } from '#packages/cfe-eligibility-journey/src/assetsPage/assetsBlock.js'
import { assetsStep } from '#packages/cfe-eligibility-journey/src/assetsPage/assetsStep.js'

const ADULT = { isUnder18: false }
const PASSPORTED_ASSETS_BASE: ControlledWorkAnswers = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'yes',
  'property-owned': 'none',
  'additional-property-owned': 'none',
}
const COMPLETED_ASSETS: ControlledWorkAnswers = {
  ...PASSPORTED_ASSETS_BASE,
  investments_relevant: 'no',
  valuables_relevant: 'no',
  'assets-completed': 'yes',
}

describe('Controlled-work client assets page', () => {
  it('uses the shared layout and CCQ assets content and registers after the property branches', () => {
    const journeySteps = eligibilityJourney.steps ?? []
    const partnerPropertyIndex = journeySteps.findIndex(({ code }) => code === STEPS.partnerAdditionalPropertyDetails)
    const assetsIndex = journeySteps.findIndex(({ code }) => code === STEPS.assets)
    const content = JSON.stringify(assetsPageContent)
    const layout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const submission = JSON.stringify(assetsStep.onSubmission)

    expect(assetsStep.path).to.equal('/assets')
    expect(assetsStep.title).to.equal('Client assets')
    expect(assetsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(assetsIndex).to.be.greaterThan(partnerPropertyIndex)
    expect(JSON.stringify(assetsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(assetsStep.onAccess)).to.include(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)
    expect(submission).to.include('SaveRepeatingItems')
    expect(submission).to.include('NormalizeAssets')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('controlled-work-incomplete')

    for (const copy of [
      'Client assets',
      'If any of these assets are owned by both the client and partner, enter the full value here. Do not enter them again on the partner questions that follow.',
      'Clients who are bankrupt',
      'If your client is bankrupt, any capital assets vested in the trustee in bankruptcy will not be included in the capital assessment.',
      'Money in bank accounts',
      'For example:',
      'current or savings accounts',
      'child accounts your client is a signatory on',
      'joint accounts with partner',
      'Do not include any disregarded capital or Cost of Living Payments.',
      'Examples of Cost of Living Payments',
      'Pensioner Cost of Living Payment',
      'Do not include',
      'Does your client have any investments?',
      'For example, shares in a public limited company, unit trusts or capital bonds.',
      'Include any jointly owned by the client and partner.',
      'Does your client have valuable items worth £500 or more?',
      'jewellery (but not wedding, engagement or eternity rings)',
      'any vehicle not in regular use',
      'equipment or tools used for work',
      'This asset is a subject matter of dispute',
      'Help with subject matter of dispute',
      'Assets and capital, including disregarded capital (PDF, 599KB)',
      'mandatory and discretionary disregarded capital (PDF, 599KB)',
      'the principles for exercising discretion (PDF, 599KB)',
      'Subject matter of dispute (PDF, 599KB)',
      'Add another bank account',
      'Save and continue',
      'Guidance',
    ]) {
      expect(content).to.include(copy)
    }

    expect(layout).to.include('"text":"Save and continue"')
    expect(layout).to.include('"text":"Guidance"')
    expect(content).to.include('"inputmode":"decimal"')
    expect(content).to.include('"prefix":{"text":"£"}')
    expect(assetsFields.bankAccountDispute.visibleWhen).to.not.equal(undefined)
    expect(assetsFields.investmentsAmount.visibleWhen).to.not.equal(undefined)
    expect(assetsFields.valuablesAmount.visibleWhen).to.not.equal(undefined)
    expect(assetsBankAccountFieldCodes).to.deep.equal(['amount', 'account_in_dispute'])
  })

  it('declares the CCQ validation messages for bank accounts, investments, and valuables', () => {
    const fields = JSON.stringify(assetsFields)
    for (const message of [
      'Enter total money in bank account. Enter 0 if this does not apply.',
      'Enter total money in bank account %1. Enter 0 if this does not apply.',
      'Total money in bank account must be a number. Enter 0 if this does not apply.',
      'Total money in bank account %1 must be a number. Enter 0 if this does not apply.',
      'Total money in bank account must be 0 or more. Enter 0 if this does not apply.',
      'Total money in bank account %1 must be 0 or more. Enter 0 if this does not apply.',
      'Select yes if client has any investments',
      'Enter the total value of investments.',
      'The total value of all investments must be a number.',
      'The total value of all investments must be greater than 0.',
      'Select yes if client has any valuables worth £500 or more',
      'Enter the total value of items worth £500 or more.',
      'Value of items worth £500 or more must be a number.',
      'Valuable items must be £500 or more.',
    ]) {
      expect(fields).to.include(message)
    }
  })

  it('validates zero and negative bank balances, positive investments, and the inclusive valuables threshold', () => {
    for (const value of ['0', '1', '£1,234.50']) {
      expect(isValidAssetAmount(value)).to.equal(true)
      expect(isNonNegativeAssetAmount(value)).to.equal(true)
    }
    for (const value of ['-1', '-0.01']) {
      expect(isNonNegativeAssetAmount(value)).to.equal(false)
    }
    for (const value of ['1', '£1,234.50']) {
      expect(isPositiveInvestmentAmount(value)).to.equal(true)
      expect(isValidControlledWorkAnswer('investments', value)).to.equal(true)
    }
    for (const value of ['0', '-1']) {
      expect(isPositiveInvestmentAmount(value)).to.equal(false)
      expect(isValidControlledWorkAnswer('investments', value)).to.equal(false)
    }
    expect(isValidAssetAmount('not an amount')).to.equal(false)
    expect(isValidControlledWorkAnswer('investments', 'not an amount')).to.equal(false)
    for (const value of ['500', '£500.00', '1,000']) {
      expect(isAtLeastValuablesThreshold(value)).to.equal(true)
      expect(isValidControlledWorkAnswer('valuables', value)).to.equal(true)
    }
    for (const value of ['499.99', '0', '-1']) {
      expect(isAtLeastValuablesThreshold(value)).to.equal(false)
      expect(isValidControlledWorkAnswer('valuables', value)).to.equal(false)
    }
    expect(isValidAssetAmount('not an amount')).to.equal(false)
    expect(isValidControlledWorkAnswer('valuables', 'not an amount')).to.equal(false)
    expect(isValidControlledWorkAnswer('investments_relevant', 'maybe')).to.equal(false)
    expect(isValidControlledWorkAnswer('valuables_relevant', 'yes')).to.equal(true)
  })

  it('requires conditional amounts and dispute choices only when they are applicable', () => {
    expect(findMissingSteps(COMPLETED_ASSETS, ADULT)).to.deep.equal([])

    const investmentsMissing = findMissingSteps(
      { ...PASSPORTED_ASSETS_BASE, investments_relevant: 'yes', valuables_relevant: 'no' },
      ADULT,
    ).find(({ stepCode }) => stepCode === STEPS.assets)
    expect(investmentsMissing?.answerCodes).to.deep.equal(['investments', 'investments_in_dispute', 'assets-completed'])

    const valuablesMissing = findMissingSteps(
      { ...PASSPORTED_ASSETS_BASE, investments_relevant: 'no', valuables_relevant: 'yes' },
      ADULT,
    ).find(({ stepCode }) => stepCode === STEPS.assets)
    expect(valuablesMissing?.answerCodes).to.deep.equal(['valuables', 'valuables_in_dispute', 'assets-completed'])

    const immigrationMatter: ControlledWorkAnswers = {
      ...PASSPORTED_ASSETS_BASE,
      'immigration-or-asylum': 'yes',
      'immigration-or-asylum-type': 'asylum',
      'asylum-support': 'no',
      investments_relevant: 'yes',
      investments: '100',
      valuables_relevant: 'no',
      'assets-completed': 'yes',
    }
    const missing = findMissingSteps(immigrationMatter, ADULT).find(({ stepCode }) => stepCode === STEPS.assets)
    expect(missing).to.equal(undefined)
  })

  it('includes the page only on means-tested routes and routes property branches to it', () => {
    expect(getApplicableSteps(PASSPORTED_ASSETS_BASE, ADULT)).to.include(STEPS.assets)
    expect(isStepApplicable(STEPS.assets, PASSPORTED_ASSETS_BASE, ADULT)).to.equal(true)
    expect(getNextStep(STEPS.additionalProperty, PASSPORTED_ASSETS_BASE, ADULT)).to.equal(STEPS.assets)

    const nonPassportedRoute: ControlledWorkAnswers = {
      ...PASSPORTED_ASSETS_BASE,
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
      housing_payments: '0',
      housing_benefit_relevant: 'no',
    }
    expect(getApplicableSteps(nonPassportedRoute, ADULT)).to.include(STEPS.assets)

    const exemptRoute: ControlledWorkAnswers = {
      'immigration-or-asylum': 'no',
      'controlled-legal-representation': 'yes',
    }
    expect(getApplicableSteps(exemptRoute, { isUnder18: true })).not.to.include(STEPS.assets)
    expect(isStepApplicable(STEPS.assets, exemptRoute, { isUnder18: true })).to.equal(false)
    expect(JSON.stringify(assetsStep.reachability)).to.include(STEPS.assets)
    const immigrationAssets = resolveControlledWorkJourney(
      {
        ...COMPLETED_ASSETS,
        'immigration-or-asylum': 'yes',
        'immigration-or-asylum-type': 'asylum',
        'asylum-support': 'no',
        investments_relevant: 'yes',
        investments: '100',
        investments_in_dispute: 'yes',
      },
      ADULT,
    )
    expect(immigrationAssets.answers).to.include({ investments: '100', investments_relevant: 'yes' })
    expect(immigrationAssets.answers).not.to.have.property('investments_in_dispute')

    for (const investments of ['yes', 'no'] as const) {
      for (const valuables of ['yes', 'no'] as const) {
        expect(
          getNextStep(
            STEPS.assets,
            {
              ...COMPLETED_ASSETS,
              investments_relevant: investments,
              ...(investments === 'yes' ? { investments: '100' } : {}),
              valuables_relevant: valuables,
              ...(valuables === 'yes' ? { valuables: '500' } : {}),
              investments_in_dispute: 'no',
              valuables_in_dispute: 'no',
            },
            ADULT,
          ),
        ).to.equal(undefined)
      }
    }
  })
})
