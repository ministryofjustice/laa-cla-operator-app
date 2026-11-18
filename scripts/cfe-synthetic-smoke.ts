import "dotenv/config";
import { CfeClient } from "#src/services/cfeClient.js";
import { createSyntheticCfeAssessment } from "#src/services/cfeSyntheticFixture.js";

const CFE_SUCCESS_STATUS = 200;
const NO_REMARKS = 0;

if (process.env.NODE_ENV === "production") {
  throw new Error("The synthetic CFE smoke test cannot run in production.");
}

if (process.env.CFE_SYNTHETIC_DEMO_ENABLED !== "true") {
  throw new Error(
    "Set CFE_SYNTHETIC_DEMO_ENABLED=true explicitly to run the staging smoke test.",
  );
}

const client = new CfeClient({
  baseUrl: process.env.CFE_API_BASE_URL,
  timeoutMs: Number(process.env.CFE_REQUEST_TIMEOUT_MS ?? "10000"),
});
const result = await client.submitAssessment(createSyntheticCfeAssessment());

console.log(
  JSON.stringify({
    httpStatus: CFE_SUCCESS_STATUS,
    apiVersion: result.version,
    levelOfHelp: result.assessment.level_of_help ?? "controlled request",
    overallResult: result.result_summary.overall_result.result,
    remarksReturned:
      result.assessment.remarks !== undefined &&
      Object.keys(result.assessment.remarks).length > NO_REMARKS,
  }),
);
