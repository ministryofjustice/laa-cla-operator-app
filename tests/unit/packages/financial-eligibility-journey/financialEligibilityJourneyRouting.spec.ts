import { expect } from 'chai';
import { under18Step } from '#packages/financial-eligibility-journey/src/under18Page/under18Step.js';
import { under18RegularPaymentStep } from '#packages/financial-eligibility-journey/src/under18RegularPaymentPage/under18RegularPaymentStep.js';
import { under18HasValuablesStep } from '#packages/financial-eligibility-journey/src/under18HasValuablesPage/under18HasValuablesStep.js';
import { partnerStep } from '#packages/financial-eligibility-journey/src/partnerPage/partnerStep.js';
import { over60Step } from '#packages/financial-eligibility-journey/src/over60Page/over60Step.js';
import { over60StepWithPartnerStep } from '#packages/financial-eligibility-journey/src/over60PWithPartnerPage/over60WithPartnerStep.js';
import { benefitsStep } from '#packages/financial-eligibility-journey/src/benefitsPage/benefitsStep.js';
import { propertiesStep } from '#packages/financial-eligibility-journey/src/propertiesPage/propertiesStep.js';
import { savingsStep } from '#packages/financial-eligibility-journey/src/savingsPage/savingsStep.js';
import { partnerSavingsStep } from '#packages/financial-eligibility-journey/src/partnerSavingsPage/partnerSavingsStep.js';
import { disputedSavingsStep } from '#packages/financial-eligibility-journey/src/disputedSavingsPage/disputedSavingsStep.js';
import { disregardsStep } from '#packages/financial-eligibility-journey/src/disregardsPage/disregardsStep.js';
import { incomeStep } from '#packages/financial-eligibility-journey/src/incomePage/incomeStep.js';
import { partnerIncomeStep } from '#packages/financial-eligibility-journey/src/partnerIncomePage/partnerIncomeStep.js';
import { dependantsStep } from '#packages/financial-eligibility-journey/src/dependantsPage/dependantsStep.js';
import { expensesStep } from '#packages/financial-eligibility-journey/src/expensesPage/expensesStep.js';
import { partnerExpensesStep } from '#packages/financial-eligibility-journey/src/partnerExpensesPage/partnerExpensesStep.js';
import { checkAnswersStep } from '#packages/financial-eligibility-journey/src/checkAnswersPage/checkAnswersStep.js';
import { propertiesStepPartner } from '#packages/financial-eligibility-journey/src/propertiesPageWithPartner/propertiesStepPartner.js';
import { undisputedSavingsStep } from '#packages/financial-eligibility-journey/src/undisputedSavings/undisputedSavingsStep.js';
import { partnerDependantsStep } from '#packages/financial-eligibility-journey/src/partnerDependantsPage/partnerDependantsStep.js';

describe('Financial eligibility Forge routing', () => {
  it('routes under-18 answers to the correct next steps', () => {
    const submitConfig = under18Step.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(3);
    expect(redirectGoesTo[0]).to.equal(under18RegularPaymentStep.code);
    expect(redirectGoesTo[1]).to.equal(partnerStep.code);
    expect(redirectGoesTo[2]).to.equal(partnerStep.code);
  });

  it('routes under-18-receives-regular-payment answers to the correct next steps', () => {
    const submitConfig = under18RegularPaymentStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(2);
    expect(redirectGoesTo[0]).to.equal(partnerStep.code);
    expect(redirectGoesTo[1]).to.equal(under18HasValuablesStep.code);
  });

  it('routes under-18-has-valuables answers to the correct next steps', () => {
    const submitConfig = under18HasValuablesStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(2);
    expect(redirectGoesTo[0]).to.equal(partnerStep.code);
    expect(redirectGoesTo[1]).to.equal(checkAnswersStep.code);
  });

  it('routes has-partner answers to the correct next steps', () => {
    const submitConfig = partnerStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(2);
    expect(redirectGoesTo[0]).to.equal(over60StepWithPartnerStep.code);
    expect(redirectGoesTo[1]).to.equal(over60Step.code);
  });

  it('routes 60-or-over answers to the correct next steps', () => {
    const submitConfig = over60Step.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(1);
    expect(redirectGoesTo[0]).to.equal(benefitsStep.code);
  });

  it('routes 60-or-over-with-partner answers to the correct next steps', () => {
    const submitConfig = over60StepWithPartnerStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(1);
    expect(redirectGoesTo[0]).to.equal(benefitsStep.code);
  });

  it('routes benefits answers to the correct next steps', () => {
    const submitConfig = benefitsStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(2);
    expect(redirectGoesTo[0]).to.equal(propertiesStepPartner.code);
    expect(redirectGoesTo[1]).to.equal(propertiesStep.code);
  });

  it('routes properties answers to the correct next steps', () => {
    const submitConfig = propertiesStep.onSubmission?.[2];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(2);
    expect(redirectGoesTo[0]).to.equal(undisputedSavingsStep.code);
    expect(redirectGoesTo[1]).to.equal(savingsStep.code);
  });

  it('routes savings answers to the correct next steps', () => {
    const submitConfig = savingsStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(2);
    expect(redirectGoesTo[0]).to.equal(partnerSavingsStep.code);
    expect(redirectGoesTo[1]).to.equal(disregardsStep.code);
  });

  it('routes partner-savings answers to the correct next steps', () => {
    const submitConfig = partnerSavingsStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(1);
    expect(redirectGoesTo[0]).to.equal(disregardsStep.code);
  });

  it('routes disputed-savings answers to the correct next steps', () => {
    const submitConfig = disputedSavingsStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(1);
    expect(redirectGoesTo[0]).to.equal(disregardsStep.code);
  });

  it('routes disregards answers to the correct next steps', () => {
    const submitConfig = disregardsStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(2);
    expect(redirectGoesTo[0]).to.equal(checkAnswersStep.code);
    expect(redirectGoesTo[1]).to.equal(incomeStep.code);
  });

  it('routes your-income answers to the correct next steps', () => {
    const submitConfig = incomeStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(2);
    expect(redirectGoesTo[0]).to.equal(partnerIncomeStep.code);
    expect(redirectGoesTo[1]).to.equal(dependantsStep.code);
  });

  it('routes partner-income answers to the correct next steps', () => {
    const submitConfig = partnerIncomeStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(1);
    expect(redirectGoesTo[0]).to.equal(partnerDependantsStep.code);
  });

  it('routes dependants answers to the correct next steps', () => {
    const submitConfig = dependantsStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(1);
    expect(redirectGoesTo[0]).to.equal(expensesStep.code);
  });

   it('routes partner dependants answers to the correct next steps', () => {
    const submitConfig = partnerDependantsStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(1);
    expect(redirectGoesTo[0]).to.equal(expensesStep.code);
  });

  it('routes your-expenses answers to the correct next steps', () => {
    const submitConfig = expensesStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(2);
    expect(redirectGoesTo[0]).to.equal(partnerExpensesStep.code);
    expect(redirectGoesTo[1]).to.equal(checkAnswersStep.code);
  });

  it('routes partner-expenses answers to the correct next steps', () => {
    const submitConfig = partnerExpensesStep.onSubmission?.[0];
    const next = submitConfig?.onValid?.next;
    const redirectGoesTo = (next ?? [])
      .map((outcome) => ('goto' in outcome ? outcome.goto : null))
      .filter((goto): goto is string => goto !== null);

    expect(redirectGoesTo).to.have.length(1);
    expect(redirectGoesTo[0]).to.equal(checkAnswersStep.code);
  });
});
