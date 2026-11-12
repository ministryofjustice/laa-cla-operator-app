import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core";
import type {
  Deps,
  FinancialEligibilityEffectsWithDeps,
} from "#packages/cfe-eligibility-journey/src/api.js";
import { getOrMigrateCasePatternDrafts } from "#packages/cfe-eligibility-journey/src/casePatternDrafts.js";
import { clearControlledWorkAnswers } from "#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSession.js";
import {
  CLIENT_DATE_OF_BIRTH_DATA_KEY,
  type EligibilityAnswerSnapshot,
  type PropertyAnswer,
  createEligibilityAnswerSnapshot,
  findFirstMissingEligibilityAnswer,
  isEligibilityAnswerCode,
} from "#packages/cfe-eligibility-journey/src/index.js";
import {
  clearEligibilitySubmissionError,
  invalidatePreparedEligibilitySnapshot,
} from "#packages/cfe-eligibility-journey/src/draftState.js";
import type { FinancialEligibilitySession } from "#packages/cfe-eligibility-journey/src/context.type.js";
import type { CaseDetails } from "#types/api-types.js";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";
import { normaliseSelectedCheckbox } from "#src/scripts/helpers/index.js";
import type { loadCase } from "#src/services/api/caseDetailsService.js";

const PROPERTY_PATTERN_CODE = "properties";
const PROPERTY_COLLECTION_CODE = "propertySet";

interface HostApiService {
  loadCase: typeof loadCase;
}

/**
 * Gets the case identifier from the current journey route.
 * @param {EffectFunctionContext} context The Forge effect context
 * @returns {string} The case identifier
 */
function getCaseId(context: EffectFunctionContext): string {
  const caseId = context.getRequestParam("caseId");
  if (!caseId) {
    throw new Error(
      "No caseId found in the financial eligibility journey path",
    );
  }
  return caseId;
}

/**
 * Gets the session used to hold case-scoped eligibility drafts.
 * @param {EffectFunctionContext} context The Forge effect context
 * @returns {FinancialEligibilitySession} The current session
 */
function getSession(
  context: EffectFunctionContext,
): FinancialEligibilitySession {
  const session = context.getSession() as
    FinancialEligibilitySession | undefined;
  if (!session) {
    throw new Error(
      "No session is available for the financial eligibility journey",
    );
  }
  return session;
}

/**
 * Gets property draft entries for a case.
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @returns {PropertyAnswer[]} The saved property entries
 */
function getCaseProperties(
  session: FinancialEligibilitySession,
  caseId: string,
): PropertyAnswer[] {
  const propertyPatternDrafts = getOrMigrateCasePatternDrafts(session, caseId)[
    PROPERTY_PATTERN_CODE
  ];
  const collection = propertyPatternDrafts?.[PROPERTY_COLLECTION_CODE];
  return Array.isArray(collection) ? (collection as PropertyAnswer[]) : [];
}

/**
 * Clears answer values belonging to the eligibility journey.
 * @param {EffectFunctionContext} context The Forge effect context
 * @returns {void}
 */
function clearJourneyAnswers(context: EffectFunctionContext): void {
  for (const code of Object.keys(context.getAllAnswers())) {
    if (isEligibilityAnswerCode(code)) context.clearAnswer(code);
  }
}

/**
 * Stores the missing-answer result for redirects and inline validation messages.
 * @param {EffectFunctionContext} context The Forge effect context
 * @param {FinancialEligibilitySession} session The current session
 * @param {string} caseId The case identifier
 * @param {ReturnType<typeof findFirstMissingEligibilityAnswer>} missing The first missing answer
 * @returns {void}
 */
function setValidationResult(
  context: EffectFunctionContext,
  session: FinancialEligibilitySession,
  caseId: string,
  missing: ReturnType<typeof findFirstMissingEligibilityAnswer>,
): void {
  if (missing) {
    session.eligibilitySubmissionErrors ??= {};
    session.eligibilitySubmissionErrors[caseId] = missing.stepPath;
    context.setData("submissionMissingStep", missing.stepPath);
    context.setData("submissionValidationStep", missing.stepPath);
    return;
  }

  clearEligibilitySubmissionError(session, caseId);
  context.setData("submissionMissingStep", "");
  context.setData("submissionValidationStep", "");
}

/**
 * Implements session-only eligibility draft and preparation effects.
 */
export class FinancialEligibilityEffectsWithDepsImpl implements FinancialEligibilityEffectsWithDeps {
  private readonly apiService: HostApiService;

  /**
   * Creates the session-only eligibility effect implementation.
   * @param {HostApiService} apiService Host API services used by the journey
   */
  constructor(apiService: HostApiService) {
    this.apiService = apiService;
  }

  /**
   * Loads current case details required by the eligibility journey.
   * @param {Deps} _deps Forge effect dependencies
   * @param {EffectFunctionContext} context The Forge effect context
   * @returns {Promise<void>}
   */
  LoadCaseDetails = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = getCaseId(context);
    const axiosMiddleware = context.getState("authenticatedAxios");
    if (!axiosMiddleware || typeof axiosMiddleware !== "object") {
      throw new Error(
        "Authenticated API middleware is not available for loading case details",
      );
    }

    const caseDetails = await this.apiService.loadCase(
      axiosMiddleware as AxiosInstanceWrapper,
      caseId,
    );
    context.setData("case", caseDetails);
    context.setData("caseDetails", { status: "success", data: caseDetails });
    context.setData(
      CLIENT_DATE_OF_BIRTH_DATA_KEY,
      caseDetails.date_of_birth ?? null,
    );
    if (typeof caseDetails.category === "string") {
      context.setAnswer("category", caseDetails.category.toLowerCase());
    } else {
      context.clearAnswer("category");
    }
  };

  /**
   * Restores the case's session-only draft and removes answers from other cases.
   * @param {Deps} _deps Forge effect dependencies
   * @param {EffectFunctionContext} context The Forge effect context
   * @returns {Promise<void>}
   */
  RestoreCaseDraft = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = getCaseId(context);
    const session = getSession(context);
    clearJourneyAnswers(context);

    session.financialEligibilityDrafts ??= {};
    const draft = session.financialEligibilityDrafts[caseId] ?? {};
    session.financialEligibilityDrafts[caseId] = draft;
    for (const [code, value] of Object.entries(draft)) {
      if (isEligibilityAnswerCode(code)) context.setAnswer(code, value);
    }

    const caseDetails = context.getData<CaseDetails | undefined>("case");
    if (typeof caseDetails?.category === "string") {
      context.setAnswer("category", caseDetails.category.toLowerCase());
    }
    context.setData(
      "propertiesStepPath",
      context.getAnswer("has-partner") === "yes"
        ? "client-partner-properties"
        : "properties",
    );
  };

  /**
   * Validates the active draft before the review or preparation page is shown.
   * @param {Deps} _deps Forge effect dependencies
   * @param {EffectFunctionContext} context The Forge effect context
   * @returns {Promise<void>}
   */
  ValidateDraftAnswers = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = getCaseId(context);
    const session = getSession(context);
    const missing = findFirstMissingEligibilityAnswer(
      context.getAllAnswers(),
      getCaseProperties(session, caseId),
    );
    setValidationResult(context, session, caseId, missing);
  };

  /**
   * Creates the session-only answer snapshot after validating all active answers.
   * @param {Deps} _deps Forge effect dependencies
   * @param {EffectFunctionContext} context The Forge effect context
   * @returns {Promise<void>}
   */
  PrepareSubmission = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = getCaseId(context);
    const session = getSession(context);
    const answers = context.getAllAnswers();
    const properties = getCaseProperties(session, caseId);
    const missing = findFirstMissingEligibilityAnswer(answers, properties);
    setValidationResult(context, session, caseId, missing);

    if (missing) {
      invalidatePreparedEligibilitySnapshot(session, caseId);
      return;
    }

    const snapshot: EligibilityAnswerSnapshot = createEligibilityAnswerSnapshot(
      caseId,
      answers,
      properties,
      context.getData(CLIENT_DATE_OF_BIRTH_DATA_KEY),
    );
    session.preparedEligibilitySnapshots ??= {};
    session.preparedEligibilitySnapshots[caseId] = snapshot;
  };

  /**
   * Checks that the current case still has a valid prepared snapshot.
   * @param {Deps} _deps Forge effect dependencies
   * @param {EffectFunctionContext} context The Forge effect context
   * @returns {Promise<void>}
   */
  CheckPreparedSubmission = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = getCaseId(context);
    const session = getSession(context);
    const snapshot = session.preparedEligibilitySnapshots?.[caseId];
    const currentDob = context.getData(CLIENT_DATE_OF_BIRTH_DATA_KEY);
    const hasCurrentDob =
      typeof currentDob === "string"
        ? snapshot?.clientDateOfBirth === currentDob
        : snapshot?.clientDateOfBirth === undefined;
    const exists =
      snapshot?.schemaVersion === 1 &&
      snapshot.caseId === caseId &&
      hasCurrentDob;

    if (!exists) invalidatePreparedEligibilitySnapshot(session, caseId);
    context.setData("preparedSubmissionExists", exists);
  };

  /**
   * Restores the session validation message on the active missing-answer page.
   * @param {Deps} _deps Forge effect dependencies
   * @param {EffectFunctionContext} context The Forge effect context
   * @returns {Promise<void>}
   */
  RestoreSubmissionError = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = getCaseId(context);
    const session = getSession(context);
    const errorStep = session.eligibilitySubmissionErrors?.[caseId] ?? "";
    const path = new URL(context.getRequestUrl()).pathname;
    const isTargetStep = errorStep.length > 0 && path.endsWith(`/${errorStep}`);
    context.setData("submissionValidationStep", isTargetStep ? errorStep : "");
  };

  /**
   * Discards the case's session-only eligibility draft and prepared snapshot.
   * @param {Deps} _deps Forge effect dependencies
   * @param {EffectFunctionContext} context The Forge effect context
   * @returns {Promise<void>}
   */
  ClearDraftAnswers = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = getCaseId(context);
    const session = getSession(context);
    if (session.financialEligibilityDrafts) {
      delete session.financialEligibilityDrafts[caseId];
    }
    if (session.casePatternDrafts) {
      delete session.casePatternDrafts[caseId];
    }
    clearControlledWorkAnswers(session, caseId);
    invalidatePreparedEligibilitySnapshot(session, caseId);
    clearEligibilitySubmissionError(session, caseId);
  };

  /**
   * Saves posted eligibility answers to the current case's session-only draft.
   * @param {Deps} _deps Forge effect dependencies
   * @param {EffectFunctionContext} context The Forge effect context
   * @returns {Promise<void>}
   */
  SaveNewAnswerIfAnswered = async (
    _deps: Deps,
    context: EffectFunctionContext,
  ): Promise<void> => {
    const caseId = getCaseId(context);
    const session = getSession(context);
    session.financialEligibilityDrafts ??= {};
    const draft = session.financialEligibilityDrafts[caseId] ?? {};
    session.financialEligibilityDrafts[caseId] = draft;
    const postData = context.getAllPostData();
    let updated = false;

    for (const [code, postedValue] of Object.entries(postData)) {
      if (
        !isEligibilityAnswerCode(code) ||
        postedValue === undefined ||
        postedValue === null
      ) {
        continue;
      }
      const value =
        code === "disregards"
          ? normaliseSelectedCheckbox(postedValue)
          : postedValue;
      draft[code] = value;
      context.setAnswer(code, value);
      updated = true;
    }

    if (updated) {
      invalidatePreparedEligibilitySnapshot(session, caseId);
      clearEligibilitySubmissionError(session, caseId);
    }
  };
}
