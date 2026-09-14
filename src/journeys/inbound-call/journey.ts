import {journey} from "@ministryofjustice/hmpps-forge/core/authoring";
import { whosCallingStep } from "./steps/whosCallingStep.js";

// Define the journey
export const inboundCallJourney = journey({
    code: "inboundCallJourney",
    title: "Inbound Call Journey",
    path: "/receive-call",
    view: {
        template: "partials/form-step",
    },
    steps: [whosCallingStep],
});