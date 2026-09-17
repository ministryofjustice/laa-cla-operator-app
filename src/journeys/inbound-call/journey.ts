import {
  journey,
  step,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
    GovUKPanel,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { addressLookupStep1, addressLookupStep2 } from "./postcode-lookup-steps.js";
import { whosCallingStep } from "./steps/whosCallingStep.js";


// Step 2: Placeholder for search-client step 
const searchClient = step({
    code: "search-client",
    path: "/search-client",
    title: "Search client's details",
    blocks: [
        GovUKPanel({
            titleText: "Call details recorded",
        }),
    ],
})


// Define the journey
export const inboundCallJourney = journey({
    code: "inboundCallJourney",
    title: "Inbound Call Journey",
    path: "/receive-call",
    view: {
        template: "main/forms/form.njk",
    },
    steps: [whosCallingStep, searchClient, addressLookupStep1, addressLookupStep2],
});