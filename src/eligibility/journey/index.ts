import {
  createForgePackage,
  journey,
  access,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import { EligibilityEffectsRegistry, EligibilityConditionsRegistry } from "../registries/index.js";
import { EligibilityEffects } from "../registries/effects.js";

export interface CreateEligibilityPackageOptions {
  path: string;
  onAccess?: unknown[];
  checkId?: unknown;
  presetAnswers?: Record<string, unknown>;
  onComplete?: unknown;
  template?: { layout: string };
}

export function createEligibilityPackage(options: CreateEligibilityPackageOptions) {
  const eligibilityJourney = journey({
    code: "eligibility",
    title: "Financial Eligibility Check",
    path: options.path,
    onAccess: [
      access({
        effects: [EligibilityEffects.LoadAnswers()],
      }),
    ],
    view: options.template ? { template: options.template.layout } : undefined,
    steps: [],
  });

  return createForgePackage<EligibilityDeps>({
    journey: eligibilityJourney,
    functions: [EligibilityEffectsRegistry, EligibilityConditionsRegistry],
  });
}
