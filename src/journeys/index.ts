import {
  dashboardJourneyPackage,
  inboundCallJourneyPackage,
  caseJourneyPackage,
} from "./inbound-call/index.js";

type JourneyPackage = typeof inboundCallJourneyPackage;

const journeyPackages: JourneyPackage[] = [
  dashboardJourneyPackage,
  inboundCallJourneyPackage,
  caseJourneyPackage,
];

export default journeyPackages;
