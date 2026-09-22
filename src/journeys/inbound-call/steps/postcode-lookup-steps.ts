import {
  step,
  submit,
  redirect,
  validation,
  Condition,
  Self,
  Data,
  access,
  Item,
  Iterator,
  Session
} from "@ministryofjustice/hmpps-forge/core/authoring";

import {
  GovUKButton,
  GovUKRadioInput,
  GovUKTextInput,
  GovUKUtilityClasses,
  GovUKHeading
} from "@ministryofjustice/hmpps-forge/govuk-components";

import { HtmlBlock } from '@ministryofjustice/hmpps-forge/core/components'
import { InboundCallEffects } from "#src/journeys/effects.js";
import { requireSilasAuth } from "#src/journeys/auth.js";

export const addressLookupStep1 = step({
    code: "address-lookup",
    path: "address-lookup",
    title: "Search client's address",
    // onAccess: [requireSilasAuth],
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
            code: "building",
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
            onValid: {
                effects: [InboundCallEffects.saveToSession()],
                next: [redirect({goto: "address-lookup/select"})]
            }
        }),
    ]
})

export const addressLookupStep2 = step({
    code: "address-lookup-select",
    path: "address-lookup/select",
    title: "Search client's address",
    reachability: { entryWhen: true},
    view: {
        template: "main/forms/lookup-address-select-form.njk"
    },
    onAccess: [
        // requireSilasAuth,
        access({
            effects: [InboundCallEffects.postcodeLookup()]
        })
    ],
    blocks: [
        GovUKRadioInput({
            code: 'address',
            label: '',
            // items is declared as items: (GovUKRadioInputItem | GovUKRadioInputDivider)[];
            // but forge does not export the definition GovUKRadioInputItem and GovUKRadioInputDivider
            items: Data('lookup.result').each(
                Iterator.Map({
                    value: Item().path('uprn'),
                    text: Item().path('address'),
                }),
            ) as any
        }),
        GovUKButton({
            text: "Use this address",
            value: "step2"
        }),
        HtmlBlock({
            content: `
            <p class='govuk-body'><h3 class='govuk-heading-m'>Address not found</h3></p>
            <p class='govuk-body-s'>If your address was not found, try a different search or enter the address manually <a href='#' class='govuk-link govuk-link--no-underline'>Enter address manually</a></p>",
            `
        }),
    ],
    onSubmission: [
        submit({
            validate: true,
            onValid: {
                effects: [InboundCallEffects.saveAddressLookup()],
                // next: [redirect({goto: "address-lookup/select"})]
            }
        })
    ]
})
