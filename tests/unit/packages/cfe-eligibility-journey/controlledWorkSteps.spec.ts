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
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
  CONTROLLED_WORK_STEPS,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODE_LIST,
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import {
  CONTROLLED_WORK_INCOMPLETE_STEP_REDIRECTS,
  controlledWorkIncompleteStep,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { CONTROLLED_WORK_DATA_KEYS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkEffects.js'
import { controlledWorkCompleteStepCode } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkCompleteStep.js'

const ADULT: ControlledWorkContext = { isUnder18: false }
const MINOR: ControlledWorkContext = { isUnder18: true }
const UNKNOWN_AGE: ControlledWorkContext = {}

describe('Controlled-work journey rules', () => {
  it('defines exactly the 37 CCQ controlled-work page IDs once each', () => {
    const expectedPageIds = [
      'immigration-or-asylum',
      'under-18-clr',
      'aggregated-means',
      'how-to-aggregate',
      'regular-income',
      'under-18-assets',
      'immigration-or-asylum-type',
      'asylum-support',
      'applicant',
      'dependant-details',
      'dependant-income',
      'dependant-income-details',
      'employment-status',
      'income',
      'controlled-work-benefits',
      'benefit-details',
      'other-income',
      'partner-details',
      'partner-employment-status',
      'partner-employment-income',
      'partner-benefits',
      'partner-benefit-details',
      'partner-other-income',
      'outgoings',
      'partner-outgoings',
      'property',
      'property-landlord',
      'shared-ownership-housing-costs',
      'mortgage-or-loan-payment',
      'housing-costs',
      'property-entry',
      'additional-property',
      'additional-property-details',
      'partner-additional-property',
      'partner-additional-property-details',
      'assets',
      'partner-assets',
    ]
    const definedPageIds = CONTROLLED_WORK_STEPS.map(({ code }) => code)

    expect(definedPageIds).to.have.length(37)
    expect(new Set(definedPageIds).size).to.equal(37)
    expect(definedPageIds).to.have.members(expectedPageIds)
    expect(CONTROLLED_WORK_STEP_CODE_LIST).to.have.members(expectedPageIds)
  })

  it('resolves each assessment-route branch to a complete outcome or a specific missing step', () => {
    const matrix: Array<{
      name: string
      answers: ControlledWorkAnswers
      context: ControlledWorkContext
      missing?: keyof typeof STEPS
      complete?: boolean
    }> = [
      {
        name: 'adult means route',
        answers: { 'immigration-or-asylum': 'no' },
        context: ADULT,
        missing: 'applicant',
      },
      {
        name: 'adult asylum-support exemption',
        answers: {
          'immigration-or-asylum': 'yes',
          'immigration-or-asylum-type': 'asylum',
          'asylum-support': 'yes',
        },
        context: ADULT,
        complete: true,
      },
      {
        name: 'passported means route after client and partner assets',
        answers: {
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
          partner_investments_relevant: 'no',
          partner_valuables_relevant: 'no',
          'partner-assets-completed': 'yes',
        },
        context: ADULT,
        complete: true,
      },
      {
        name: 'under-18 CLR exemption',
        answers: { 'immigration-or-asylum': 'no', 'controlled-legal-representation': 'yes' },
        context: MINOR,
        complete: true,
      },
      {
        name: 'under-18 aggregated means route',
        answers: {
          'immigration-or-asylum': 'no',
          'controlled-legal-representation': 'no',
          'aggregated-means': 'yes',
        },
        context: MINOR,
        missing: 'applicant',
      },
      {
        name: 'under-18 regular income means route',
        answers: {
          'immigration-or-asylum': 'no',
          'controlled-legal-representation': 'no',
          'aggregated-means': 'no',
          'regular-income': 'yes',
        },
        context: MINOR,
        missing: 'applicant',
      },
      {
        name: 'under-18 assets means route',
        answers: {
          'immigration-or-asylum': 'no',
          'controlled-legal-representation': 'no',
          'aggregated-means': 'no',
          'regular-income': 'no',
          'under-18-assets': 'yes',
        },
        context: MINOR,
        missing: 'applicant',
      },
      {
        name: 'under-18 no-means exemption',
        answers: {
          'immigration-or-asylum': 'no',
          'controlled-legal-representation': 'no',
          'aggregated-means': 'no',
          'regular-income': 'no',
          'under-18-assets': 'no',
        },
        context: MINOR,
        complete: true,
      },
    ]

    for (const route of matrix) {
      const { name, answers, context } = route
      expect(isControlledWorkComplete(answers, context), name).to.equal(route.complete ?? false)
      expect(getFirstMissingStep(answers, context), name).to.equal(route.missing ? STEPS[route.missing] : undefined)
    }
  })

  it('has a redirect from the incomplete hub for every controlled-work step code', () => {
    const redirects = JSON.stringify(CONTROLLED_WORK_INCOMPLETE_STEP_REDIRECTS)
    const incompleteHubAccess = JSON.stringify(controlledWorkIncompleteStep.onAccess)

    expect(CONTROLLED_WORK_INCOMPLETE_STEP_REDIRECTS).to.have.length(CONTROLLED_WORK_STEP_CODE_LIST.length)
    for (const stepCode of CONTROLLED_WORK_STEP_CODE_LIST) {
      expect(redirects).to.include(stepCode)
    }
    expect(incompleteHubAccess).to.include(CONTROLLED_WORK_DATA_KEYS.complete)
    expect(incompleteHubAccess).to.include(controlledWorkCompleteStepCode)
  })

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
      expect(getApplicableSteps(base, ADULT)).to.deep.equal([
        STEPS.immigrationOrAsylum,
        STEPS.applicant,
        STEPS.partnerDetails,
        STEPS.property,
      ])

      expect(getApplicableSteps({ ...base, passporting: 'no' }, ADULT)).to.deep.equal([
        STEPS.immigrationOrAsylum,
        STEPS.applicant,
        STEPS.dependantDetails,
        STEPS.employmentStatus,
        STEPS.benefits,
        STEPS.partnerDetails,
        STEPS.partnerEmploymentStatus,
        STEPS.partnerBenefits,
        STEPS.outgoings,
        STEPS.partnerOutgoings,
        STEPS.property,
      ])
      expect(
        getApplicableSteps(
          { ...base, passporting: 'no', 'partner-employment-status': 'in_work' },
          ADULT,
        ),
      ).to.include(STEPS.partnerIncome)
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

    it('continues passported routes to additional property and stops at the explicit incomplete boundary', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'yes',
        'property-owned': 'none',
      }

      expect(getNextStep(STEPS.applicant, answers, ADULT)).to.equal(STEPS.property)
      expect(getNextStep(STEPS.property, answers, ADULT)).to.equal(STEPS.additionalProperty)
      expect(getFirstMissingStep(answers, ADULT)).to.equal(STEPS.additionalProperty)
      expect(isControlledWorkComplete(answers, ADULT)).to.equal(false)
    })

    it('routes partner branches to income and benefits, leaving unimplemented pages at the incomplete boundary', () => {
      const base = {
        'immigration-or-asylum': 'no',
        partner: 'yes',
        passporting: 'no',
      } as const
      const employed = { ...base, 'partner-employment-status': 'in_work' } as const
      const unemployed = { ...base, 'partner-employment-status': 'unemployed' } as const

      expect(getNextStep(STEPS.partnerEmploymentStatus, employed, ADULT)).to.equal(STEPS.partnerIncome)
      expect(getNextStep(STEPS.partnerEmploymentStatus, unemployed, ADULT)).to.equal(STEPS.partnerBenefits)
      expect(getNextStep(STEPS.partnerIncome, { ...employed, 'partner-income-completed': 'yes' }, ADULT)).to.equal(
        STEPS.partnerBenefits,
      )
      expect(findMissingSteps(employed, ADULT)).to.deep.include({
        stepCode: STEPS.partnerIncome,
        answerCodes: ['partner-income-completed'],
      })
    })

    it('routes from partner additional property to client assets and then partner assets', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'yes',
        passporting: 'yes',
        'partner-over-60': 'no',
        'property-owned': 'none',
        'additional-property-owned': 'none',
        'partner-additional-property-owned': 'none',
      }

      expect(getNextStep(STEPS.partnerAdditionalProperty, answers, ADULT)).to.equal(STEPS.assets)
      expect(getFirstMissingStep(answers, ADULT)).to.equal(STEPS.assets)
      expect(
        getNextStep(STEPS.assets, { ...answers, 'assets-completed': 'yes' }, ADULT),
      ).to.equal(STEPS.partnerAssets)
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

    it('removes the benefits answer when the client changes to a passported route', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
        'child-dependants': 'no',
        'adult-dependants': 'no',
        'employment-status': 'unemployed',
        'receives-benefits': 'yes',
      }

      const changed = resolveControlledWorkJourney({ ...answers, passporting: 'yes' }, ADULT)

      expect(changed.answers).to.not.have.property('receives-benefits')
      expect(changed.removedCodes).to.include('receives-benefits')
    })

    it('removes only partner answers when the partner answer changes to no', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'yes',
        passporting: 'no',
        'partner-over-60': 'yes',
        'employment-status': 'in_work',
        'partner-employment-status': 'in_work',
        'partner-income-completed': 'yes',
      }
      const resolved = resolveControlledWorkJourney({ ...answers, partner: 'no' }, ADULT)
      expect(resolved.removedCodes).to.have.members([
        'partner-over-60',
        'partner-employment-status',
        'partner-income-completed',
      ])
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
        STEPS.benefits,
        STEPS.outgoings,
        STEPS.property,
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
        { stepCode: STEPS.benefits, answerCodes: ['receives-benefits'] },
        { stepCode: STEPS.outgoings, answerCodes: ['maintenance_payments_relevant', 'legal_aid_payments_relevant'] },
        { stepCode: STEPS.property, answerCodes: ['property-owned'] },
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

    it('keeps benefits as the first incomplete page after either employment branch', () => {
      const base: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
        'child-dependants': 'no',
        'adult-dependants': 'no',
      }

      expect(getFirstMissingStep({ ...base, 'employment-status': 'unemployed' }, ADULT)).to.equal(STEPS.benefits)
      expect(
        getFirstMissingStep({ ...base, 'employment-status': 'in_work', 'income-completed': 'yes' }, ADULT),
      ).to.equal(STEPS.benefits)
      expect(
        isControlledWorkComplete({ ...base, 'employment-status': 'in_work', 'income-completed': 'yes' }, ADULT),
      ).to.equal(false)
    })

    it('requires an explicit benefits answer after the applicable employment branch', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
        'child-dependants': 'no',
        'adult-dependants': 'no',
        'employment-status': 'unemployed',
      }

      expect(findMissingSteps(answers, ADULT)).to.deep.equal([
        { stepCode: STEPS.benefits, answerCodes: ['receives-benefits'] },
        { stepCode: STEPS.outgoings, answerCodes: ['maintenance_payments_relevant', 'legal_aid_payments_relevant'] },
        { stepCode: STEPS.property, answerCodes: ['property-owned'] },
      ])
      expect(isValidControlledWorkAnswer('receives-benefits', 'yes')).to.equal(true)
      expect(isValidControlledWorkAnswer('receives-benefits', 'no')).to.equal(true)
      for (const invalid of ['', 'true', 'false', 'maybe', true, false]) {
        expect(isValidControlledWorkAnswer('receives-benefits', invalid)).to.equal(false)
      }
    })

    it('requires benefit details after Yes and keeps other income at the incomplete boundary', () => {
      const base: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
        'child-dependants': 'no',
        'adult-dependants': 'no',
        'employment-status': 'unemployed',
        'receives-benefits': 'yes',
      }

      expect(findMissingSteps(base, ADULT)).to.deep.equal([
        { stepCode: STEPS.benefitDetails, answerCodes: ['benefit-details-completed'] },
        { stepCode: STEPS.outgoings, answerCodes: ['maintenance_payments_relevant', 'legal_aid_payments_relevant'] },
        { stepCode: STEPS.property, answerCodes: ['property-owned'] },
      ])
      expect(
        getNextStep(STEPS.benefits, base, ADULT),
      ).to.equal(STEPS.benefitDetails)

      const benefitDetailsAnswered = { ...base, 'benefit-details-completed': 'yes' } as const
      expect(getFirstMissingStep(benefitDetailsAnswered, ADULT)).to.equal(STEPS.otherIncome)
      expect(isControlledWorkComplete(benefitDetailsAnswered, ADULT)).to.equal(false)
      expect(isValidControlledWorkAnswer('benefit-details-completed', 'yes')).to.equal(true)
      expect(isValidControlledWorkAnswer('other-income-completed', 'yes')).to.equal(true)
    })

    it('skips benefit details when Benefits is No and preserves the unavailable next page', () => {
      const answers: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'no',
        'child-dependants': 'no',
        'adult-dependants': 'no',
        'employment-status': 'unemployed',
        'receives-benefits': 'no',
      }

      expect(getApplicableSteps(answers, ADULT)).to.not.include(STEPS.benefitDetails)
      expect(getNextStep(STEPS.benefits, answers, ADULT)).to.equal(STEPS.otherIncome)
      expect(getFirstMissingStep(answers, ADULT)).to.equal(STEPS.otherIncome)
      expect(isControlledWorkComplete(answers, ADULT)).to.equal(false)
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
      expect(findMissingSteps({ 'immigration-or-asylum': 'no', partner: 'no', passporting: 'yes' }, ADULT)).to.deep.equal([
        { stepCode: STEPS.property, answerCodes: ['property-owned'] },
      ])
    })

    it('finds the earliest missing step', () => {
      expect(getFirstMissingStep({ 'immigration-or-asylum': 'yes' }, ADULT)).to.equal(STEPS.immigrationOrAsylumType)
      expect(getFirstMissingStep({ 'immigration-or-asylum': 'no', partner: 'no', passporting: 'yes' }, ADULT)).to.equal(
        STEPS.property,
      )
    })

    it('routes all means-tested property branches to client assets and prunes conditional asset answers', () => {
      const base: ControlledWorkAnswers = {
        'immigration-or-asylum': 'no',
        partner: 'no',
        passporting: 'yes',
        'property-owned': 'none',
        'additional-property-owned': 'none',
      }
      expect(getApplicableSteps(base, ADULT)).to.include(STEPS.assets)
      expect(getNextStep(STEPS.additionalProperty, base, ADULT)).to.equal(STEPS.assets)

      const mortgageRoute: ControlledWorkAnswers = {
        ...base,
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
        'property-owned': 'with_mortgage',
        housing_loan_payments: '0',
        house_value: '250000',
        mortgage: '100000',
        percentage_owned: '100',
        house_in_dispute: 'no',
        'additional-property-owned': 'none',
      }
      expect(getApplicableSteps(mortgageRoute, ADULT)).to.include(STEPS.assets)

      const activeAssets: ControlledWorkAnswers = {
        ...base,
        investments_relevant: 'yes',
        investments: '250',
        investments_in_dispute: 'yes',
        valuables_relevant: 'no',
        valuables_in_dispute: 'no',
        'assets-completed': 'yes',
      }
      expect(resolveControlledWorkJourney(activeAssets, ADULT).answers).to.include({
        investments_relevant: 'yes',
        investments: '250',
        investments_in_dispute: 'yes',
        valuables_relevant: 'no',
        'assets-completed': 'yes',
      })

      const immigrationMatter: ControlledWorkAnswers = {
        ...activeAssets,
        'immigration-or-asylum': 'yes',
        'immigration-or-asylum-type': 'asylum',
        'asylum-support': 'no',
      }
      const resolved = resolveControlledWorkJourney(immigrationMatter, ADULT)
      expect(resolved.answers).not.to.have.property('investments_in_dispute')
      expect(resolved.answers).not.to.have.property('valuables_in_dispute')

      const noLongerMeansTested = resolveControlledWorkJourney(
        {
          ...activeAssets,
          'controlled-legal-representation': 'yes',
        },
        MINOR,
      )
      expect(noLongerMeansTested.answers).not.to.have.property('investments_relevant')
      expect(noLongerMeansTested.answers).not.to.have.property('investments')
      expect(noLongerMeansTested.answers).not.to.have.property('assets-completed')
    })

    it('keeps passported routes incomplete until remaining property pages are implemented', () => {
      const complete: ControlledWorkAnswers = { 'immigration-or-asylum': 'no', partner: 'no', passporting: 'yes' }
      expect(isControlledWorkComplete(complete, ADULT)).to.equal(false)
      expect(getFirstMissingStep(complete, ADULT)).to.equal(STEPS.property)
      expect(
        isControlledWorkComplete({ ...complete, 'property-owned': 'none' }, ADULT),
      ).to.equal(false)
      expect(isControlledWorkComplete({ 'immigration-or-asylum': 'no' }, ADULT)).to.equal(false)
      expect(isControlledWorkComplete(complete, UNKNOWN_AGE)).to.equal(false)
    })

    it('is complete for an exempt under-18 route without any means answers', () => {
      const answers: ControlledWorkAnswers = { 'immigration-or-asylum': 'no', 'controlled-legal-representation': 'yes' }
      expect(isControlledWorkComplete(answers, MINOR)).to.equal(true)
    })
  })
})
