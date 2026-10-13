import { createForgePackage } from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  caseJourney,
  dashboardJourney,
  inboundCallJourney,
} from "./journey.js";
import { InboundCallEffectsRegistry } from "../effects.js";
import type { Deps } from "../api.js";

// Package entrypoint for the inbound call journey.
// app.ts registers this package with forge.registerPackage(...).
export const dashboardJourneyPackage = createForgePackage<Deps>({
  journey: dashboardJourney,
});
export const inboundCallJourneyPackage = createForgePackage<Deps>({
  journey: inboundCallJourney,
  functions: [InboundCallEffectsRegistry],
});
export const caseJourneyPackage = createForgePackage<Deps>({
  journey: caseJourney,
  functions: [InboundCallEffectsRegistry],
});
// Add custom functions/components here later if this journey needs them.
