import { expect } from 'chai'
import { Browser, HOUSING_COST_ANSWERS, SINGLE_CLIENT, SINGLE_HOMEOWNER, without } from './support/changeAnswersJourney.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'

describe('Controlled-work housing-costs submissions', () => {
  for (const benefit of ['yes', 'no'] as const) {
    it(`submits housing costs with Housing Benefit ${benefit}`, async () => {
      const user = new Browser().seed(without(SINGLE_CLIENT, ...Object.keys(HOUSING_COST_ANSWERS)))
      const answers = {
        housing_payments: '500',
        housing_payments_frequency: 'monthly',
        housing_benefit_relevant: benefit,
        ...(benefit === 'yes' ? { housing_benefit_value: '100', housing_benefit_frequency: 'monthly' } : {}),
      }

      const outcome = await user.submit(STEPS.housingCosts, answers)

      expect(outcome).to.include({ step: STEPS.additionalProperty, type: 'render' })
      expect(user.savedAnswers).to.include(answers)
      if (benefit === 'no') {
        expect(user.savedAnswers).not.to.have.property('housing_benefit_value')
        expect(user.savedAnswers).not.to.have.property('housing_benefit_frequency')
      }
    })

    it(`submits shared-ownership housing costs with Housing Benefit ${benefit}`, async () => {
      const user = new Browser().seed({
        ...SINGLE_HOMEOWNER,
        'property-owned': 'shared_ownership',
        'property-landlord': 'yes',
      })
      const answers = {
        rent: '300',
        shared_ownership_mortgage: '200',
        combined_frequency: 'monthly',
        housing_benefit_relevant: benefit,
        ...(benefit === 'yes' ? { housing_benefit_value: '100', housing_benefit_frequency: 'monthly' } : {}),
      }

      const outcome = await user.submit(STEPS.sharedOwnershipHousingCosts, {
        rent: answers.rent,
        shared_ownership_mortgage: answers.shared_ownership_mortgage,
        combined_frequency: answers.combined_frequency,
        shared_ownership_housing_benefit_relevant: benefit,
        ...(benefit === 'yes'
          ? { shared_ownership_housing_benefit_value: '100', shared_ownership_housing_benefit_frequency: 'monthly' }
          : {}),
      })

      expect(outcome).to.include({ step: STEPS.propertyEntry, type: 'render' })
      expect(user.savedAnswers).to.include(answers)
      expect(Object.keys(user.savedAnswers).some((code) => code.startsWith('shared_ownership_housing_benefit'))).to.equal(false)
      if (benefit === 'no') {
        expect(user.savedAnswers).not.to.have.property('housing_benefit_value')
        expect(user.savedAnswers).not.to.have.property('housing_benefit_frequency')
      }
    })
  }

  it('still rejects Housing Benefit above housing costs on the shared-ownership page', async () => {
    const user = new Browser().seed({
      ...SINGLE_HOMEOWNER,
      'property-owned': 'shared_ownership',
      'property-landlord': 'yes',
    })
    await user.open(STEPS.sharedOwnershipHousingCosts)
    const before = user.savedAnswers

    const outcome = await user.submit(STEPS.sharedOwnershipHousingCosts, {
      rent: '300',
      shared_ownership_mortgage: '200',
      combined_frequency: 'monthly',
      shared_ownership_housing_benefit_relevant: 'yes',
      shared_ownership_housing_benefit_value: '501',
      shared_ownership_housing_benefit_frequency: 'monthly',
    })

    expect(outcome).to.include({ step: STEPS.sharedOwnershipHousingCosts, type: 'render' })
    expect(user.savedAnswers).to.deep.equal(before)
  })
})
