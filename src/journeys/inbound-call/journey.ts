import {
  journey,
  access,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { whosCallingStep } from "./whos-calling/step.js";
import { searchClientStep } from "./search-client/step.js";
import { addClientDetailsStep } from "./client-details/step.js";
import { InboundCallEffects } from "../effects.js";

import { addAddressStep } from "./add-address/step.js";
import { addressLookupStep1, addressLookupStep2 } from "./address-lookup/step.js";
import { requireSilasAuth } from "../auth.js";

// Define the journey
export const inboundCallJourney = journey({
  code: "inboundCallJourney",
  title: "Inbound Call Journey",
  path: "/receive-call",
  view: {
    template: "main/forms/form.njk",
  },
  steps: [whosCallingStep, searchClientStep],
});

// Define the journey
export const caseJourney = journey({
  code: "case",
  title: "Case",
  path: "/case/:caseId",
  onAccess: [
    requireSilasAuth,
    access({
      effects: [InboundCallEffects.LoadCase()],
    }),
  ],
  steps: [addClientDetailsStep, addAddressStep, addressLookupStep1, addressLookupStep2],
});
