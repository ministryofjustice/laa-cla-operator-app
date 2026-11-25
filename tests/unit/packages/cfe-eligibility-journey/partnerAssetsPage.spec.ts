import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import {
  findMissingSteps,
  getApplicableSteps,
  getNextStep,
  isStepApplicable,
  isValidControlledWorkAnswer,
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
import { assetsStep } from '#packages/cfe-eligibility-journey/src/assetsPage/assetsStep.js'
import { partnerAssetsFields, partnerAssetsBankAccountFieldCodes, partnerAssetsPageContent } from '#packages/cfe-eligibility-journey/src/partnerAssetsPage/partnerAssetsBlock.js'
import { partnerAssetsStep } from '#packages/cfe-eligibility-journey/src/partnerAssetsPage/partnerAssetsStep.js'

const ADULT = { isUnder18: false }
const PARTNER_ASSETS_BASE: ControlledWorkAnswers = {
  'immigration-or-asylum': 'no',
  partner: 'yes',
  passporting: 'yes',
  'partner-over-60': 'no',
  'property-owned': 'none',
  'additional-property-owned': 'none',
  'partner-additional-property-owned': 'none',
  investments_relevant: 'no',
  valuables_relevant: 'no',
  'assets-completed': 'yes',
}
const COMPLETED_PARTNER_ASSETS: ControlledWorkAnswers = {
  ...PARTNER_ASSETS_BASE,
  partner_investments_relevant: 'no',
  partner_valuables_relevant: 'no',
  'partner-assets-completed': 'yes',
}

describe('Controlled-work partner assets page', () => {
  it('uses the shared layout, CCQ partner-specific content, and follows client assets', () => {
    const journeySteps = eligibilityJourney.steps ?? []
    const assetsIndex = journeySteps.findIndex(({ code }) => code === STEPS.assets)
    const partnerAssetsIndex = journeySteps.findIndex(({ code }) => code === STEPS.partnerAssets)
    const content = JSON.stringify(partnerAssetsPageContent)
    const layout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    const submission = JSON.stringify(partnerAssetsStep.onSubmission)

    expect(partnerAssetsStep.path).to.equal('/partner-assets')
    expect(partnerAssetsStep.title).to.equal('Partner assets')
    expect(partnerAssetsIndex).to.be.greaterThan(assetsIndex)
    expect(JSON.stringify(assetsStep.onSubmission)).to.include(STEPS.partnerAssets)
    expect(JSON.stringify(partnerAssetsStep.reachability)).to.include(CONTROLLED_WORK_DATA_KEYS.applicableSteps)
    expect(JSON.stringify(partnerAssetsStep.onAccess)).to.include(CONTROLLED_WORK_DATA_KEYS.firstMissingStep)
    expect(submission).to.include('SaveRepeatingItems')
    expect(submission).to.include('SaveControlledWorkAnswers')
    expect(submission).to.include('partner_bank_accounts')
    expect(submission).to.include('controlled-work-incomplete')

    for (const copy of [
      'Partner assets',
      'Do not include any assets already entered for your client.',
      'Partners who are bankrupt',
      'If the partner is bankrupt, any capital assets vested in the trustee in bankruptcy will not be included in the capital assessment.',
      'Money in bank accounts',
      'current or savings accounts',
      'child accounts the partner is a signatory on',
      'Do not include any joint bank accounts already entered for your client.',
      'Do not include any disregarded capital or Cost of Living Payments.',
      'Examples of Cost of Living Payments',
      'Does the partner have any investments?',
      'Do not include any investments already entered for your client.',
      'Does the partner have valuable items worth £500 or more?',
      'Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.',
      'Do not include any valuable items already entered for your client.',
      'musical instruments, unless the partner is a professional musician',
      'any vehicle not in regular use',
      'equipment or tools used for work',
      'Assets and capital, including disregarded capital (PDF, 599KB)',
      'mandatory and discretionary disregarded capital (PDF, 599KB)',
      'the principles for exercising discretion (PDF, 599KB)',
      'Add another bank account',
      'Save and continue',
      'Guidance',
    ]) {
      expect(content).to.include(copy)
    }

    expect(content).not.to.include('subject matter of dispute')
    expect(content).not.to.include('This asset is a subject matter of dispute')
    expect(layout).to.include('"text":"Save and continue"')
    expect(layout).to.include('"text":"Guidance"')
    expect(content).to.include('"inputmode":"decimal"')
    expect(content).to.include('"prefix":{"text":"£"}')
    expect(partnerAssetsFields.bankAccountAmount).to.not.equal(undefined)
    expect(partnerAssetsFields.investmentsAmount.visibleWhen).to.not.equal(undefined)
    expect(partnerAssetsFields.valuablesAmount.visibleWhen).to.not.equal(undefined)
    expect(partnerAssetsBankAccountFieldCodes).to.deep.equal(['amount'])
  })

  it('declares CCQ validation for partner bank accounts, investments, and valuables', () => {
    const fields = JSON.stringify(partnerAssetsFields)
    for (const message of [
      'Enter total money in bank account. Enter 0 if this does not apply.',
      'Enter total money in bank account %1. Enter 0 if this does not apply.',
      'Total money in bank account must be a number. Enter 0 if this does not apply.',
      'Total money in bank account %1 must be a number. Enter 0 if this does not apply.',
      'Total money in bank account must be 0 or more. Enter 0 if this does not apply.',
      'Total money in bank account %1 must be 0 or more. Enter 0 if this does not apply.',
      'Select yes if the partner has any investments',
      'Enter the total value of investments.',
      'The total value of all investments must be a number.',
      'The total value of all investments must be greater than 0.',
      'Select yes if the partner has valuable items worth £500 or more',
      'Enter the total value of items worth £500 or more.',
      'Value of items worth £500 or more must be a number.',
      'Valuable items must be £500 or more.',
    ]) {
      expect(fields).to.include(message)
    }
  })

  it('validates zero and negative partner bank balances, positive investments, and the inclusive valuables threshold', () => {
    for (const value of ['0', '1', '£1,234.50']) {
      expect(isValidAssetAmount(value)).to.equal(true)
      expect(isNonNegativeAssetAmount(value)).to.equal(true)
    }
    for (const value of ['-1', '-0.01']) {
      expect(isNonNegativeAssetAmount(value)).to.equal(false)
    }
    for (const value of ['1', '£1,234.50']) {
      expect(isPositiveInvestmentAmount(value)).to.equal(true)
      expect(isValidControlledWorkAnswer('partner_investments', value)).to.equal(true)
    }
    for (const value of ['0', '-1']) {
      expect(isPositiveInvestmentAmount(value)).to.equal(false)
      expect(isValidControlledWorkAnswer('partner_investments', value)).to.equal(false)
    }
    for (const value of ['500', '£500.00', '1,000']) {
      expect(isAtLeastValuablesThreshold(value)).to.equal(true)
      expect(isValidControlledWorkAnswer('partner_valuables', value)).to.equal(true)
    }
    for (const value of ['499.99', '0', '-1']) {
      expect(isAtLeastValuablesThreshold(value)).to.equal(false)
      expect(isValidControlledWorkAnswer('partner_valuables', value)).to.equal(false)
    }
    expect(isValidControlledWorkAnswer('partner_investments_relevant', 'maybe')).to.equal(false)
    expect(isValidControlledWorkAnswer('partner_valuables_relevant', 'yes')).to.equal(true)
  })

  it('requires partner relevance answers and only requires conditional amounts for Yes answers', () => {
    expect(findMissingSteps(COMPLETED_PARTNER_ASSETS, ADULT)).to.deep.equal([])

    const investmentsMissing = findMissingSteps(
      { ...PARTNER_ASSETS_BASE, partner_investments_relevant: 'yes', partner_valuables_relevant: 'no' },
      ADULT,
    ).find(({ stepCode }) => stepCode === STEPS.partnerAssets)
    expect(investmentsMissing?.answerCodes).to.deep.equal(['partner_investments', 'partner-assets-completed'])

    const valuablesMissing = findMissingSteps(
      { ...PARTNER_ASSETS_BASE, partner_investments_relevant: 'no', partner_valuables_relevant: 'yes' },
      ADULT,
    ).find(({ stepCode }) => stepCode === STEPS.partnerAssets)
    expect(valuablesMissing?.answerCodes).to.deep.equal(['partner_valuables', 'partner-assets-completed'])
  })

  it('applies only with a partner after client assets are complete and routes from client assets', () => {
    expect(getApplicableSteps(PARTNER_ASSETS_BASE, ADULT)).to.include(STEPS.partnerAssets)
    expect(isStepApplicable(STEPS.partnerAssets, PARTNER_ASSETS_BASE, ADULT)).to.equal(true)
    expect(getNextStep(STEPS.assets, PARTNER_ASSETS_BASE, ADULT)).to.equal(STEPS.partnerAssets)
    expect(JSON.stringify(partnerAssetsStep.reachability)).to.include(STEPS.partnerAssets)

    const noPartner = { ...COMPLETED_PARTNER_ASSETS, partner: 'no' } as const
    expect(getApplicableSteps(noPartner, ADULT)).not.to.include(STEPS.partnerAssets)
    expect(isStepApplicable(STEPS.partnerAssets, noPartner, ADULT)).to.equal(false)
    expect(getNextStep(STEPS.assets, noPartner, ADULT)).to.equal(undefined)

    const clientAssetsIncomplete = { ...PARTNER_ASSETS_BASE }
    delete clientAssetsIncomplete['assets-completed']
    expect(getApplicableSteps(clientAssetsIncomplete, ADULT)).not.to.include(STEPS.partnerAssets)
  })
})
