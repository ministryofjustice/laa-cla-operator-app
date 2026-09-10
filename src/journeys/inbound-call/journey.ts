import {
  journey,
  step,
  submit,
  redirect,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  GovUKButton,
  GovUKRadioInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";

// Step 1: Who's calling
const whosCallingStep = step({
  code: "whos-calling",
  path: "/",
  title: "Taking calls from clients",
  reachability: { entryWhen: true },
  view: { template: "main/index.njk" },
  blocks: [
    GovUKRadioInput({
      code: "whos-calling",
      fieldset: {
        legend: {
          text: "Are you calling on behalf of yourself or another person?",
          classes: "govuk-fieldset__legend--m",
        },
      },
      items: [
        { value: "myself", text: "Myself" },
        { value: "thirdParty", text: "Another person" },
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        next: [redirect({ goto: "search-client" })],
      },
    }),
  ],
});

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

// Step 3: Add new client if click on "Start a new case"
const addClientDetailsStep = step({
  code: "add-client-details",
  path: "/add-client-details",
  title: "Add new client",
  reachability: { entryWhen: true },
  view: { template: "main/add-client-details.njk" },
  blocks: [GovUKButton({ text: "Save and continue" })],
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
  steps: [whosCallingStep, searchClient, addClientDetailsStep],
});
