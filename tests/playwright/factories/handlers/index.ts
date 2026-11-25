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
  http.get(
    "*/call_centre/api/v1/case/:caseId/personal_details/",
    ({ params }) =>
      HttpResponse.json({
        full_name: "Jane Doe",
        dob: { month: "10", day: "10", year: "1988" },
        email: "jane.doe@example.com",
        mobile_phone: "1234567890",
        safe_to_contact: "SAFE",
        announce_call: true,
        street: "102 Petty France",
        postcode: "SW1H 9AJ",
      }),
  ),
  http.put(
    "*/call_centre/api/v1/case/:caseId/personal_details/",
    () => new HttpResponse(null, { status: 204 }),
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
