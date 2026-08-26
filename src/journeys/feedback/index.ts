import { createForgePackage } from "@ministryofjustice/hmpps-forge/core/authoring";
import { feedbackJourney } from "./journey.js";

// Package entrypoint for the feedback journey.
// app.ts registers this package with forge.registerPackage(...).
export default createForgePackage({
  journey: feedbackJourney,
});
// Add custom functions/components here later if this journey needs them.
