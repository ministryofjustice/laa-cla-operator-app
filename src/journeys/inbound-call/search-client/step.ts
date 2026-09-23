import { step, submit, access, Query, Condition, Post, Format, redirect, Data } from "@ministryofjustice/hmpps-forge/core/authoring";
import { requireSilasAuth } from "#src/journeys/auth.js";
import { displaySearchClientBlock, searchClientBlock, createCaseButtonBlock } from "./block.js";
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
            effects: [InboundCallEffects.SearchCasesPagination()]
        })
    ],
    reachability: { entryWhen: true },
    view: { template: "main/search-client.njk" },
    blocks: [searchClientBlock, createCaseButtonBlock, displaySearchClientBlock],
    onSubmission: [
        submit({
            when: Post("action").match(Condition.Equals("search")),
            validate: true,
            onValid: {
                effects: [InboundCallEffects.SearchCases()]
            },
        }),
        submit({
            when: Post("action").match(Condition.Equals("createCase")),
            validate: false,
            onValid: {
                effects: [InboundCallEffects.CreateCase()],
                // TODO: this is a temporary redirect until the case creation flow is fully implemented
                next: [redirect({ goto: Format("cases/%1", Data("createdCaseRef")) })]
            },
        })
    ],
})