import { requireSilasAuth } from "#src/journeys/auth.js";
import {
  step,
  submit,
  redirect,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { InboundCallEffects } from "#src/journeys/effects.js";
import { clientDetailsBlock } from "./block.js";
import { ADDRESS_LOOKUP_STEP_CODE } from "../postcode-lookup/step.js";

// Step 3: Add new client if clicked on "Start a new case"
export const addClientDetailsStep = step({
  code: "add-client-details",
  path: "/add-client-details",
  title: "Client's details",
  reachability: { entryWhen: true },
  onAccess: [requireSilasAuth],
  view: { template: "main/add-client-details.njk" },
  blocks: [clientDetailsBlock],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.saveClientDetails()],
        next: [redirect({ goto: ADDRESS_LOOKUP_STEP_CODE })],
      },
    }),
  ],
});
