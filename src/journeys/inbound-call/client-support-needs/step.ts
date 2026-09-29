import { requireSilasAuth } from "#src/journeys/auth.js";
import {
  step,
  submit,
  redirect,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { clientSupportNeeds } from "./block.js";
import { InboundCallEffects } from "#src/journeys/effects.js";



export const clientSupport = step({
  code: "client-support",
  title: "Client’s support needs",
  path: "/support-needs",
  reachability: { entryWhen: true },
  onAccess: [requireSilasAuth],
  view: { template: "main/forms/form.njk" }, 
    blocks: [
    clientSupportNeeds,
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.saveClientNeeds()],
        next: [
          redirect({
            goto: "/",
          }),
        ],
      },
    }),
  ],
});