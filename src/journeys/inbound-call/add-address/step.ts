import { requireSilasAuth } from "#src/journeys/auth.js";
import { InboundCallEffects } from "#src/journeys/effects.js";
import {
  step,
  submit,
  redirect,
  Data,
  Condition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { addAddress } from "./block.js";

export const addAddressStep = step({
  code: "add-address",
  title: "Enter client’s address manually",
  path: "/add-address",
  reachability: { entryWhen: true },
  onAccess: [requireSilasAuth],
  view: { template: "main/forms/form.njk" },
  blocks: [addAddress],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.SaveClientAddress()],
        next: [
          redirect({
            when: Data("addressSaved").match(Condition.Equals(true)),
            goto: "/",
          }),
        ],
      },
    }),
  ],
});
