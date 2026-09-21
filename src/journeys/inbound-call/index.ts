import { createForgePackage } from "@ministryofjustice/hmpps-forge/core/authoring";
import { inboundCallJourney } from "./journey.js";
import { effects } from "./effects.js";
import { conditionRegistry } from "../auth.js";
import { InboundCallEffectsRegistry } from "../effects.js";
import type { Deps } from "../api.js";

// Package entrypoint for the inbound call journey.
// app.ts registers this package with forge.registerPackage(...).
export default createForgePackage<Deps>({
  journey: inboundCallJourney,
  functions: [conditionRegistry, InboundCallEffectsRegistry, effects],
});
// Add custom functions/components here later if this journey needs them.
