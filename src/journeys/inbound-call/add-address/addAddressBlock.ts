import { Condition, Self, validation } from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components"
import { GovUKButton, GovUKTextInput, GovUKTextareaInput } from "@ministryofjustice/hmpps-forge/govuk-components"

export const addAddress = CollectionBlock({
    collection: [
        GovUKTextareaInput({
            code: "address-line-1",
            rows: '4',
            classes: 'govuk-input--width-30',
            validWhen: [
                validation({
                    condition: Self().match(Condition.IsRequired()),
                    message: "Address field cannot be blank" 
                })
            ]
        }),
        
        GovUKTextInput({
        code: 'postcode',
        label: { text: 'Postcode (Optional)' },
        classes: 'govuk-input--width-10',
        autocomplete: 'postal-code',
    }),
        GovUKButton({ text: "Use this address" })
    ]
});