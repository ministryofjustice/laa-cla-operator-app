import { expect } from 'chai'
import {
  createEligibilityAnswerSnapshot,
  findFirstMissingEligibilityAnswer,
} from '#packages/cfe-eligibility-journey/src/answerSnapshot.js'

const noBenefits = {
  'universal-credit': 'no',
  'income-support': 'no',
  'income-based-jsa': 'no',
  'pension-credit': 'no',
  'employment-support': 'no',
}

describe('phase-one eligibility answer snapshot', () => {
  it('filters answers from inactive branches and represents an explicit no-property answer', () => {
    const snapshot = createEligibilityAnswerSnapshot(
      'CASE1',
      {
        category: 'standard',
        'under-18': 'no',
        'has-partner': 'no',
        '60-or-over': 'no',
        ...noBenefits,
        'has-property': 'no',
        propertySet: [{ value: '999999' }],
        'bank-balance': '0',
        'investment-balance': '0',
        'asset-balance': '0',
        'credit-balance': '0',
        'bank-balance-partner': '99',
        'disregards': ['none'],
        'self-employed': 'no',
        'earnings': '0',
      },
      [{ value: '999999' }],
      '1990-01-01',
    )

    expect(snapshot).to.deep.equal({
      schemaVersion: 1,
      caseId: 'CASE1',
      clientDateOfBirth: '1990-01-01',
      answers: {
        category: 'standard',
        'under-18': 'no',
        'has-partner': 'no',
        '60-or-over': 'no',
        ...noBenefits,
        'has-property': 'no',
        'bank-balance': '0',
        'investment-balance': '0',
        'asset-balance': '0',
        'credit-balance': '0',
        disregards: ['none'],
        'self-employed': 'no',
        earnings: '0',
      },
    })
  })

  it('includes only the child questions answered before the passported branch ends', () => {
    const snapshot = createEligibilityAnswerSnapshot(
      'CASE-CHILD',
      {
        'under-18': 'yes',
        'under-18-receives-regular-payment': 'no',
        'under-18-has-valuables': 'no',
        'has-partner': 'yes',
        'universal-credit': 'yes',
      },
      [],
      '2010-02-03',
    )

    expect(snapshot.answers).to.deep.equal({
      'under-18': 'yes',
      'under-18-receives-regular-payment': 'no',
      'under-18-has-valuables': 'no',
    })
  })

  it('requires an explicit property answer and a complete property collection when Yes is selected', () => {
    const baseAnswers = {
      'under-18': 'no',
      'has-partner': 'no',
      '60-or-over': 'no',
      ...noBenefits,
    }

    expect(findFirstMissingEligibilityAnswer(baseAnswers, [])).to.deep.equal({
      answerCode: 'has-property',
      stepPath: 'properties',
    })
    expect(findFirstMissingEligibilityAnswer({ ...baseAnswers, 'has-property': 'yes' }, [])).to.deep.equal({
      answerCode: 'propertySet',
      stepPath: 'properties',
    })
    expect(findFirstMissingEligibilityAnswer(
      { ...baseAnswers, 'has-property': 'yes' },
      [{ value: '0', 'mortgage-left': '', main: 'yes', share: '100' }],
    )).to.deep.equal({
      answerCode: 'mortgage-left_0',
      stepPath: 'properties',
    })
  })

  it('accepts zero as a complete monetary and dependant answer', () => {
    const answers: Record<string, unknown> = {
      ...noBenefits,
      category: 'standard',
      'under-18': 'no',
      'has-partner': 'no',
      '60-or-over': 'no',
      'has-property': 'no',
      'bank-balance': '0',
      'investment-balance': '0',
      'asset-balance': '0',
      'credit-balance': '0',
      disregards: ['none'],
      'self-employed': 'no',
      'dependants-16-over': '0',
      'dependants-15-under': '0',
      mortgage: '0',
      'mortgage-frequency': 'per_month',
      rent: '0',
      'rent-frequency': 'per_month',
      'maintenance-paid': '0',
      'maintenance-paid-frequency': 'per_month',
      'childcare-costs': '0',
      'childcare-costs-frequency': 'per_month',
      'legal-aid-contributions': '0',
    }
    for (const code of [
      'earnings',
      'income-tax',
      'national-insurance',
      'self-employment-drawings',
      'income-benefits',
      'tax-credits',
      'child-benefit',
      'maintenance-received',
      'pension-income',
      'other-income',
    ]) {
      answers[code] = '0'
      answers[`${code}-frequency`] = 'per_month'
    }

    expect(findFirstMissingEligibilityAnswer(answers, [])).to.equal(undefined)
  })
})
