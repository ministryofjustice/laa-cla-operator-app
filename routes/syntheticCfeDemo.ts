import express from "express";
import type { NextFunction, Request, Response } from "express";
import { CfeClient, CfeClientError } from "#src/services/cfeClient.js";
import type { CfeAssessmentResponse } from "#src/services/cfeClient.js";
import { createSyntheticCfeAssessment } from "#src/services/cfeSyntheticFixture.js";
import { requireAuth } from "#src/middleware/apiMiddleware.js";

const DEMO_PATH = "/dev/cfe-synthetic-assessment";
const NOT_FOUND_STATUS = 404;
const SEE_OTHER_STATUS = 303;
const MIN_REMARK_ITEMS = 1;

/**
 * Allows the test page only when explicitly enabled outside production.
 * @param {string | undefined} environment Runtime environment name.
 * @param {string | undefined} enabled Explicit feature flag value.
 * @returns {boolean} True only when the flag is enabled outside production.
 */
export const isSyntheticCfeDemoEnabled = (
  environment = process.env.NODE_ENV,
  enabled = process.env.CFE_SYNTHETIC_DEMO_ENABLED,
): boolean => environment !== "production" && enabled === "true";

/**
 * Maps an explicit CFE client failure to a safe operator-facing message.
 * @param {CfeClientError} error Typed failure from the CFE client.
 * @returns {string} User-safe error text without response bodies or credentials.
 */
const getPublicErrorMessage = (error: CfeClientError): string => {
  switch (error.code) {
    case "configuration":
      return "The synthetic CFE demonstration is not configured for staging.";
    case "timeout":
      return "The CFE staging request timed out. No result was returned.";
    case "network":
      return "The CFE staging service could not be reached. No result was returned.";
    case "http":
      return `CFE staging returned HTTP ${error.status ?? "an unexpected status"}. No result was returned.`;
    case "invalid-response":
      return "CFE staging returned a response that did not match the v7 contract. No result was shown.";
  }
};

/**
 * Creates the separately gated synthetic CFE demonstration routes.
 * @returns {express.Router} Router for the one-off demo page and POST action.
 */
const createRouter = (): express.Router => {
  const router = express.Router();

  /**
   * Hides the demonstration route unless its non-production flag is enabled.
   * @param {Request} _req Express request.
   * @param {Response} res Express response.
   * @param {NextFunction} next Express continuation.
   * @returns {void} Calls the next middleware or sends a not-found response.
   */
  const demoGate = (_req: Request, res: Response, next: NextFunction): void => {
    if (!isSyntheticCfeDemoEnabled()) {
      res.sendStatus(NOT_FOUND_STATUS);
      return;
    }
    next();
  };

  router.get(
    DEMO_PATH,
    demoGate,
    requireAuth,
    (req: Request, res: Response): void => {
      const { session } = req;
      const { syntheticCfeDemoError: error, syntheticCfeAssessment: response } =
        session;
      delete session.syntheticCfeDemoError;
      const breakdown = response === undefined ? [] : getBreakdown(response);
      const remarks = response === undefined ? [] : getRemarks(response);

      res.render("main/dev/cfe-synthetic-assessment.njk", {
        error,
        response,
        breakdown,
        remarks,
      });
    },
  );

  router.post(
    DEMO_PATH,
    demoGate,
    requireAuth,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (req.session.syntheticCfeAssessment !== undefined) {
        res.redirect(SEE_OTHER_STATUS, DEMO_PATH);
        return;
      }

      try {
        const client = new CfeClient({
          baseUrl: process.env.CFE_API_BASE_URL,
          timeoutMs: Number(process.env.CFE_REQUEST_TIMEOUT_MS ?? "10000"),
        });
        const assessmentResponse = await client.submitAssessment(
          createSyntheticCfeAssessment(),
        );
        // Express session state belongs to this request and is assigned after the awaited CFE call.
        // eslint-disable-next-line require-atomic-updates -- The request-scoped session receives the result after the CFE response.
        req.session.syntheticCfeAssessment = assessmentResponse;
      } catch (error) {
        if (!(error instanceof CfeClientError)) {
          next(error);
          return;
        }
        const publicErrorMessage = getPublicErrorMessage(error);
        // eslint-disable-next-line require-atomic-updates -- The request-scoped session receives the mapped error after the CFE call.
        req.session.syntheticCfeDemoError = publicErrorMessage;
      }

      res.redirect(SEE_OTHER_STATUS, DEMO_PATH);
    },
  );

  return router;
};

interface CfeBreakdownLine {
  label: string;
  amount: string;
}

interface CfeBreakdownGroup {
  section: string;
  items: CfeBreakdownLine[];
}

/**
 * Selects only numeric values actually returned by CFE for the result display.
 * @param {CfeAssessmentResponse} response Validated CFE response.
 * @returns {CfeBreakdownGroup[]} Grouped values for the template.
 */
function getBreakdown(response: CfeAssessmentResponse): CfeBreakdownGroup[] {
  const groups = new Map<string, CfeBreakdownLine[]>();
  const currency = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  });
  /**
   * Adds a returned finite amount without defaulting missing values to zero.
   * @param {string} section Display section.
   * @param {string} label Amount label.
   * @param {unknown} value Candidate response value.
   * @returns {void} Adds a line only for a finite numeric value.
   */
  const addNumber = (section: string, label: string, value: unknown): void => {
    if (typeof value === "number" && Number.isFinite(value)) {
      const items = groups.get(section) ?? [];
      items.push({ label, amount: currency.format(value) });
      groups.set(section, items);
    }
  };
  const { result_summary: summary } = response;

  addNumber(
    "Gross income",
    "Applicant total gross income per month",
    summary.gross_income.total_gross_income,
  );
  addNumber(
    "Gross income",
    "Applicant and partner gross income per month",
    summary.gross_income.combined_total_gross_income,
  );
  addNumber(
    "Gross income",
    "Partner total gross income per month",
    summary.partner_gross_income?.total_gross_income,
  );
  addNumber(
    "Disposable income",
    "Overall income contribution",
    summary.overall_result.income_contribution,
  );
  addNumber(
    "Capital",
    "Overall capital contribution",
    summary.overall_result.capital_contribution,
  );

  for (const [section, values] of [
    ["Disposable income", summary.disposable_income],
    ["Partner disposable income", summary.partner_disposable_income],
  ] as const) {
    if (values === undefined) {
      continue;
    }
    addNumber(
      section,
      "Total disposable income per month",
      values.total_disposable_income,
    );
    addNumber(
      section,
      "Total outgoings and allowances per month",
      values.total_outgoings_and_allowances,
    );
    addNumber(section, "Income contribution", values.income_contribution);
    addNumber(
      section,
      "Combined total disposable income per month",
      values.combined_total_disposable_income,
    );
    addNumber(
      section,
      "Combined outgoings and allowances per month",
      values.combined_total_outgoings_and_allowances,
    );
  }

  for (const [section, values] of [
    ["Capital", summary.capital],
    ["Partner capital", summary.partner_capital],
  ] as const) {
    if (values === undefined) {
      continue;
    }
    addNumber(section, "Assessed capital", values.assessed_capital);
    addNumber(section, "Total liquid capital", values.total_liquid);
    addNumber(section, "Total non-liquid capital", values.total_non_liquid);
    addNumber(section, "Total vehicle capital", values.total_vehicle);
    addNumber(section, "Total property capital", values.total_property);
    addNumber(section, "Total capital", values.total_capital);
    addNumber(
      section,
      "Total capital including SMOD",
      values.total_capital_with_smod,
    );
    addNumber(section, "Capital contribution", values.capital_contribution);
    addNumber(
      section,
      "Combined assessed capital",
      values.combined_assessed_capital,
    );
  }

  return Array.from(groups, ([section, items]) => ({ section, items }));
}

/**
 * Exposes non-empty CFE remarks without inventing user-facing explanations.
 * @param {CfeAssessmentResponse} response Validated CFE response.
 * @returns {Array<{ label: string; detail: string }>} Non-empty remark paths and exact returned details.
 */
function getRemarks(response: CfeAssessmentResponse): Array<{
  label: string;
  detail: string;
}> {
  const {
    assessment: { remarks },
  } = response;
  if (remarks === undefined) {
    return [];
  }

  const flattened: Array<{ label: string; detail: string }> = [];
  /**
   * Flattens only returned remark values for safe escaped display.
   * @param {unknown} value CFE remark value.
   * @param {string} path Current path in the returned remark structure.
   * @returns {void} Adds non-empty returned arrays to the display list.
   */
  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      if (value.length >= MIN_REMARK_ITEMS) {
        flattened.push({ label: path, detail: JSON.stringify(value) });
      }
      return;
    }

    if (typeof value === "object" && value !== null) {
      for (const [key, nestedValue] of Object.entries(value)) {
        visit(nestedValue, path !== "" ? `${path}.${key}` : key);
      }
    }
  };

  visit(remarks, "");
  return flattened;
}

export default createRouter();
