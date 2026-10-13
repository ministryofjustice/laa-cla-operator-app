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
  createEligibilityJourneyPackage(),
];

export default journeyPackages;
