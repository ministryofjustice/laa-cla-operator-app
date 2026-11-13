import { expect } from 'chai'
import {
  deriveControlledWorkContext,
  findMissingSteps,
  getApplicableSteps,
  getFirstMissingStep,
  getNextStep,
  getPreviousStep,
  isControlledWorkComplete,
  isStepApplicable,
  resolveControlledWorkJourney,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'

const ADULT: ControlledWorkContext = { isUnder18: false }
const MINOR: ControlledWorkContext = { isUnder18: true }
const UNKNOWN_AGE: ControlledWorkContext = {}

describe('Controlled-work journey rules', () => {
  describe('derived age', () => {
    const now = new Date('2026-06-15T12:00:00Z')

    it('is under 18 the day before the 18th birthday', () => {
      expect(deriveControlledWorkContext('2008-06-16', now)).to.deep.equal({ isUnder18: true })
    })

    it('is not under 18 on the 18th birthday', () => {
      expect(deriveControlledWorkContext('2008-06-15', now)).to.deep.equal({ isUnder18: false })
    })

    it('leaves age unknown for a missing, invalid or future date of birth', () => {
      for (const dob of [null, undefined, '', 'not-a-date', '2030-01-01']) {
        expect(deriveControlledWorkContext(dob, now)).to.deep.equal({})
      }
    })
  })

  describe('applicable steps', () => {
    it('starts with the immigration or asylum question for an adult and never asks about age', () => {
      expect(getApplicableSteps({}, ADULT)).to.deep.equal([STEPS.immigrationOrAsylum])
    })

    it('adds matter type and asylum support only when the matter answer is yes', () => {
      expect(getApplicableSteps({ 'immigration-or-asylum': 'yes' }, ADULT)).to.deep.equal([
        STEPS.immigrationOrAsylum,
        STEPS.immigrationOrAsylumType,
        STEPS.asylumSupport,
      ])
      expect(getApplicableSteps({ 'immigration-or-asylum': 'no' }, ADULT)).to.deep.equal([
        STEPS.immigrationOrAsylum,
        STEPS.applicant,
      ])
    })

    it('only asks the controlled legal representation question when the DOB makes the client under 18', () => {
      expect(getApplicableSteps({ 'immigration-or-asylum': 'no' }, MINOR)).to.include(STEPS.under18Clr)
      expect(getApplicableSteps({ 'immigration-or-asylum': 'no' }, ADULT)).to.not.include(STEPS.under18Clr)
    })

    it('follows the under-18 branch: CLR no, aggregation no, regular income no, assets no', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        'controlled-legal-representation': 'no',
        'aggregated-means': 'no',
        'regular-income': 'no',
        'under-18-assets': 'no',
      }
      expect(getApplicableSteps(answers, MINOR)).to.deep.equal([
        STEPS.immigrationOrAsylum,
        STEPS.under18Clr,
        STEPS.aggregatedMeans,
        STEPS.regularIncome,
        STEPS.under18Assets,
      ])
    })

    it('shows the aggregation information page and goes to means when aggregating', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        'controlled-legal-representation': 'no',
        'aggregated-means': 'yes',
      }
      expect(getApplicableSteps(answers, MINOR)).to.deep.equal([
        STEPS.immigrationOrAsylum,
        STEPS.under18Clr,
        STEPS.aggregatedMeans,
        STEPS.howToAggregate,
        STEPS.applicant,
      ])
    })

    it('skips means pages for an exempt route (CLR yes) and for asylum support', () => {
      const clrYes: ControlledWorkAnswers = { 'immigration-or-asylum': 'no', 'controlled-legal-representation': 'yes' }
      expect(getApplicableSteps(clrYes, MINOR)).to.not.include(STEPS.applicant)

      const support: ControlledWorkAnswers = { 'immigration-or-asylum': 'yes', 'asylum-support': 'yes' }
      expect(getApplicableSteps(support, ADULT)).to.not.include(STEPS.applicant)
    })

    it('requires the first matter answer but suppresses matter details for an exempt under-18 route', () => {
      const clrExempt: ControlledWorkAnswers = {
        'immigration-or-asylum': 'yes',
        'controlled-legal-representation': 'yes',
        'immigration-or-asylum-type': 'asylum',
        'asylum-support': 'no',
      }

      expect(getApplicableSteps(clrExempt, MINOR)).to.deep.equal([
        STEPS.immigrationOrAsylum,
        STEPS.under18Clr,
      ])
      expect(resolveControlledWorkJourney(clrExempt, MINOR).removedCodes).to.have.members([
        'immigration-or-asylum-type',
        'asylum-support',
      ])
      expect(isControlledWorkComplete(clrExempt, MINOR)).to.equal(true)
    })

    it('asks matter details after under-18 screening when the route is means-tested', () => {
      const meansRoute: ControlledWorkAnswers = {
        'immigration-or-asylum': 'yes',
        'controlled-legal-representation': 'no',
        'aggregated-means': 'yes',
      }

      expect(getApplicableSteps(meansRoute, MINOR)).to.deep.equal([
        STEPS.immigrationOrAsylum,
        STEPS.under18Clr,
        STEPS.aggregatedMeans,
        STEPS.howToAggregate,
        STEPS.immigrationOrAsylumType,
        STEPS.asylumSupport,
      ])
      expect(
        getApplicableSteps({ ...meansRoute, 'immigration-or-asylum-type': 'asylum', 'asylum-support': 'no' }, MINOR),
      ).to.include(STEPS.applicant)
      expect(getNextStep(STEPS.immigrationOrAsylum, meansRoute, MINOR)).to.equal(STEPS.under18Clr)
    })

    it('adds income steps only when means tested and not passported, and partner steps only with a partner', () => {
      const base: ControlledWorkAnswers = { 'immigration-or-asylum': 'no', partner: 'yes', passporting: 'yes' }
      expect(getApplicableSteps(base, ADULT)).to.deep.equal([STEPS.immigrationOrAsylum, STEPS.applicant])

      expect(getApplicableSteps({ ...base, passporting: 'no' }, ADULT)).to.deep.equal([
        STEPS.immigrationOrAsylum,
        STEPS.applicant,
        STEPS.dependantDetails,
        STEPS.employmentStatus,
        STEPS.partnerEmploymentStatus,
      ])
      expect(getApplicableSteps({ ...base, passporting: 'no', partner: 'no' }, ADULT)).to.not.include(
        STEPS.partnerEmploymentStatus,
      )
    })

    it('adds the dependant-income question only when a child or adult dependant is selected', () => {
      const base = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
      } as const
      const withChild = {
        ...base,
        'child-dependants': 'yes',
        'child-dependants-count': '2',
        'adult-dependants': 'no',
      } as const
      const withoutDependants = {
        ...base,
        'child-dependants': 'no',
        'adult-dependants': 'no',
      } as const
      const withAdult = {
        ...base,
        'child-dependants': 'no',
        'adult-dependants': 'yes',
        'adult-dependants-count': '1',
      } as const

      expect(getNextStep(STEPS.applicant, base, ADULT)).to.equal(STEPS.dependantDetails)
      expect(getApplicableSteps(withChild, ADULT)).to.include(STEPS.dependantIncome)
      expect(getApplicableSteps(withAdult, ADULT)).to.include(STEPS.dependantIncome)
      expect(getNextStep(STEPS.dependantDetails, withChild, ADULT)).to.equal(STEPS.dependantIncome)
      expect(getNextStep(STEPS.dependantDetails, withAdult, ADULT)).to.equal(STEPS.dependantIncome)
      expect(getApplicableSteps(withoutDependants, ADULT)).to.not.include(STEPS.dependantIncome)
      expect(getNextStep(STEPS.dependantDetails, withoutDependants, ADULT)).to.equal(STEPS.employmentStatus)
      const dependantIncomeYes = { ...withChild, 'dependants-get-income': 'yes' } as const
      const dependantIncomeNo = { ...withChild, 'dependants-get-income': 'no' } as const
      expect(getApplicableSteps(dependantIncomeYes, ADULT)).to.include(STEPS.dependantIncomeDetails)
      expect(getNextStep(STEPS.dependantIncome, dependantIncomeYes, ADULT)).to.equal(STEPS.dependantIncomeDetails)
      expect(getApplicableSteps(dependantIncomeNo, ADULT)).to.not.include(STEPS.dependantIncomeDetails)
      expect(getNextStep(STEPS.dependantIncome, dependantIncomeNo, ADULT)).to.equal(STEPS.employmentStatus)
    })

    it('treats an unanswered gate as unanswered, never as no', () => {
      expect(getApplicableSteps({}, ADULT)).to.not.include(STEPS.applicant)
      expect(getApplicableSteps({ 'immigration-or-asylum': 'yes' }, ADULT)).to.not.include(STEPS.applicant)
    })

    it('does not route to means steps when the age is unknown', () => {
      expect(getApplicableSteps({ 'immigration-or-asylum': 'no' }, UNKNOWN_AGE)).to.deep.equal([STEPS.immigrationOrAsylum])
    })

    it('reports whether an individual step applies', () => {
      expect(isStepApplicable(STEPS.applicant, { 'immigration-or-asylum': 'no' }, ADULT)).to.equal(true)
      expect(isStepApplicable(STEPS.applicant, {}, ADULT)).to.equal(false)
    })
  })

  describe('conditional navigation', () => {
    it('goes to the next applicable step, skipping steps that do not apply', () => {
      expect(getNextStep(STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' }, ADULT)).to.equal(STEPS.applicant)
      expect(getNextStep(STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'yes' }, ADULT)).to.equal(
        STEPS.immigrationOrAsylumType,
      )
      expect(
        getNextStep(
          STEPS.immigrationOrAsylumType,
          { 'immigration-or-asylum': 'yes', 'immigration-or-asylum-type': 'asylum' },
          ADULT,
        ),
      ).to.equal(STEPS.asylumSupport)
      expect(getNextStep(STEPS.immigrationOrAsylum, { 'immigration-or-asylum': 'no' }, MINOR)).to.equal(STEPS.under18Clr)
    })

    it('branches on the answer just submitted', () => {
      const clrNo: ControlledWorkAnswers = { 'immigration-or-asylum': 'no', 'controlled-legal-representation': 'no' }
      expect(getNextStep(STEPS.under18Clr, clrNo, MINOR)).to.equal(STEPS.aggregatedMeans)
      expect(getNextStep(STEPS.under18Clr, { ...clrNo, 'controlled-legal-representation': 'yes' }, MINOR)).to.equal(
        undefined,
      )
    })

    it('returns undefined at the end of the journey', () => {
      expect(getNextStep(STEPS.applicant, { 'immigration-or-asylum': 'no', passporting: 'yes' }, ADULT)).to.equal(undefined)
    })

    it('goes back to the previous applicable step so a user can revisit earlier pages', () => {
      const answers: ControlledWorkAnswers = { 'immigration-or-asylum': 'no', partner: 'no', passporting: 'no' }
      expect(getPreviousStep(STEPS.applicant, answers, ADULT)).to.equal(STEPS.immigrationOrAsylum)
      expect(getPreviousStep(STEPS.employmentStatus, answers, ADULT)).to.equal(STEPS.dependantDetails)
      expect(getPreviousStep(STEPS.immigrationOrAsylum, answers, ADULT)).to.equal(undefined)
    })
  })

  describe('removal and preservation of answers', () => {
    it('removes answers of steps that stop applying and keeps the rest', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        'immigration-or-asylum-type': 'asylum',
        'asylum-support': 'no',
        partner: 'yes',
        passporting: 'no',
        'employment-status': 'in_work',
      }
      const resolved = resolveControlledWorkJourney(answers, ADULT)

      expect(resolved.removedCodes).to.have.members(['immigration-or-asylum-type', 'asylum-support'])
      expect(resolved.answers).to.deep.equal({
        'immigration-or-asylum': 'no',
        partner: 'yes',
        passporting: 'no',
        'employment-status': 'in_work',
      })
    })

    it('cascades: removing a gate answer removes answers that depended on it', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        'controlled-legal-representation': 'no',
        'aggregated-means': 'no',
        'regular-income': 'no',
        'under-18-assets': 'yes',
      }
      // Moving to an adult removes the whole under-18 branch
      const resolved = resolveControlledWorkJourney(answers, ADULT)
      expect(resolved.answers).to.deep.equal({ 'immigration-or-asylum': 'no' })
      expect(resolved.removedCodes).to.have.members([
        'controlled-legal-representation',
        'aggregated-means',
        'regular-income',
        'under-18-assets',
      ])
    })

    it('preserves later answers that remain applicable when an earlier answer changes', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        'controlled-legal-representation': 'no',
        'aggregated-means': 'yes',
        partner: 'yes',
        passporting: 'no',
        'employment-status': 'unemployed',
        'partner-employment-status': 'in_work',
      }
      expect(resolveControlledWorkJourney(answers, MINOR).removedCodes).to.deep.equal([])

      const changed = resolveControlledWorkJourney({ ...answers, 'aggregated-means': 'no' }, MINOR)
      // aggregation no needs regular income, so means is undetermined and the means-route answers go
      expect(changed.removedCodes).to.have.members([
        'partner',
        'passporting',
        'employment-status',
        'partner-employment-status',
      ])

      const passportingChanged = resolveControlledWorkJourney({ ...answers, passporting: 'yes' }, MINOR)
      expect(passportingChanged.removedCodes).to.have.members(['employment-status', 'partner-employment-status'])
      expect(passportingChanged.answers).to.include({ partner: 'yes', passporting: 'yes' })
    })

    it('removes only partner answers when the partner answer changes to no', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
        'employment-status': 'in_work',
        'partner-employment-status': 'in_work',
      }
      const resolved = resolveControlledWorkJourney(answers, ADULT)
      expect(resolved.removedCodes).to.deep.equal(['partner-employment-status'])
      expect(resolved.answers['employment-status']).to.equal('in_work')
    })

    it('treats invalid stored values as unanswered', () => {
      const answers = { 'immigration-or-asylum': 'maybe' } as unknown as ControlledWorkAnswers
      const resolved = resolveControlledWorkJourney(answers, ADULT)
      expect(resolved.answers).to.deep.equal({})
      expect(resolved.removedCodes).to.deep.equal(['immigration-or-asylum'])
    })

    it('makes newly applicable steps unanswered rather than defaulting them', () => {
      const resolved = resolveControlledWorkJourney({ 'immigration-or-asylum': 'no', passporting: 'yes', partner: 'no' }, ADULT)
      const flipped = resolveControlledWorkJourney({ ...resolved.answers, passporting: 'no' }, ADULT)
      expect(flipped.answers['employment-status']).to.equal(undefined)
      expect(findMissingSteps(flipped.answers, ADULT).map((step) => step.stepCode)).to.deep.equal([
        STEPS.dependantDetails,
        STEPS.employmentStatus,
      ])
    })
  })

  describe('missing required steps', () => {
    it('lists applicable steps without a valid answer, in journey order', () => {
      expect(findMissingSteps({}, ADULT)).to.deep.equal([
        { stepCode: STEPS.immigrationOrAsylum, answerCodes: ['immigration-or-asylum'] },
      ])
      expect(findMissingSteps({ 'immigration-or-asylum': 'yes' }, ADULT)).to.deep.equal([
        { stepCode: STEPS.immigrationOrAsylumType, answerCodes: ['immigration-or-asylum-type'] },
        { stepCode: STEPS.asylumSupport, answerCodes: ['asylum-support'] },
      ])
    })

    it('reports only the unanswered fields of a multi-question step', () => {
      expect(findMissingSteps({ 'immigration-or-asylum': 'no', partner: 'yes' }, ADULT)).to.deep.equal([
        { stepCode: STEPS.applicant, answerCodes: ['passporting'] },
      ])
    })

    it('requires a dependant count only when the corresponding answer is yes', () => {
      const childCountMissing: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
        'child-dependants': 'yes',
        'adult-dependants': 'no',
      }
      const adultCountMissing: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
        'child-dependants': 'no',
        'adult-dependants': 'yes',
      }

      expect(findMissingSteps(childCountMissing, ADULT)).to.deep.equal([
        { stepCode: STEPS.dependantDetails, answerCodes: ['child-dependants-count'] },
        { stepCode: STEPS.dependantIncome, answerCodes: ['dependants-get-income'] },
        { stepCode: STEPS.employmentStatus, answerCodes: ['employment-status'] },
      ])
      expect(findMissingSteps(adultCountMissing, ADULT)[0]).to.deep.equal({
        stepCode: STEPS.dependantDetails,
        answerCodes: ['adult-dependants-count'],
      })
    })

    it('does not complete the journey while a subsequent controlled-work page is unavailable', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
        'child-dependants': 'no',
        'adult-dependants': 'no',
      }

      expect(isControlledWorkComplete(answers, ADULT)).to.equal(false)
      expect(getFirstMissingStep(answers, ADULT)).to.equal(STEPS.employmentStatus)
    })

    it('never requires an answer for informational pages', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        'controlled-legal-representation': 'no',
        'aggregated-means': 'yes',
      }
      expect(findMissingSteps(answers, MINOR).map((step) => step.stepCode)).to.deep.equal([STEPS.applicant])
    })

    it('ignores answers for steps that do not apply', () => {
      expect(findMissingSteps({ 'immigration-or-asylum': 'no', partner: 'no', passporting: 'yes' }, ADULT)).to.deep.equal([])
    })

    it('finds the earliest missing step', () => {
      expect(getFirstMissingStep({ 'immigration-or-asylum': 'yes' }, ADULT)).to.equal(STEPS.immigrationOrAsylumType)
      expect(getFirstMissingStep({ 'immigration-or-asylum': 'no', partner: 'no', passporting: 'yes' }, ADULT)).to.equal(
        undefined,
      )
    })

    it('is complete only when every applicable step is answered and the route is known', () => {
      const complete: ControlledWorkAnswers = { 'immigration-or-asylum': 'no', partner: 'no', passporting: 'yes' }
      expect(isControlledWorkComplete(complete, ADULT)).to.equal(true)
      expect(isControlledWorkComplete({ 'immigration-or-asylum': 'no' }, ADULT)).to.equal(false)
      expect(isControlledWorkComplete(complete, UNKNOWN_AGE)).to.equal(false)
    })

    it('is complete for an exempt under-18 route without any means answers', () => {
      const answers: ControlledWorkAnswers = { 'immigration-or-asylum': 'no', 'controlled-legal-representation': 'yes' }
      expect(isControlledWorkComplete(answers, MINOR)).to.equal(true)
    })
  })
})
