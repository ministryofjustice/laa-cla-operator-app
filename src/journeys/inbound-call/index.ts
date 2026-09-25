import { createForgePackage } from "@ministryofjustice/hmpps-forge/core/authoring";
import { caseJourney, inboundCallJourney } from "./journey.js";
import { conditionRegistry } from "../auth.js";
import { InboundCallEffectsRegistry } from "../effects.js";
import type { Deps } from "../api.js";

// Package entrypoint for the inbound call journey.
// app.ts registers this package with forge.registerPackage(...).
export const inboundCallJourneyPackage =  createForgePackage<Deps>({
  journey: inboundCallJourney,
  functions: [conditionRegistry, InboundCallEffectsRegistry],
});
export const caseJourneyPackage = createForgePackage<Deps>({
  journey: caseJourney,
  functions: [conditionRegistry, InboundCallEffectsRegistry],
});
// Add custom functions/components here later if this journey needs them.
