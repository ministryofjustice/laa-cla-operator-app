import {
  GovUKButton,
  GovUKDateInputFull,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { step, submit } from "@ministryofjustice/hmpps-forge/core/authoring";
import { InboundCallEffects } from "#src/journeys/effects.js";
import { requireSilasAuth } from "#src/journeys/auth.js";

export const SEARCH_CLIENT_STEP_CODE = "search-client";

export const searchClientStep = step({
    code: SEARCH_CLIENT_STEP_CODE,
    path: "/search-client",
    title: "Search client's details",
    onAccess: [requireSilasAuth],
    reachability: { entryWhen: true },
    view: { template: "main/search-client.njk" },
    blocks: [
    GovUKTextInput({
      code: "fullName",
      label: {
        text: "What's your name?",
        classes: "govuk-label--s",
      },
    }),
    GovUKTextInput({
      code: "phone",
      label: {
        text: "What's your phone number?",
        classes: "govuk-label--s",
      },
      hint: {
        text: "If the client is uncomfortable sharing their number, explain they'll only be contacted when it is safe and convenient to do so.",
      },
    }),

    GovUKTextInput({
      code: "postcode",
      label: {
        text: "What's your postcode?",
        classes: "govuk-label--s",
      },
    }),

    GovUKDateInputFull({
      code: "dateOfBirth",
      fieldset: {
        legend: {
          text: "What's your date of birth?",
          classes: "govuk-fieldset__legend--s",
        },
      },
      hint: {
        text: "For example, 27 3 2007",
      },
    }),

    GovUKButton({
      text: "Search",
    }),
  ],
  onSubmission: [
      submit({
          validate: true,
          onValid: {
            effects: [InboundCallEffects.SearchClientDetails()],
          },
      }),
  ],
})