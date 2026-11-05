/**
 * MSW Handlers Index
 *
 * Composes all domain-specific handlers into a single array for MSW server.
 * Following MSW best practices for modular handler organization.
 *
 * @see https://mswjs.io/docs/best-practices/structuring-handlers
 */

import { http, HttpResponse } from "msw";

type EligibilityCheck = Record<string, unknown>;

// In-memory eligibility checks keyed by case reference. Like cla_backend, a case has no
// eligibility check (404) until one is created with POST; PATCH then updates it.
const eligibilityChecks = new Map<string, EligibilityCheck>();
const personalDetails = new Map<string, Record<string, unknown>>();

/**
 * Combined handlers array
 */
export const handlers = [
  http.get("*/call_centre/api/v1/case/", () =>
    HttpResponse.json({
      count: 0,
      next: null,
      previous: null,
      results: [],
    }),
  ),
  http.get<{ caseId: string }>(
    "*/call_centre/api/v1/case/:caseId",
    ({ params }) =>
      HttpResponse.json({
        reference: params.caseId,
        date_of_birth:
          params.caseId === "EL-NO-DOB"
            ? null
            : (personalDetails.get(params.caseId)?.dob ?? "1980-05-14"),
      }),
  ),
  http.patch<{ caseId: string }, Record<string, unknown>>(
    "*/call_centre/api/v1/case/:caseId/personal_details/",
    async ({ params, request }) => {
      if (params.caseId === "EL-SAVE-FAIL") {
        return HttpResponse.json(
          { detail: "Unable to save personal details." },
          { status: 500 },
        );
      }
      const details = await request.json();
      if (
        details.dob !== undefined &&
        (typeof details.dob !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/u.test(details.dob))
      ) {
        return HttpResponse.json(
          { dob: ["Date has wrong format. Use YYYY-MM-DD."] },
          { status: 400 },
        );
      }
      personalDetails.set(params.caseId, {
        ...personalDetails.get(params.caseId),
        ...details,
      });
      return new HttpResponse(null, { status: 204 });
    },
  ),
  http.get<{ caseId: string }>(
    "*/call_centre/api/v1/case/:caseId/eligibility_check/",
    ({ params }) => {
      const check = eligibilityChecks.get(params.caseId);
      return check === undefined
        ? HttpResponse.json({ detail: "Not found." }, { status: 404 })
        : HttpResponse.json(check);
    },
  ),
  http.post<{ caseId: string }, EligibilityCheck>(
    "*/call_centre/api/v1/case/:caseId/eligibility_check/",
    async ({ params, request }) => {
      const check = { reference: params.caseId, ...(await request.json()) };
      eligibilityChecks.set(params.caseId, check);
      return HttpResponse.json(check, { status: 201 });
    },
  ),
  http.patch<{ caseId: string }, EligibilityCheck>(
    "*/call_centre/api/v1/case/:caseId/eligibility_check/",
    async ({ params, request }) => {
      const existing = eligibilityChecks.get(params.caseId);
      if (existing === undefined) {
        return HttpResponse.json({ detail: "Not found." }, { status: 404 });
      }
      const check = { ...existing, ...(await request.json()) };
      eligibilityChecks.set(params.caseId, check);
      return HttpResponse.json(check);
    },
  ),
  // Health check endpoint for testing
  http.get("/health", () =>
    HttpResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      msw: "active",
    }),
  ),
];
