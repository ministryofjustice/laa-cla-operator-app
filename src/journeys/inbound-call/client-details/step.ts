import {
  step,
  submit,
  redirect,
  access,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { InboundCallEffects } from "#src/journeys/effects.js";
import { clientDetailsBlock } from "./block.js";
import { CASE_HOMEPAGE_STEP_PATH } from "../case/step.js";

// Step 3: Add new client if clicked on "Start a new case"
export const addClientDetailsStep = step({
  code: "add-client-details",
  path: "client-details",
  title: "Client's details",
  reachability: { entryWhen: true },
  view: { template: "main/add-client-details.njk" },
  blocks: [clientDetailsBlock],
  onAccess: [
    access({
      effects: [InboundCallEffects.LoadPersonalDetails()],
    }),
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.saveClientDetails()],
        next: [redirect({ goto: CASE_HOMEPAGE_STEP_PATH })],
      },
    }),
  ],
});
