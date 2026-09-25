import {
  journey,
  submit,
  redirect,
  step,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { whosCallingStep } from "./whos-calling/step.js";
import { searchClientStep } from "./search-client/step.js";
import { GovUKButton } from "@ministryofjustice/hmpps-forge/govuk-components";
import { addClientDetailsStep } from "./client-details/step.js";

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
    searchClientStep,
    addClientDetailsStep,
    addClientAddressStep,
  ],
});
