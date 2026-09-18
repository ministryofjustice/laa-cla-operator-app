import { requireSilasAuth } from "#src/journeys/auth.js";
import { step, submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring';
import { whosCallingBlock } from "./whosCallingBlock.js";
import { SEARCH_CLIENT_STEP_CODE } from "../search-client/searchClientStep.js";

export const WHOS_CALLING_CODE = "whos-calling";

export const whosCallingStep = step({
    code: WHOS_CALLING_CODE,
    path: "/",
    title: "Taking calls from clients",
    reachability: { entryWhen: true },
    onAccess: [requireSilasAuth],
    view: { template: "main/index.njk" },
    blocks: [whosCallingBlock],
    onSubmission: [
        submit({
            validate: true,
            onValid: {
                next: [redirect({ goto: SEARCH_CLIENT_STEP_CODE })],
            },
        }),
    ],
})