import {
  dashboardJourneyPackage,
  inboundCallJourneyPackage,
  caseJourneyPackage,
} from "./inbound-call/index.js";
import { createEligibilityJourneyPackage } from "./eligibility-host/index.js";

type JourneyPackage = typeof inboundCallJourneyPackage;

const journeyPackages: JourneyPackage[] = [
  dashboardJourneyPackage,
  inboundCallJourneyPackage,
  caseJourneyPackage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Type mismatch between EligibilityDeps and main Deps; casting to unblock compilation
  createEligibilityJourneyPackage() as any,
];

export default journeyPackages;
