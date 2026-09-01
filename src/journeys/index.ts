import inboundCallPackage from './inbound-call/index.js';
import signInPackage from './sign-in/index.js';

type JourneyPackage = typeof inboundCallPackage | typeof signInPackage;
const journeyPackages: JourneyPackage[] = [inboundCallPackage, signInPackage];

export default journeyPackages;