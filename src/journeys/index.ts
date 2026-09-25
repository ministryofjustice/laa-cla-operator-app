import {inboundCallJourneyPackage, caseJourneyPackage} from './inbound-call/index.js';

type JourneyPackage = typeof inboundCallJourneyPackage;
console.log("JourneyPackage: ", typeof inboundCallJourneyPackage)

const journeyPackages: JourneyPackage[] = [inboundCallJourneyPackage, caseJourneyPackage];

export default journeyPackages;
