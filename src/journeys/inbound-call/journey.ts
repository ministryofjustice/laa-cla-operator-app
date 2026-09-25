import { journey } from "@ministryofjustice/hmpps-forge/core/authoring";
import { whosCallingStep } from "./whos-calling/step.js";
import { searchClientStep } from "./search-client/step.js";
import { addClientDetailsStep } from "./client-details/step.js";
import { addressLookupStep1, addressLookupStep2 } from "./postcode-lookup/step.js";


// Define the journey
export const inboundCallJourney = journey({
  code: "inboundCallJourney",
  title: "Inbound Call Journey",
  path: "/receive-call",
  view: {
    template: "main/forms/form.njk",
  },
  steps: [
    whosCallingStep,
    searchClientStep,
    addClientDetailsStep,
    addressLookupStep1, addressLookupStep2
  ],
});
