import { expect } from 'chai'
import {
  Browser,
  CANNOT_USE_SERVICE,
  COMPLETE,
  HOUSING_COST_ANSWERS,
  NO_ASSETS,
  OTHER_CASE_ID,
  PASSPORTED_CLIENT,
  PASSPORTED_HOMEOWNER,
  PROPERTY_ENTRY_ANSWERS,
  SINGLE_CLIENT,
  SINGLE_HOMEOWNER,
  without,
} from './support/changeAnswersJourney.js'
import { readControlledWorkAnswers } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSession.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { controlledWorkIncompleteStepCode } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'

const CASE_ID = 'CASE1'
const PROPERTY_ENTRY_BODY = { ...PROPERTY_ENTRY_ANSWERS }
const isPartnerCode = (code: string): boolean => code.startsWith('partner_') || code.startsWith('partner-')

describe('Controlled-work change answers', () => {
  describe('starting a change', () => {
    it('prepopulates the page with the saved answer and starts a change loop for ?change=true', async () => {
      const user = new Browser().seed(SINGLE_HOMEOWNER)

      const outcome = await user.open(STEPS.property, { change: true })

      expect(outcome).to.include({ step: STEPS.property, type: 'render' })
      expect(user.changing).to.equal(true)
      expect(user.savedAnswers['property-owned']).to.equal('outright')
    })

    it('does not start a change loop without ?change=true', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)

      await user.open(STEPS.property)

      expect(user.changing).to.equal(false)
    })

    it('keeps change loops separate per case', async () => {
      const user = new Browser().seed(SINGLE_CLIENT).seed(SINGLE_CLIENT, OTHER_CASE_ID)

      await user.open(STEPS.property, { change: true })

      expect(user.session.controlledWorkChangeLoops).to.deep.equal({ [CASE_ID]: {} })
    })
  })

  describe('a change that does not affect branching', () => {
    it('saves the answer and returns when it is the last page in its group', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.employmentStatus, { change: true })

      const outcome = await user.submit(STEPS.employmentStatus, { 'employment-status': 'unemployed' })

      expect(outcome.step).to.equal(COMPLETE)
      expect(user.savedAnswers).to.deep.equal(SINGLE_CLIENT)
      expect(user.changing).to.equal(false)
    })

    it('walks the rest of the group again when the gate is unchanged (CCQ mini-loop)', async () => {
      const user = new Browser().seed(PASSPORTED_HOMEOWNER)
      await user.open(STEPS.property, { change: true })

      const afterGate = await user.submit(STEPS.property, { 'property-owned': 'outright' })
      expect(afterGate.step).to.equal(STEPS.propertyEntry)
      expect(user.savedAnswers).to.include(PROPERTY_ENTRY_ANSWERS)

      const afterEntry = await user.submit(STEPS.propertyEntry, PROPERTY_ENTRY_BODY)
      expect(afterEntry.step).to.equal(COMPLETE)
      expect(user.savedAnswers).to.deep.equal(PASSPORTED_HOMEOWNER)
    })

    it('re-shows later pages in the group even when the saved page does not name them', async () => {
      const dependants = { 'child-dependants': 'yes', 'child-dependants-count': '1', 'dependants-get-income': 'no' } as const
      const user = new Browser().seed({ ...SINGLE_CLIENT, ...dependants })
      await user.open(STEPS.dependantDetails, { change: true })

      const afterDetails = await user.submit(STEPS.dependantDetails, { ...dependants, 'adult-dependants': 'no' })
      expect(afterDetails.step).to.equal(STEPS.dependantIncome)

      const afterIncome = await user.submit(STEPS.dependantIncome, { 'dependants-get-income': 'no' })
      expect(afterIncome.step).to.equal(COMPLETE)
      expect(user.changing).to.equal(false)
    })

    it('without a change loop the journey still continues to the next applicable page', async () => {
      const user = new Browser().seed(PASSPORTED_HOMEOWNER)

      expect((await user.submit(STEPS.propertyEntry, PROPERTY_ENTRY_BODY)).step).to.equal(STEPS.additionalProperty)

      await user.open(STEPS.propertyEntry, { change: true })
      expect((await user.submit(STEPS.propertyEntry, PROPERTY_ENTRY_BODY)).step).to.equal(COMPLETE)
    })

    it('does not save or advance when validation fails', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.employmentStatus, { change: true })

      const outcome = await user.submit(STEPS.employmentStatus, {})

      expect(outcome).to.include({ step: STEPS.employmentStatus, type: 'render' })
      expect(user.savedAnswers).to.deep.equal(SINGLE_CLIENT)
      expect(user.changing).to.equal(true)
    })
  })

  describe('a change that introduces new required questions', () => {
    it('sends the user through the new question before returning (property No → Yes)', async () => {
      const user = new Browser().seed(PASSPORTED_CLIENT)
      await user.open(STEPS.property, { change: true })

      const afterGate = await user.submit(STEPS.property, { 'property-owned': 'outright' })

      expect(afterGate.step).to.equal(STEPS.propertyEntry)
      expect(user.savedAnswers['property-owned']).to.equal('outright')
      expect(user.changing).to.equal(true)

      const afterEntry = await user.submit(STEPS.propertyEntry, PROPERTY_ENTRY_BODY)
      expect(afterEntry.step).to.equal(COMPLETE)
      expect(user.savedAnswers).to.deep.equal(PASSPORTED_HOMEOWNER)
      expect(user.changing).to.equal(false)
    })

    it('keeps every other valid answer while the new question is open and after it is answered', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.property, { change: true })

      await user.submit(STEPS.property, { 'property-owned': 'outright' })
      expect(user.savedAnswers).to.include(NO_ASSETS).and.include({ 'additional-property-owned': 'none' })

      await user.submit(STEPS.propertyEntry, PROPERTY_ENTRY_BODY)
      expect(user.savedAnswers).to.deep.equal(SINGLE_HOMEOWNER)
    })

    it('goes to the earliest missing question when several are required', async () => {
      const user = new Browser().seed(SINGLE_HOMEOWNER)
      await user.open(STEPS.applicant, { change: true })

      const outcome = await user.submit(STEPS.applicant, { partner: 'yes', passporting: 'no' })

      expect(outcome.step).to.equal(STEPS.partnerDetails)
    })

    it('goes to a newly required page outside the changed step’s group', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.employmentStatus, { change: true })

      const outcome = await user.submit(STEPS.employmentStatus, { 'employment-status': 'in_work' })

      expect(outcome.step).to.equal(STEPS.income)
    })

    it('goes straight to a newly required later page (shared ownership)', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.property, { change: true })

      const afterGate = await user.submit(STEPS.property, { 'property-owned': 'shared_ownership' })

      expect(afterGate.step).to.equal(STEPS.propertyLandlord)
    })
  })

  describe('preventing incomplete submissions', () => {
    const userWithOpenQuestion = async (): Promise<Browser> => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.property, { change: true })
      await user.submit(STEPS.property, { 'property-owned': 'outright' })
      return user
    }

    it('does not let the user reach the complete page while a new question is unanswered', async () => {
      const user = await userWithOpenQuestion()

      const outcome = await user.open(COMPLETE)

      expect(outcome.step).to.not.equal(COMPLETE)
      expect(outcome.trail).to.not.include(COMPLETE)
    })

    it('redirects the hub and later pages to the missing question', async () => {
      const user = await userWithOpenQuestion()

      expect((await user.open(controlledWorkIncompleteStepCode)).step).to.equal(STEPS.propertyEntry)
      expect((await user.open(STEPS.assets)).step).to.equal(STEPS.propertyEntry)
      expect((await user.open(STEPS.additionalProperty)).step).to.equal(STEPS.propertyEntry)
    })

    it('sends a later submission back to the missing question instead of completing', async () => {
      const user = await userWithOpenQuestion()

      const outcome = await user.submit(STEPS.assets, { ...NO_ASSETS })

      expect(outcome.trail).to.not.include(COMPLETE)
      expect(outcome.step).to.equal(STEPS.propertyEntry)
      expect(user.changing).to.equal(true)
    })

    it('completes only once the missing question has been answered', async () => {
      const user = await userWithOpenQuestion()

      await user.submit(STEPS.propertyEntry, PROPERTY_ENTRY_BODY)

      expect((await user.open(COMPLETE)).step).to.equal(COMPLETE)
    })

    it('does not complete after a change that leads to cannot-use-service', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.property, { change: true })
      await user.submit(STEPS.property, { 'property-owned': 'shared_ownership' })

      const outcome = await user.submit(STEPS.propertyLandlord, { 'property-landlord': 'no' })

      expect(outcome.trail).to.include(CANNOT_USE_SERVICE)
      expect(outcome.trail).to.not.include(COMPLETE)
      expect((await user.open(COMPLETE)).step).to.not.equal(COMPLETE)
    })
  })

  describe('a change that removes previously required questions', () => {
    it('deletes the old property details and returns when nothing else is required (passported, Yes → No)', async () => {
      const user = new Browser().seed(PASSPORTED_HOMEOWNER)
      await user.open(STEPS.property, { change: true })

      const outcome = await user.submit(STEPS.property, { 'property-owned': 'none' })

      expect(outcome.step).to.equal(COMPLETE)
      expect(user.savedAnswers).to.deep.equal(PASSPORTED_CLIENT)
    })

    it('deletes the old property details and asks the housing-cost question CCQ requires (means-tested, Yes → No)', async () => {
      const user = new Browser().seed(SINGLE_HOMEOWNER)
      await user.open(STEPS.property, { change: true })

      const outcome = await user.submit(STEPS.property, { 'property-owned': 'none' })

      expect(outcome.step).to.equal(STEPS.housingCosts)
      expect(user.savedAnswers).to.deep.equal({
        ...without(SINGLE_HOMEOWNER, ...Object.keys(PROPERTY_ENTRY_ANSWERS)),
        'property-owned': 'none',
      })

      user.seed({ ...user.savedAnswers, ...HOUSING_COST_ANSWERS })
      expect((await user.open(COMPLETE)).step).to.equal(COMPLETE)
    })

    it('deletes the old housing-cost answers when they no longer apply (property No → Yes)', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.property, { change: true })

      await user.submit(STEPS.property, { 'property-owned': 'with_mortgage' })

      expect(user.savedAnswers).to.not.have.any.keys(...Object.keys(HOUSING_COST_ANSWERS))
    })

    it('removes matter details when the matter answer changes to No', async () => {
      const user = new Browser().seed({
        ...SINGLE_CLIENT,
        'immigration-or-asylum': 'yes',
        'immigration-or-asylum-type': 'asylum',
        'asylum-support': 'no',
      })
      await user.open(STEPS.immigrationOrAsylum, { change: true })

      const outcome = await user.submit(STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' })

      expect(outcome.step).to.equal(COMPLETE)
      expect(user.savedAnswers).to.deep.equal(SINGLE_CLIENT)
    })

    it('deletes the financial answers when the matter route becomes exempt', async () => {
      const user = new Browser().seed({
        ...SINGLE_CLIENT,
        'immigration-or-asylum': 'yes',
        'immigration-or-asylum-type': 'asylum',
        'asylum-support': 'no',
      })
      await user.open(STEPS.asylumSupport, { change: true })

      const outcome = await user.submit(STEPS.asylumSupport, { 'asylum-support': 'yes' })

      expect(outcome.step).to.equal(COMPLETE)
      expect(user.savedAnswers).to.deep.equal({
        'immigration-or-asylum': 'yes',
        'immigration-or-asylum-type': 'asylum',
        'asylum-support': 'yes',
      })
    })

    it('keeps financial answers while matter questions are open, then restores them if the route stays means-tested', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.immigrationOrAsylum, { change: true })

      const afterMatter = await user.submit(STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' })
      expect(afterMatter.step).to.equal(STEPS.immigrationOrAsylumType)
      expect(user.savedAnswers).to.include({ partner: 'no', ...HOUSING_COST_ANSWERS, ...NO_ASSETS })

      const afterType = await user.submit(STEPS.immigrationOrAsylumType, { 'immigration-or-asylum-type': 'asylum' })
      expect(afterType.step).to.equal(STEPS.asylumSupport)

      const afterSupport = await user.submit(STEPS.asylumSupport, { 'asylum-support': 'no' })
      expect(afterSupport.step).to.equal(COMPLETE)
      expect(user.answers).to.include({ partner: 'no', ...HOUSING_COST_ANSWERS })
    })
  })

  describe('a change affecting multiple sections', () => {
    it('collects every newly required partner section, then returns (partner No → Yes)', async () => {
      const user = new Browser().seed(SINGLE_HOMEOWNER)
      await user.open(STEPS.applicant, { change: true })

      const start = await user.submit(STEPS.applicant, { partner: 'yes', passporting: 'no' })
      const finished = await user.finishFrom(start)

      expect(finished.trail).to.include.members([
        STEPS.partnerDetails,
        STEPS.partnerEmploymentStatus,
        STEPS.partnerBenefits,
        STEPS.partnerOtherIncome,
        STEPS.partnerOutgoings,
        STEPS.partnerAdditionalProperty,
        STEPS.partnerAssets,
      ])
      expect(finished.trail).not.to.include(STEPS.property)
      expect(finished.trail).not.to.include(STEPS.propertyEntry)
      expect(user.answers).to.include({ 'property-owned': 'outright', ...PROPERTY_ENTRY_ANSWERS })
      expect(user.answers).to.include({
        partner: 'yes',
        'partner-over-60': 'no',
        'employment-status': 'unemployed',
        'receives-benefits': 'no',
        'additional-property-owned': 'none',
        ...NO_ASSETS,
      })
      expect(user.changing).to.equal(false)
    })

    it('removes every partner answer and keeps client answers (partner Yes → No)', async () => {
      const user = new Browser().seed(SINGLE_HOMEOWNER)
      await user.open(STEPS.applicant, { change: true })
      await user.finishFrom(await user.submit(STEPS.applicant, { partner: 'yes', passporting: 'no' }))
      expect(Object.keys(user.savedAnswers).some(isPartnerCode)).to.equal(true)

      await user.open(STEPS.applicant, { change: true })
      const afterRemoval = await user.submit(STEPS.applicant, { partner: 'no', passporting: 'no' })
      expect(afterRemoval.step).to.equal(COMPLETE)

      expect(Object.keys(user.savedAnswers).filter(isPartnerCode)).to.deep.equal([])
      expect(user.savedAnswers).to.deep.equal(SINGLE_HOMEOWNER)
    })

    it('collects every newly required income and outgoings page (passported → not passported)', async () => {
      const user = new Browser().seed(PASSPORTED_HOMEOWNER)
      await user.open(STEPS.applicant, { change: true })

      const start = await user.submit(STEPS.applicant, { partner: 'no', passporting: 'no' })
      const finished = await user.finishFrom(start)

      expect(finished.trail).to.include.members([
        STEPS.dependantDetails,
        STEPS.employmentStatus,
        STEPS.benefits,
        STEPS.otherIncome,
        STEPS.outgoings,
      ])
      expect(user.savedAnswers).to.deep.equal(SINGLE_HOMEOWNER)
    })

    it('removes income and outgoings answers when the client becomes passported', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.applicant, { change: true })

      const outcome = await user.submit(STEPS.applicant, { partner: 'no', passporting: 'yes' })

      expect(outcome.step).to.equal(COMPLETE)
      expect(user.savedAnswers).to.deep.equal(PASSPORTED_CLIENT)
    })

    it('leaves unrelated session data alone', async () => {
      const user = new Browser().seed(SINGLE_CLIENT).seed(SINGLE_CLIENT, OTHER_CASE_ID)
      Object.assign(user.session, { unrelated: { keep: true } })
      user.session.casePatternDrafts = { [OTHER_CASE_ID]: { other: { rows: [{ a: 1 }] } } }
      user.session.financialEligibilityDrafts[CASE_ID] = {
        ...user.session.financialEligibilityDrafts[CASE_ID],
        legacyAnswer: 'keep',
      }
      await user.open(STEPS.applicant, { change: true })

      await user.submit(STEPS.applicant, { partner: 'no', passporting: 'yes' })

      expect(user.session).to.have.property('unrelated').that.deep.equals({ keep: true })
      expect(user.session.casePatternDrafts?.[OTHER_CASE_ID]).to.deep.equal({ other: { rows: [{ a: 1 }] } })
      expect(user.session.financialEligibilityDrafts[CASE_ID]).to.have.property('legacyAnswer', 'keep')
      expect(readControlledWorkAnswers(user.session, OTHER_CASE_ID)).to.deep.equal(SINGLE_CLIENT)
    })
  })

  describe('repeated changes to the same answer', () => {
    it('re-collects and re-prunes each time the gate flips', async () => {
      const user = new Browser().seed(PASSPORTED_CLIENT)

      for (let round = 0; round < 3; round++) {
        // eslint-disable-next-line no-await-in-loop
        await user.open(STEPS.property, { change: true })
        // eslint-disable-next-line no-await-in-loop
        const toYes = await user.submit(STEPS.property, { 'property-owned': 'outright' })
        expect(toYes.step).to.equal(STEPS.propertyEntry)
        // eslint-disable-next-line no-await-in-loop
        expect((await user.submit(STEPS.propertyEntry, PROPERTY_ENTRY_BODY)).step).to.equal(COMPLETE)
        expect(user.savedAnswers).to.deep.equal(PASSPORTED_HOMEOWNER)

        // eslint-disable-next-line no-await-in-loop
        await user.open(STEPS.property, { change: true })
        // eslint-disable-next-line no-await-in-loop
        const toNo = await user.submit(STEPS.property, { 'property-owned': 'none' })
        expect(toNo.step).to.equal(COMPLETE)
        expect(user.savedAnswers).to.deep.equal(PASSPORTED_CLIENT)
      }
    })

    it('returns straight away when the same answer is saved again', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)

      for (let attempt = 0; attempt < 2; attempt++) {
        // eslint-disable-next-line no-await-in-loop
        await user.open(STEPS.applicant, { change: true })
        // eslint-disable-next-line no-await-in-loop
        const outcome = await user.submit(STEPS.applicant, { partner: 'no', passporting: 'no' })
        expect(outcome.step).to.equal(COMPLETE)
        expect(user.savedAnswers).to.deep.equal(SINGLE_CLIENT)
      }
    })

    it('can start another change after returning', async () => {
      const user = new Browser().seed(SINGLE_CLIENT)
      await user.open(STEPS.employmentStatus, { change: true })
      await user.submit(STEPS.employmentStatus, { 'employment-status': 'unemployed' })
      expect(user.changing).to.equal(false)

      await user.open(STEPS.employmentStatus, { change: true })

      expect(user.changing).to.equal(true)
    })
  })
})
