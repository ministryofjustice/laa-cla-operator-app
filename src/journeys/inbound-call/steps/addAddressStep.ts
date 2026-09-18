import { requireSilasAuth } from "#src/journeys/auth.js";
import { step, submit, redirect } from '@ministryofjustice/hmpps-forge/core/authoring';
import { addAddress } from "../blocks/addAddressBlock.js";

export const addAddressStep = step({
    code: "add-address", 
    title: "Enter client’s address", 
    path: "/add-address", 
    reachability: { entryWhen: true },
    onAccess: [requireSilasAuth],
    view: { template: "main/forms/addAddress.njk" },
    blocks: [addAddress],
    onSubmission: [
        submit({
            validate: true,
            onValid: {
                next: [redirect({ goto: "/" })],
            },
        }),
    ],
    

})