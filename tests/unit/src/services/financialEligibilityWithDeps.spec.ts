import { expect } from "chai";
import sinon from "sinon";
import { createTestEffectContext } from "@ministryofjustice/hmpps-forge/core/testing";
import type { Deps } from "#packages/cfe-eligibility-journey/src/api.js";
import type { FinancialEligibilitySession } from "#packages/cfe-eligibility-journey/src/context.type.js";
import { FinancialEligibilityEffectsWithDepsImpl } from "#src/services/financialEligibilityWithDeps.js";

const deps = {} as Deps;

describe("FinancialEligibilityEffectsWithDepsImpl", () => {
  it("loads ordinary case details and category without calling legacy eligibility APIs", async () => {
    const loadCase = sinon.stub().resolves({
      reference: "CASE1",
      date_of_birth: "1990-01-01",
      category: "Debt",
    });
    const getFinancialEligibility = sinon.stub();
    const updateFinancialEligibility = sinon.stub();
    const apiService = {
      loadCase,
      getFinancialEligibility,
      updateFinancialEligibility,
    };
    const effects = new FinancialEligibilityEffectsWithDepsImpl(apiService);
    const context = createTestEffectContext({
      params: { caseId: "CASE1" },
      state: { authenticatedAxios: {} },
      session: {},
    });

    await effects.LoadCaseDetails(deps, context);

    expect(loadCase.calledOnce).to.equal(true);
    expect(context.getData("clientDateOfBirth")).to.equal("1990-01-01");
    expect(context.getAnswer("category")).to.equal("debt");
    expect(getFinancialEligibility.called).to.equal(false);
    expect(updateFinancialEligibility.called).to.equal(false);
  });

  it("restores only the current case draft and clears stale journey answers", async () => {
    const effects = new FinancialEligibilityEffectsWithDepsImpl({
      loadCase: sinon.stub(),
    });
    const context = createTestEffectContext({
      params: { caseId: "CASE1" },
      answers: {
        "has-partner": "yes",
        "under-18": "yes",
        value_0: "123",
        unrelatedAnswer: "preserved",
      },
      data: { case: { category: "family" } },
      session: {
        financialEligibilityDrafts: {
          CASE1: { "has-partner": "no" },
          CASE2: { "has-partner": "yes" },
        },
      },
    });

    await effects.RestoreCaseDraft(deps, context);

    expect(context.getAnswer("has-partner")).to.equal("no");
    expect(context.getAnswer("under-18")).to.equal(undefined);
    expect(context.getAnswer("value_0")).to.equal(undefined);
    expect(context.getAnswer("category")).to.equal("family");
    expect(context.getAnswer("unrelatedAnswer")).to.equal("preserved");
  });

  it("returns an incomplete draft to its first missing active question", async () => {
    const effects = new FinancialEligibilityEffectsWithDepsImpl({
      loadCase: sinon.stub(),
    });
    const session: Record<string, unknown> = {};
    const context = createTestEffectContext({
      params: { caseId: "CASE1" },
      answers: { "under-18": "no" },
      session,
    });

    await effects.ValidateDraftAnswers(deps, context);

    expect(context.getData("submissionMissingStep")).to.equal("has-partner");
    const storedSession =
      context.getSession() as unknown as FinancialEligibilitySession;
    expect(storedSession.eligibilitySubmissionErrors?.CASE1).to.equal(
      "has-partner",
    );
  });

  it("prepares only the active branch and keeps the snapshot in the session", async () => {
    const apiService = {
      loadCase: sinon.stub(),
      getFinancialEligibility: sinon.stub(),
      updateFinancialEligibility: sinon.stub(),
    };
    const effects = new FinancialEligibilityEffectsWithDepsImpl(apiService);
    const session: Record<string, unknown> = {};
    const context = createTestEffectContext({
      params: { caseId: "CASE1" },
      answers: {
        category: "family",
        "under-18": "yes",
        "under-18-receives-regular-payment": "no",
        "under-18-has-valuables": "no",
        "has-partner": "yes",
        "bank-balance": "900",
      },
      data: { clientDateOfBirth: "2010-02-03" },
      session,
    });

    await effects.PrepareSubmission(deps, context);

    const storedSession =
      context.getSession() as unknown as FinancialEligibilitySession;
    const snapshot = storedSession.preparedEligibilitySnapshots?.CASE1;
    expect(snapshot?.schemaVersion).to.equal(1);
    expect(snapshot?.clientDateOfBirth).to.equal("2010-02-03");
    expect(snapshot?.answers).to.deep.equal({
      category: "family",
      "under-18": "yes",
      "under-18-receives-regular-payment": "no",
      "under-18-has-valuables": "no",
    });
    expect(storedSession.financialEligibilityDrafts).to.equal(undefined);
    expect(context.getData("submissionMissingStep")).to.equal("");
  });

  it("does not render a prepared boundary after the session snapshot is missing", async () => {
    const effects = new FinancialEligibilityEffectsWithDepsImpl({
      loadCase: sinon.stub(),
    });
    const context = createTestEffectContext({
      params: { caseId: "CASE1" },
      session: {},
    });

    await effects.CheckPreparedSubmission(deps, context);

    expect(context.getData("preparedSubmissionExists")).to.equal(false);
  });

  it("clears only the current case draft and its preparation state on discard", async () => {
    const effects = new FinancialEligibilityEffectsWithDepsImpl({
      loadCase: sinon.stub(),
    });
    const session: Record<string, unknown> = {
      financialEligibilityDrafts: {
        CASE1: { "under-18": "no" },
        CASE2: { "under-18": "yes" },
      },
      casePatternDrafts: {
        CASE1: { properties: { propertySet: [] } },
        CASE2: { properties: { propertySet: [] } },
      },
      preparedEligibilitySnapshots: {
        CASE1: { schemaVersion: 1, caseId: "CASE1", answers: {} },
        CASE2: { schemaVersion: 1, caseId: "CASE2", answers: {} },
      },
      eligibilitySubmissionErrors: { CASE1: "has-partner", CASE2: "benefits" },
    };
    const context = createTestEffectContext({
      params: { caseId: "CASE1" },
      session,
    });

    await effects.ClearDraftAnswers(deps, context);

    const storedSession =
      context.getSession() as unknown as FinancialEligibilitySession;
    expect(storedSession.financialEligibilityDrafts.CASE1).to.equal(undefined);
    expect(storedSession.financialEligibilityDrafts.CASE2).to.deep.equal({
      "under-18": "yes",
    });
    expect(storedSession.preparedEligibilitySnapshots?.CASE1).to.equal(
      undefined,
    );
    expect(storedSession.eligibilitySubmissionErrors?.CASE1).to.equal(
      undefined,
    );
    expect(storedSession.casePatternDrafts?.CASE2).to.deep.equal({
      properties: { propertySet: [] },
    });
  });
});
