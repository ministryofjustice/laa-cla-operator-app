import { hasValidSilasToken } from "#src/middleware/apiMiddleware.js";
import {
  journey,
  step,
  submit,
  redirect,
  access,Session, ConditionRegistry,
  validation,
  Condition,
  Self,
  Answer,
  Post
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  GovUKButton,
  GovUKRadioInput,
  GovUKPanel,
  GovUKTextInput,
  GovUKUtilityClasses,
  GovUKHeading,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'



export const conditionRegistry = new ConditionRegistry()

export const CustomConditions = {
  /**
   * Check user has a valid silas token.
   */
  HasValidSilasToken: conditionRegistry.register(
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
            when: Session("silasAuth").not.match(CustomConditions.HasValidSilasToken()),
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

const addressLookupStep1 = step({
    code: "address-lookup",
    path: "address-lookup",
    title: "Search client's address",
    reachability: { entryWhen: true },
    blocks: [
        GovUKHeading({
            text: "Find an address", size:"m"
        }),
        GovUKTextInput( {
            code: "postcode",
            hint: "For example, AA3 1AB.",
            autocomplete: "postal-code",
            "label" : {
                "text": "Postcode",
                "classes": GovUKUtilityClasses.Label.Small,
            },
            validWhen: [
                validation({
                    condition: Self().match(Condition.IsRequired()),
                    message: "You must enter a valid postcode"
                }),
                validation({
                    condition: Self().match(Condition.String.HasMaxLength(12)),
                    message: "You must enter a valid postcode",
                })
            ],
        }),
        GovUKTextInput( {
            code: "building ",
            hint: "For example, 15 or Prospect Cottage",
            "label" : {
                "text": "Building number or name",
                "classes": GovUKUtilityClasses.Label.Small,
            },
            validWhen: [
                validation({
                    condition: Self().match(Condition.IsRequired()),
                    message: "You must enter a valid building number or name"
                }),
            ]
        }),
        GovUKButton({
            text: "Find address",
            value: "step1"
        }),
        HtmlBlock({
            content: "<p class='govuk-body'><a href='#' class='govuk-link govuk-link--no-underline'>Enter address manually</a></p>",
        }),
    ],
    onSubmission: [
        submit({
            validate: true,
            onValid: {next: [redirect({goto: "address-lookup/select"})]}
        }),
    ]
})

const addressLookupStep2 = step({
    code: "address-lookup-select",
    path: "address-lookup/select",
    title: "Search client's address",
    reachability: { entryWhen: true },
    blocks: [
        GovUKHeading({
            text: "Find an address", size:"m"
        }),
        GovUKButton({
            text: "Use this address",
        }),
        HtmlBlock({
            content: "<p class='govuk-body'><a href='#' class='govuk-link govuk-link--no-underline'>Enter address manually</a></p>",
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
        template: "main/forms/form.njk",
    },
    steps: [whosCallingStep, searchClient, addressLookupStep1, addressLookupStep2],
});