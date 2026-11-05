import { expect } from 'chai';
import sinon from 'sinon';
import { createTestEffectContext } from '@ministryofjustice/hmpps-forge/core/testing';
import {
  calculateAge,
  deriveAgeAnswers,
  parseIsoDate,
  ukCalendarDate,
  CLIENT_AGE_DATA_KEY,
  CLIENT_DATE_OF_BIRTH_DATA_KEY,
  CLIENT_IS_60_OR_OVER_DATA_KEY,
  CLIENT_IS_UNDER_18_DATA_KEY,
} from '#packages/cfe-eligibility-journey/src/clientAge.js';
import { FinancialEligibilityEffectsImplementations } from '#packages/cfe-eligibility-journey/src/effects.js';
import type { Deps } from '#packages/cfe-eligibility-journey/src/api.js';
import type { FinancialEligibilitySession } from '#packages/cfe-eligibility-journey/src/context.type.js';
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js';
import { under18Step } from '#packages/cfe-eligibility-journey/src/under18Page/under18Step.js';
import { under18RegularPaymentStep } from '#packages/cfe-eligibility-journey/src/under18RegularPaymentPage/under18RegularPaymentStep.js';
import { partnerStep } from '#packages/cfe-eligibility-journey/src/partnerPage/partnerStep.js';
import { over60Step } from '#packages/cfe-eligibility-journey/src/over60Page/over60Step.js';
import { over60StepWithPartnerStep } from '#packages/cfe-eligibility-journey/src/over60PWithPartnerPage/over60WithPartnerStep.js';
import { benefitsStep } from '#packages/cfe-eligibility-journey/src/benefitsPage/benefitsStep.js';

// Midday UTC, so the UK date is the same whether or not British Summer Time applies
const at = (isoDate: string): Date => new Date(`${isoDate}T12:00:00Z`);

describe('Client age from date of birth', () => {
  describe('parseIsoDate', () => {
    it('parses a valid ISO date', () => {
      expect(parseIsoDate('1980-05-14')).to.deep.equal({ year: 1980, month: 5, day: 14 });
    });

    it('rejects missing, malformed and impossible dates', () => {
      expect(parseIsoDate(undefined)).to.equal(null);
      expect(parseIsoDate(null)).to.equal(null);
      expect(parseIsoDate('')).to.equal(null);
      expect(parseIsoDate('14/05/1980')).to.equal(null);
      expect(parseIsoDate('1980-5-14')).to.equal(null);
      expect(parseIsoDate('2023-02-29')).to.equal(null);
      expect(parseIsoDate('1980-13-01')).to.equal(null);
    });
  });

  describe('ukCalendarDate', () => {
    it('uses the UK date rather than the UTC date', () => {
      // 23:30 UTC on 30 June is 00:30 on 1 July in British Summer Time
      expect(ukCalendarDate(new Date('2026-06-30T23:30:00Z'))).to.deep.equal({ year: 2026, month: 7, day: 1 });
      expect(ukCalendarDate(new Date('2026-12-31T23:30:00Z'))).to.deep.equal({ year: 2026, month: 12, day: 31 });
    });
  });

  describe('calculateAge', () => {
    it('turns 18 on the 18th birthday, not the day before', () => {
      expect(calculateAge('2008-10-23', at('2026-10-22'))).to.equal(17);
      expect(calculateAge('2008-10-23', at('2026-10-23'))).to.equal(18);
    });

    it('turns 60 on the 60th birthday, not the day before', () => {
      expect(calculateAge('1966-10-23', at('2026-10-22'))).to.equal(59);
      expect(calculateAge('1966-10-23', at('2026-10-23'))).to.equal(60);
    });

    it('treats a 29 February birthday as 1 March in non-leap years', () => {
      expect(calculateAge('2008-02-29', at('2026-02-28'))).to.equal(17);
      expect(calculateAge('2008-02-29', at('2026-03-01'))).to.equal(18);
      expect(calculateAge('1964-02-29', at('2024-02-29'))).to.equal(60);
    });

    it('returns null for a missing, invalid or future date of birth', () => {
      expect(calculateAge(undefined, at('2026-10-23'))).to.equal(null);
      expect(calculateAge('not-a-date', at('2026-10-23'))).to.equal(null);
      expect(calculateAge('2026-10-24', at('2026-10-23'))).to.equal(null);
    });

    it('returns 0 for a client born today', () => {
      expect(calculateAge('2026-10-23', at('2026-10-23'))).to.equal(0);
    });
  });

  describe('deriveAgeAnswers', () => {
    it('answers under-18 yes for a 17 year old', () => {
      expect(deriveAgeAnswers(17)).to.deep.equal({ 'under-18': 'yes', '60-or-over': 'no' });
    });

    it('leaves the partner question unanswered when the client is under 60', () => {
      expect(deriveAgeAnswers(59)).to.deep.equal({ 'under-18': 'no', '60-or-over': 'no' });
    });

    it('answers both 60 or over questions yes when the client is 60 or over', () => {
      expect(deriveAgeAnswers(60)).to.deep.equal({
        'under-18': 'no',
        '60-or-over': 'yes',
        '60-or-over-with-partner': 'yes',
      });
    });
  });

  describe('ApplyClientAgeFromDob effect', () => {
    const deps = {} as Deps;
    const apply = FinancialEligibilityEffectsImplementations.ApplyClientAgeFromDob(deps);
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers(at('2026-10-23'));
    });

    afterEach(() => {
      clock.restore();
    });

    it('sets age answers and derived-age data without saving derived answers as user-entered drafts', () => {
      const context = createTestEffectContext({
        params: { caseId: 'CASE1' },
        data: { [CLIENT_DATE_OF_BIRTH_DATA_KEY]: '1960-01-01' },
        session: { financialEligibilityDrafts: { CASE1: { 'under-18': 'yes', 'has-partner': 'no' } } },
      });

      void apply(context);

      expect(context.getData(CLIENT_AGE_DATA_KEY)).to.equal(66);
      expect(context.getData(CLIENT_IS_UNDER_18_DATA_KEY)).to.equal(false);
      expect(context.getData(CLIENT_IS_60_OR_OVER_DATA_KEY)).to.equal(true);
      expect(context.getAnswer('under-18')).to.equal('no');
      expect(context.getAnswer('60-or-over')).to.equal('yes');
      expect(context.getAnswer('60-or-over-with-partner')).to.equal('yes');
      const session = context.getSession() as unknown as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts.CASE1).to.deep.equal({
        'under-18': 'yes',
        'has-partner': 'no',
      });
    });

    it('does not create a draft solely for derived age answers', () => {
      const context = createTestEffectContext({
        params: { caseId: 'CASE1' },
        data: { [CLIENT_DATE_OF_BIRTH_DATA_KEY]: '2010-01-01' },
        session: {},
      });

      void apply(context);

      expect(context.getData(CLIENT_IS_UNDER_18_DATA_KEY)).to.equal(true);
      expect(context.getData(CLIENT_IS_60_OR_OVER_DATA_KEY)).to.equal(false);
      const session = context.getSession() as unknown as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts).to.equal(undefined);
    });

    it('still sets the answers when there is no caseId', () => {
      const context = createTestEffectContext({
        data: { [CLIENT_DATE_OF_BIRTH_DATA_KEY]: '1990-01-01' },
        session: {},
      });

      void apply(context);

      expect(context.getAnswer('under-18')).to.equal('no');
      const session = context.getSession() as unknown as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts).to.equal(undefined);
    });

    it('does nothing when the date of birth is missing or invalid', () => {
      const context = createTestEffectContext({
        params: { caseId: 'CASE1' },
        data: { [CLIENT_DATE_OF_BIRTH_DATA_KEY]: null },
        session: {},
      });

      void apply(context);

      expect(context.getData(CLIENT_AGE_DATA_KEY)).to.equal(undefined);
      expect(context.getAnswer('under-18')).to.equal(undefined);
      const session = context.getSession() as unknown as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts).to.equal(undefined);
    });
  });

  describe('journey wiring', () => {
    const accessRedirects = (step: typeof under18Step) =>
      (step.onAccess ?? []).flatMap((hook) =>
        (hook.next ?? []).map((outcome) => ('goto' in outcome ? outcome.goto : null)),
      );

    it('restores case drafts before deriving the client age on access', () => {
      const effectNames = (eligibilityJourney.onAccess ?? []).flatMap((hook) =>
        (hook.effects ?? []).map((effect) => (effect as unknown as { name: string }).name),
      );

      expect(effectNames.indexOf('ApplyClientAgeFromDob')).to.be.greaterThan(
        effectNames.indexOf('RestoreCaseDraft'),
      );
      expect(effectNames.indexOf('RestoreCaseDraft')).to.be.greaterThan(
        effectNames.indexOf('LoadCaseDetails'),
      );
    });

    it('skips the under-18 question to the next question its derived answer leads to', () => {
      expect(accessRedirects(under18Step)).to.deep.equal([under18RegularPaymentStep.code, partnerStep.code]);
    });

    it('skips the 60 or over questions to the benefits question', () => {
      expect(accessRedirects(over60Step)).to.deep.equal([benefitsStep.code]);
      expect(accessRedirects(over60StepWithPartnerStep)).to.deep.equal([benefitsStep.code]);
    });
  });
});
