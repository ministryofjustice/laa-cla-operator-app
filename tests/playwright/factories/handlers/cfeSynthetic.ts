import { http, HttpResponse } from "msw";

const proceedingResult = {
  ccms_code: "DA001",
  client_involvement_type: "A",
  upper_threshold: 10000,
  lower_threshold: 0,
  result: "eligible",
};

let assessmentCount = 0;

export const cfeSyntheticHandlers = [
  http.post(
    "https://cfe-civil-staging.cloud-platform.service.justice.gov.uk/v7/assessments",
    async ({ request }) => {
      assessmentCount += 1;
      const requestBody = (await request.json()) as {
        assessment?: { level_of_help?: string };
        applicant?: { date_of_birth?: string };
      };

      if (
        requestBody.assessment?.level_of_help !== "controlled" ||
        requestBody.applicant?.date_of_birth !== "1980-01-01"
      ) {
        return HttpResponse.json(
          { detail: "Unexpected test request" },
          { status: 422 },
        );
      }

      const totalGrossIncome = assessmentCount === 1 ? 1234 : 9876;
      return HttpResponse.json({
        timestamp: "2026-11-05T00:00:00Z",
        version: "7",
        success: true,
        result_summary: {
          overall_result: {
            result: "eligible",
            capital_contribution: 0,
            income_contribution: 0,
            proceeding_types: [proceedingResult],
          },
          gross_income: {
            total_gross_income: totalGrossIncome,
            combined_total_gross_income: totalGrossIncome,
            proceeding_types: [proceedingResult],
          },
          disposable_income: {
            total_disposable_income: 1100,
            total_outgoings_and_allowances: 134,
          },
          capital: {
            total_liquid: 125,
            total_capital: 125,
            assessed_capital: 125,
          },
        },
        assessment: {
          id: "synthetic-mock-assessment",
          level_of_help: "controlled",
          remarks: {
            client_outgoings_housing_cost: {
              amount_variation: ["synthetic-id"],
            },
          },
        },
      });
    },
  ),
];
