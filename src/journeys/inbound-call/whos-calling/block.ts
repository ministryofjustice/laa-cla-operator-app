import { Condition, Self, validation } from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components"
import { GovUKButton, GovUKRadioInput } from "@ministryofjustice/hmpps-forge/govuk-components"



export const whosCallingBlock = CollectionBlock({
    collection: [
        GovUKRadioInput({
                    code: "whos-calling",
                    fieldset: { legend: { text: "Are you calling on behalf of yourself or another person?", classes: "govuk-fieldset__legend--m" } },
                    items: [
                        { value: "myself", text: "Myself" },
                        { value: "thirdParty", text: "Another person" },
                    ],
                    validWhen: [validation({
                        condition: Self().match(Condition.IsRequired()),
                        message: "Please select whether you are calling on behalf of yourself or another person."
                        }),
                    ], 
                }),
        GovUKButton({ text: "Continue" })
    ]
});