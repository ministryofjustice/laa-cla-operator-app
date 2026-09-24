import {
  journey,
  step,
  submit,
  redirect,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { GovUKButton } from "@ministryofjustice/hmpps-forge/govuk-components";
import { whosCallingStep } from "./steps/whosCallingStep.js";
import { addClientDetailsStep } from "./steps/clientDetailsStep.js";

// Step 2: Placeholder for search-client step
const searchClient = step({
  code: "search-client",
  path: "/search-client",
  title: "Search client's details",
  reachability: { entryWhen: true },
  view: { template: "main/search-client.njk" },
  blocks: [
    GovUKButton({
      text: "Start a new case using the details entered",
      classes: "govuk-button--secondary",
    }),
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        next: [redirect({ goto: "add-client-details" })],
      },
    }),
  ],
});

// Step 4: Add client Address"
const addClientAddressStep = step({
  code: "add-client-address",
  path: "/add-client-address",
  title: "Search client's address",
  reachability: { entryWhen: true },
  view: { template: "main/add-client-address.njk" },
  blocks: [GovUKButton({ text: "Find address" })],
  onSubmission: [
    submit({
      validate: false,
      onValid: {
        next: [redirect({ goto: "search-client" })],
      },
    }),
  ],
});

// Define the journey
export const inboundCallJourney = journey({
  code: "inboundCallJourney",
  title: "Inbound Call Journey",
  path: "/receive-call",
  view: {
    template: "partials/form-step",
  },
  steps: [
    whosCallingStep,
    searchClient,
    addClientDetailsStep,
    addClientAddressStep,
  ],
});
