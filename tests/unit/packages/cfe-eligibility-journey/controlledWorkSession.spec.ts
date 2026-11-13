import { expect } from 'chai'
import type { FinancialEligibilitySession } from '#packages/cfe-eligibility-journey/src/context.type.js'
import {
  clearControlledWorkAnswers,
  mergeControlledWorkAnswers,
  readControlledWorkAnswers,
  sanitiseControlledWorkAnswers,
  writeControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSession.js'

const CASE_ID = 'CASE1'
const OTHER_CASE_ID = 'CASE2'

const newSession = (): FinancialEligibilitySession => ({ financialEligibilityDrafts: {} }) as FinancialEligibilitySession

describe('Controlled-work session storage', () => {
  it('persists answers per case and reads them back after session serialisation', () => {
    const session = newSession()
    writeControlledWorkAnswers(session, CASE_ID, { 'immigration-or-asylum': 'yes', 'immigration-or-asylum-type': 'asylum' })

    const reloaded = JSON.parse(JSON.stringify(session)) as FinancialEligibilitySession
    expect(reloaded.financialEligibilityDrafts[CASE_ID]).to.deep.equal({
      'immigration-or-asylum': 'yes',
      'immigration-or-asylum-type': 'asylum',
    })
    expect(readControlledWorkAnswers(reloaded, CASE_ID)).to.deep.equal({
      'immigration-or-asylum': 'yes',
      'immigration-or-asylum-type': 'asylum',
    })
  })

  it('reassigns the session property so modification-tracking stores see the change', () => {
    const session = newSession()
    writeControlledWorkAnswers(session, CASE_ID, { partner: 'no' })
    const first = session.financialEligibilityDrafts
    writeControlledWorkAnswers(session, CASE_ID, { partner: 'yes' })

    expect(session.financialEligibilityDrafts).to.not.equal(first)
    expect(first[CASE_ID]).to.deep.equal({ partner: 'no' })
  })

  it('does not alias the stored answers', () => {
    const session = newSession()
    const answers = { partner: 'no' } as const
    writeControlledWorkAnswers(session, CASE_ID, answers)

    const read = readControlledWorkAnswers(session, CASE_ID)
    read.partner = 'yes'
    expect(readControlledWorkAnswers(session, CASE_ID).partner).to.equal('no')
  })

  it('keeps cases separate', () => {
    const session = newSession()
    writeControlledWorkAnswers(session, CASE_ID, { partner: 'yes' })
    writeControlledWorkAnswers(session, OTHER_CASE_ID, { partner: 'no' })

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({ partner: 'yes' })
    expect(readControlledWorkAnswers(session, OTHER_CASE_ID)).to.deep.equal({ partner: 'no' })
  })

  it('preserves unrelated draft answers and clears only controlled-work answers', () => {
    const session = newSession()
    session.financialEligibilityDrafts[CASE_ID] = { 'under-18': 'no' }
    writeControlledWorkAnswers(session, CASE_ID, { partner: 'yes' })

    expect(session.financialEligibilityDrafts[CASE_ID]).to.deep.equal({ 'under-18': 'no', partner: 'yes' })
    expect(session.controlledWorkAnswers).to.equal(undefined)

    clearControlledWorkAnswers(session, CASE_ID)
    expect(session.financialEligibilityDrafts[CASE_ID]).to.deep.equal({ 'under-18': 'no' })
  })

  it('reads legacy controlled-work answers and migrates them on write', () => {
    const session = newSession()
    session.controlledWorkAnswers = { [CASE_ID]: { partner: 'yes' } }

    writeControlledWorkAnswers(session, CASE_ID, readControlledWorkAnswers(session, CASE_ID))

    expect(session.financialEligibilityDrafts[CASE_ID]).to.deep.equal({ partner: 'yes' })
    expect(session.controlledWorkAnswers?.[CASE_ID]).to.equal(undefined)
  })

  it('clears one case without touching another', () => {
    const session = newSession()
    writeControlledWorkAnswers(session, CASE_ID, { partner: 'yes' })
    writeControlledWorkAnswers(session, OTHER_CASE_ID, { partner: 'no' })

    clearControlledWorkAnswers(session, CASE_ID)

    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({})
    expect(readControlledWorkAnswers(session, OTHER_CASE_ID)).to.deep.equal({ partner: 'no' })
  })

  it('returns no answers when nothing is stored and tolerates clearing an empty session', () => {
    const session = newSession()
    expect(readControlledWorkAnswers(session, CASE_ID)).to.deep.equal({})
    expect(() => clearControlledWorkAnswers(session, CASE_ID)).to.not.throw()
  })

  it('drops unknown codes and invalid values from untrusted session data', () => {
    expect(
      sanitiseControlledWorkAnswers({ partner: 'yes', passporting: true, 'employment-status': 'retired', bogus: 'yes' }),
    ).to.deep.equal({ partner: 'yes' })
    for (const value of [null, undefined, 'x', 3, ['partner']]) {
      expect(sanitiseControlledWorkAnswers(value)).to.deep.equal({})
    }
  })

  it('persists valid dependant counts while rejecting non-positive or fractional counts', () => {
    expect(
      sanitiseControlledWorkAnswers({
        'child-dependants': 'yes',
        'child-dependants-count': '2',
        'adult-dependants': 'no',
        'adult-dependants-count': '1.5',
      }),
    ).to.deep.equal({
      'child-dependants': 'yes',
      'child-dependants-count': '2',
      'adult-dependants': 'no',
    })
  })

  it('merges submitted answers over saved ones and ignores invalid submissions', () => {
    const merged = mergeControlledWorkAnswers(
      { partner: 'yes', passporting: 'no' },
      { partner: 'no', passporting: 'unsure', 'employment-status': undefined },
    )
    expect(merged).to.deep.equal({ partner: 'no', passporting: 'no' })
  })
})
