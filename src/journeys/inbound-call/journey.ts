import { hasValidSilasToken } from "#src/middleware/apiMiddleware.js";
import {
  journey,
  step,
  submit,
  redirect,
  access,Session, Condition, ConditionRegistry
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  GovUKButton,
  GovUKRadioInput,
    GovUKPanel,
} from "@ministryofjustice/hmpps-forge/govuk-components";



export const myConditions = new ConditionRegistry()

export const MyConditions = {
  /**
   * Checks that a numeric value meets the minimum score threshold.
   * @param minScore - The minimum value required for eligibility.
   */
  HasValidSilasToken: myConditions.register(
    'HasValidSilasToken',
    (deps) => hasValidSilasToken
  )
}

// Step 1: Who's calling
const whosCallingStep = step({
    code: "whos-calling",
    path: "/",
    title: "Taking calls from clients",
    reachability: { entryWhen: true },
    onAccess: [
        access({
            when: Session("silasAuth").not.match(MyConditions.HasValidSilasToken()),
            next: [redirect({goto: "/login"})]
        })
    ],
    view: { template: "main/index.njk" },
    blocks: [
        GovUKRadioInput({
            code: "whos-calling",
            fieldset: { legend: { text: "Are you calling on behalf of yourself or another person?", classes: "govuk-fieldset__legend--m" } },
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
})

// Step 2: Placeholder for search-client step 
const searchClient = step({
    code: "search-client",
    path: "/search-client",
    title: "Search client's details",
    view: { template: "main/search-client.njk" },
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
        template: "partials/form-step",
    },
    steps: [whosCallingStep, searchClient],
});