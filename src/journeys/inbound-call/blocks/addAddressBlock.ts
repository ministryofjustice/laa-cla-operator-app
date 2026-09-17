import { Condition, Self, validation } from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components"
import { GovUKButton, GovUKTextInput } from "@ministryofjustice/hmpps-forge/govuk-components"

export const addAddress = CollectionBlock({
    collection: [
            GovUKTextInput(
                { code: 'Address line 1 ',
                 label: { text: 'Address line 1' } }
                ),
            GovUKTextInput(
                { code: 'Address line 2 (optional) ',
                     label: 
                     { text: 'Address line 2 (optional) ' } 
                    }),

            GovUKTextInput(
                { code: 'Town or city ',
                     label: 
                     { text: 'Town or city' } }
                ),

            GovUKTextInput(
                { code: 'Postcode ',
                     label: { text: 'Postcode' } 
                    }),

            GovUKButton(
                { text: "Continue" }
            )
    ]
});