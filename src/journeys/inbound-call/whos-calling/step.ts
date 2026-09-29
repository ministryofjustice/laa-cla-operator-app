import { requireSilasAuth } from "#src/journeys/auth.js";
import { step, submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring';
import { whosCallingBlock } from "./block.js";
import { SEARCH_CLIENT_STEP_CODE } from "../search-client/step.js";
import { InboundCallEffects } from "#src/journeys/effects.js";


export const whosCallingStep = step({
    code: "whos-calling",
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
                effects: [InboundCallEffects.StoreCallerTypeInSession()],
                next: [redirect({ goto: SEARCH_CLIENT_STEP_CODE })],
            },
        }),
    ],
})