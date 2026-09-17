import inboundCallPackage from './inbound-call/index.js';
import addAddress from './add-address/index.js';

type JourneyPackage = typeof inboundCallPackage;

const journeyPackages: JourneyPackage[] = [inboundCallPackage, addAddress];

export default journeyPackages;