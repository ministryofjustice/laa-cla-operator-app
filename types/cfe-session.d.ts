import type { CfeAssessmentResponse } from "#src/services/cfeClient.js";

declare module "express-session" {
  interface Session {
    syntheticCfeAssessment?: CfeAssessmentResponse;
    syntheticCfeDemoError?: string;
  }
}
