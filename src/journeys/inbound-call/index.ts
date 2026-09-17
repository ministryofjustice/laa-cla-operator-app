import { createForgePackage } from "@ministryofjustice/hmpps-forge/core/authoring";
import { inboundCallJourney,conditionRegistry } from "./journey.js";
import { myEffects } from "./address-lookup-steps.js";

// Package entrypoint for the inbound call journey.
// app.ts registers this package with forge.registerPackage(...).
export default createForgePackage({
  journey: inboundCallJourney,
  functions: [conditionRegistry, myEffects]
});
// Add custom functions/components here later if this journey needs them.
