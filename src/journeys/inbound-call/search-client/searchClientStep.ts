import { step, submit, access, Query, Condition } from "@ministryofjustice/hmpps-forge/core/authoring";
import { requireSilasAuth } from "#src/journeys/auth.js";
import { displaySearchClientBlock, searchClientBlock, createCaseButtonBlock } from "./searchClientBlock.js";
import { InboundCallEffects } from "#src/journeys/effects.js";

export const SEARCH_CLIENT_STEP_CODE = "search-client";

export const searchClientStep = step({
    code: SEARCH_CLIENT_STEP_CODE,
    path: "/search-client",
    title: "Search client's details",
    onAccess: [
        requireSilasAuth,
        access({
            when: Query("page").match(Condition.IsRequired()),
            effects: [InboundCallEffects.SearchCasePagination()]
        })
    ],
    reachability: { entryWhen: true },
    view: { template: "main/search-client.njk" },
    blocks: [searchClientBlock, createCaseButtonBlock, displaySearchClientBlock],
    onSubmission: [
        submit({
            validate: true,
            onValid: {
                effects: [InboundCallEffects.SearchCase()]
            },
        }),
    ],
})