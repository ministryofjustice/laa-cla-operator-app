import { Condition, Self, validation } from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components"
import { GovUKButton, GovUKRadioInput } from "@ministryofjustice/hmpps-forge/govuk-components"

export const addAddress = CollectionBlock({
    collection: [

            GovUKButton({ text: "Continue" })
    ]
});