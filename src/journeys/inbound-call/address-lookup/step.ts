import {
  step,
  submit,
  redirect,
  access,
} from "@ministryofjustice/hmpps-forge/core/authoring";

import { InboundCallEffects } from "#src/journeys/effects.js";
import { requireSilasAuth } from "#src/journeys/auth.js";
import { addressLookupStep1Blocks, addressLookupStep2Blocks } from "./block.js";

export const ADDRESS_LOOKUP_STEP_CODE = "address-lookup";
export const addressLookupStep1 = step({
  code: ADDRESS_LOOKUP_STEP_CODE,
  path: ADDRESS_LOOKUP_STEP_CODE,
  title: "Search client's address",
  onAccess: [requireSilasAuth],
  reachability: { entryWhen: true },
  view: {
    template: "main/forms/address-lookup-form.njk",
  },

  blocks: [addressLookupStep1Blocks],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.SaveToSession()],
        next: [redirect({ goto: "address-lookup/select" })],
      },
    }),
  ],
});

export const addressLookupStep2 = step({
  code: "address-lookup-select",
  path: "address-lookup/select",
  title: "Search client's address",
  reachability: { entryWhen: true },
  view: {
    template: "main/forms/address-lookup-select.njk",
  },
  onAccess: [
    requireSilasAuth,
    access({
      effects: [InboundCallEffects.PostcodeLookup()],
    }),
  ],
  blocks: [addressLookupStep2Blocks],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.SaveAddressLookup()],
      },
    }),
  ],
});
