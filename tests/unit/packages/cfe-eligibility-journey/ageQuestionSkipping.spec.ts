import { expect } from 'chai';
import { ForgeTestHarness, expectRedirectOutcome, expectRenderOutcome } from '@ministryofjustice/hmpps-forge/core/testing';
import type { EffectFunctionContext } from '@ministryofjustice/hmpps-forge/core/authoring';
import { govukComponents } from '@ministryofjustice/hmpps-forge/govuk-components';
import createEligibilityPackage, { CLIENT_DATE_OF_BIRTH_DATA_KEY } from '#packages/cfe-eligibility-journey/src/index.js';
import type { Deps, FinancialEligibilityEffectsWithDeps } from '#packages/cfe-eligibility-journey/src/api.js';
import { transformers } from '#packages/cfe-eligibility-journey/src/formatters.js';
import { moneyConditions } from '#packages/cfe-eligibility-journey/src/moneyFieldHelpers.js';

const JOURNEY_PATH = '/cases/CASE1/cfe-eligibility/change';

/**
 * Registers the real package with Forge (strictly, so AST validation errors fail the test) and stubs the host
 * effects so the case has the given date of birth and no saved eligibility check.
 * @param {string | null} dateOfBirth The client's date of birth
 * @returns {ReturnType<ForgeTestHarness['createClient']>} A client for making requests to the journey
 */
function createClient(dateOfBirth: string | null) {
  const noop = async (): Promise<void> => {};
  const effectsWithDeps: FinancialEligibilityEffectsWithDeps = {
    LoadCaseDetails: async (_deps: Deps, context: EffectFunctionContext) => {
      context.setData(CLIENT_DATE_OF_BIRTH_DATA_KEY, dateOfBirth);
    },
    LoadCaseFinancialEligibility: noop,
    PersistSavedAnswers: noop,
    ClearDraftAnswers: noop,
    SaveNewAnswerIfAnswered: noop,
  };

  return new ForgeTestHarness({ strictRegistration: true })
    .registerGlobalComponents(govukComponents)
    .registerGlobalFunctions(transformers, { formatCurrency: (value: number) => `£${value}` })
    .registerGlobalFunctions(moneyConditions)
    .registerPackage<Deps>(createEligibilityPackage, { effectsWithDeps })
    .createClient();
}

const redirectTarget = async (dateOfBirth: string | null, stepPath: string): Promise<string> => {
  const result = await createClient(dateOfBirth).get(`${JOURNEY_PATH}/${stepPath}`, {
    params: { caseId: 'CASE1' },
    session: {},
  });
  expectRedirectOutcome(result);
  return result.url;
};

// Ages are relative to today, so these dates of birth are chosen to stay in range for decades
describe('CFE eligibility journey: skipping age questions answered from the date of birth', () => {
  it('skips under-18 to the regular payment question for a client aged 17 or under', async () => {
    const dob = `${new Date().getFullYear() - 10}-01-01`;
    expect(await redirectTarget(dob, 'under-18')).to.match(/\/under-18-receives-regular-payment$/u);
  });

  it('skips under-18 to the partner question for an adult', async () => {
    expect(await redirectTarget('1990-01-01', 'under-18')).to.match(/\/has-partner$/u);
  });

  it('skips 60-or-over to the benefits question', async () => {
    expect(await redirectTarget('1990-01-01', '60-or-over')).to.match(/\/benefits$/u);
  });

  it('skips 60-or-over-with-partner when the client is 60 or over', async () => {
    expect(await redirectTarget('1940-01-01', '60-or-over-with-partner')).to.match(/\/benefits$/u);
  });

  it('asks 60-or-over-with-partner when the client is under 60, because the partner may be 60 or over', async () => {
    const result = await createClient('1990-01-01').get(`${JOURNEY_PATH}/60-or-over-with-partner`, {
      params: { caseId: 'CASE1' },
      session: {},
    });
    expectRenderOutcome(result);
  });

  it('asks the age questions when there is no date of birth', async () => {
    for (const stepPath of ['under-18', '60-or-over', '60-or-over-with-partner']) {
      const result = await createClient(null).get(`${JOURNEY_PATH}/${stepPath}`, {
        params: { caseId: 'CASE1' },
        session: {},
      });
      expectRenderOutcome(result);
    }
  });
});
