import { Condition, Self, validation } from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components"
import { GovUKButton, GovUKTextInput, GovUKTextareaInput } from "@ministryofjustice/hmpps-forge/govuk-components"

export const clientNeeds = CollectionBlock({
    collection: [
     
        
    GovUKButton({ text: "Use this address" })
    ]
});