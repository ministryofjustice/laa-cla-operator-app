import { createForgePackage } from "@ministryofjustice/hmpps-forge/core/authoring";
import { inboundCallJourney,myConditions } from "./journey.js";

// Package entrypoint for the inbound call journey.
// app.ts registers this package with forge.registerPackage(...).
export default createForgePackage({
  journey: inboundCallJourney,
  functions: myConditions
});
// Add custom functions/components here later if this journey needs them.
