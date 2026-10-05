import { requireSilasAuth } from "#src/journeys/auth.js";
import {
  step,
  submit,
  redirect,
  Data,
  Condition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { adaptationDetailsNeed } from "./block.js";
import { InboundCallEffects } from "#src/journeys/effects.js";

export const adaptationDetails = step({
  code: "client-support",
  title: "Client’s support needs",
  path: "/adaptation-details",
  reachability: { entryWhen: true },
  onAccess: [requireSilasAuth],
  view: { template: "main/forms/form.njk" },
  blocks: [adaptationDetailsNeed],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.adaptationDetails()],
        next: [
          redirect({
            when: Data("adoptionDetailsSaved").match(Condition.Equals(true)),
            goto: "/",
          }),
        ],
      },
    }),
  ],
});
