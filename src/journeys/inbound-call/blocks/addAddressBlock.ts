import { Condition, Self, validation } from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components"
import { GovUKButton, GovUKTextInput } from "@ministryofjustice/hmpps-forge/govuk-components"

export const addAddress = CollectionBlock({
    collection: [

        GovUKTextInput({
            code: 'address-line-1',
            label: { text: 'Address line 1' },
            classes: 'govuk-input--width-20',
            validWhen: [
                validation({
                    condition: Self().match(Condition.IsRequired()),
                    message: "Enter address line 1"
                }),
            ],
        }),

        GovUKTextInput({
            code: 'address-line-2',
            label: { text: 'Address line 2 (optional)' },
            classes: 'govuk-input--width-20'
        }),

        GovUKTextInput({
            code: 'town-or-city',
            label: { text: 'Town or city' },
            classes: 'govuk-input--width-20',
            validWhen: [
                validation({
                    condition: Self().match(Condition.IsRequired()),
                    message: "Enter a town or city"
                }),
            ],
        }),

        GovUKTextInput({
            code: 'country',
            label: { text: 'Country' },
            classes: 'govuk-input--width-20',
            validWhen: [
                validation({
                    condition: Self().match(Condition.IsRequired()),
                    message: "Enter a country"
                }),
            ],
        }),

        GovUKTextInput({
        code: 'postcode',
        label: { text: 'Postcode' },
        classes: 'govuk-input--width-10',
        autocomplete: 'postal-code',
        validWhen: [
            validation({
                condition: Self().match(Condition.IsRequired()),
                message: "Enter a postcode"
            }),
            validation({
                condition: Self().match(Condition.Address.IsValidPostcode()),
                message: "Enter a full UK postcode, like AA1 1AA"
            }),
        ],
    }),
        GovUKButton({ text: "Use this address" })
    ]
});