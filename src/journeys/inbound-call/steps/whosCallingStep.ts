import { requireSilasAuth } from "#src/journeys/auth.js";
import { step, submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring';
import { whosCallingBlock } from "../blocks/whosCallingBlock.js";
import { InboundCallEffects } from "#src/journeys/effects.js";

const STEP_CODE = "whos-calling";

export const whosCallingStep = step({
    code: STEP_CODE,
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
                effects: [InboundCallEffects.GetAllCases()],
                next: [redirect({ goto: "/" })],
            },
        }),
    ],
})