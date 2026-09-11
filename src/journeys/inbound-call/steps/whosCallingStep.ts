import {
  GovUKButton,
  GovUKRadioInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { requireSilasAuth } from "#src/journeys/auth.js";
import { step, submit, redirect, validation, Self, Answer, 
    Condition, Transformer,and, or, not, } from '@ministryofjustice/hmpps-forge/core/authoring';
import { SEARCH_CLIENT_STEP_CODE } from "./searchClientStep.js";

const STEP_CODE = "whos-calling";

export const whosCallingStep = step({
    code: STEP_CODE,
    path: "/",
    title: "Taking calls from clients",
    reachability: { entryWhen: true },
    onAccess: [requireSilasAuth],
    view: { template: "main/index.njk" },
    blocks: [
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
        GovUKButton({ text: "Continue" }),
    ],
    onSubmission: [
        submit({
            validate: true,
            onValid: {
                next: [redirect({ goto: SEARCH_CLIENT_STEP_CODE })],
            },
        }),
    ],
})