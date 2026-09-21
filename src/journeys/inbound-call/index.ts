import { createForgePackage } from "@ministryofjustice/hmpps-forge/core/authoring";
import { inboundCallJourney } from "./journey.js";
import { saveClientDetailsImplementation } from "./effects.js";
import { AuthConditionsImplementation } from "../auth.js";
import { InboundCallEffectsImplementation } from "../effects.js";
import type { Deps } from "../api.js";

// Package entrypoint for the inbound call journey.
// app.ts registers this package with forge.registerPackage(...).
export default createForgePackage<Deps>({
  journey: inboundCallJourney,
  functions: {
    ...AuthConditionsImplementation,
    ...InboundCallEffectsImplementation,
    saveClientDetails: saveClientDetailsImplementation,
  },
});
// Add custom functions/components here later if this journey needs them.
