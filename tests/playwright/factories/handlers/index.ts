/**
 * MSW Handlers Index
 *
 * Composes all domain-specific handlers into a single array for MSW server.
 * Following MSW best practices for modular handler organization.
 *
 * @see https://mswjs.io/docs/best-practices/structuring-handlers
 */

import { http, HttpResponse } from "msw";

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
      }),
  ),
  http.put(
    "*/call_centre/api/v1/case/:caseId/personal_details/",
    () => new HttpResponse(null, { status: 204 }),
  ),
  // CFE's state benefit types, offered on the benefit details steps
  http.get("*/state_benefit_type", () =>
    HttpResponse.json([
      {
        name: "Carer's Allowance",
        label: "carers_allowance",
        dwp_code: null,
        exclude_from_gross_income: false,
        category: "carer_disability",
      },
      {
        name: "Child Benefit",
        label: "child_benefit",
        dwp_code: null,
        exclude_from_gross_income: false,
        category: "other",
      },
      {
        name: "Housing Benefit",
        label: "housing_benefit",
        dwp_code: null,
        exclude_from_gross_income: true,
        category: "other",
      },
    ]),
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
