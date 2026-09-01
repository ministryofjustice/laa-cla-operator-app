import inboundCallPackage from './inbound-call/index.js';

type JourneyPackage = typeof inboundCallPackage;

const journeyPackages: JourneyPackage[] = [inboundCallPackage];

export default journeyPackages;
