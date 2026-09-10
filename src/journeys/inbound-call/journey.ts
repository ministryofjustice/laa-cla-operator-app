import {
  journey,
  step,
  submit,
  redirect,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  GovUKButton,
  GovUKRadioInput,
  GovUKTextInput,
  GovUKDateInputFull,
  GovUKHeading,
  GovUKBody,
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

// Step 3: Add new client if clicked on "Start a new case"
const addClientDetailsStep = step({
  code: "add-client-details",
  path: "/add-client-details",
  title: "Add new client",
  reachability: { entryWhen: true },
  view: { template: "main/add-client-details.njk" },
  blocks: [
    GovUKHeading({ text: "Client's details", size: "m" }),

    GovUKTextInput({
      code: "fullName",
      label: { text: "Name", classes: "govuk-label--s" },
    }),

    GovUKDateInputFull({
      code: "dateOfBirth",
      fieldset: {
        legend: {
          text: "What's your date of birth?",
          classes: "govuk-fieldset__legend--s",
        },
      },
      hint: { text: "For example, 27 3 2007" },
    }),

    GovUKHeading({ text: "Client's contact details", size: "m" }),

    GovUKTextInput({
      code: "phoneNumber",
      label: { text: "Phone number", classes: "govuk-label--s" },
    }),

    GovUKRadioInput({
      code: "safeToCall",
      fieldset: {
        legend: {
          text: "Is it safe to call this number?",
          classes: "govuk-fieldset__legend--s",
        },
      },
      items: [
        { value: "yes", text: "Yes" },
        { value: "no", text: "No" },
      ],
    }),

    GovUKRadioInput({
      code: "safeToLeaveMessage",
      fieldset: {
        legend: {
          text: "Is it safe to leave a message?",
          classes: "govuk-fieldset__legend--s",
        },
      },
      items: [
        { value: "yes", text: "Yes" },
        { value: "no", text: "No" },
      ],
    }),

    GovUKRadioInput({
      code: "acceptsWithheldCalls",
      fieldset: {
        legend: {
          text: "If safe to call, does your phone accept calls from a withheld number?",
          classes: "govuk-fieldset__legend--s",
        },
      },
      hint: {
        text: "When we call you back, our number will not display and your phone may show 'No Caller ID', 'Private number' or 'Number withheld'. Call screening settings mean some phones do not accept withheld numbers.",
        classes: "govuk-!-margin-top-2",
      },
      items: [
        {
          value: "yes",
          text: "Yes",
          block: GovUKBody({
            text: "Prompt the client to add Civil Legal Advice as a contact using 0345 345 4345 'just in case'",
            classes: "govuk-!-margin-top-2",
          }),
        },
        {
          value: "no",
          text: "No",
          block: [
            GovUKBody({
              text: "We will try to call you back 3 times but if we can't get through you will have to contact us again to continue your case.",
            }),
            GovUKBody({
              text: "Prompt the client to adjust the settings on their phone or add Civil Legal Advice as a contact using 0345 345 4345.",
              classes: "govuk-!-margin-top-2",
            }),
          ],
        },
      ],
    }),

    GovUKTextInput({
      code: "email",
      label: { text: "Email (optional)", classes: "govuk-label--s" },
      inputType: "email",
    }),

    GovUKButton({ text: "Save and continue" }),
  ],
  onSubmission: [
    submit({
      validate: false,
      onValid: {
        next: [redirect({ goto: "add-client-address" })],
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
