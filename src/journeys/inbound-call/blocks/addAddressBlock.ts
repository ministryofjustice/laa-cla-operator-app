import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components"
import { GovUKButton, GovUKTextInput, GovUKAccordion} from "@ministryofjustice/hmpps-forge/govuk-components"

export const addAddress = CollectionBlock({
    collection: [

            GovUKTextInput({
            code: 'address-line-1',
            label: { text: 'Address line 1' },
             classes: 'govuk-input--width-20'
    
            }),
            GovUKTextInput(
                { code: 'Address-line -2 ',
                     label: 
                     { text: 'Address line 2 (optional) ' },
                     classes: 'govuk-input--width-20'
                    }),

            GovUKTextInput(
                { code: 'town-or-city ',
                     label: 
                     { text: 'Town or city' },
                      classes: 'govuk-input--width-20'
                    
                },),
            GovUKTextInput(
                { code: 'country',
                     label: 
                     { text: 'Country' },
                      classes: 'govuk-input--width-20'
                    
                },),

            GovUKTextInput(
                { code: 'postcode ',
                     label: { text: 'Postcode' } ,
                      classes: 'govuk-input--width-10'
                    }),

            GovUKButton(
                { text: "Use this address" }
            )
    ]
});