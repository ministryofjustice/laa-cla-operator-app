import eligibilityCopy from "../locales/en.json" with { type: "json" };
import { step } from "@ministryofjustice/hmpps-forge/core/authoring";
import { cannotUseServiceBlock } from "./cannot-use-service-blocks.js";

export const CANNOT_USE_SERVICE_STEP_CODE = "cannot_use_service";

export const cannotUseServiceStep = step({
  code: CANNOT_USE_SERVICE_STEP_CODE,
  path: "/cannot-use-service",
  title: eligibilityCopy.cannot_use_this_service,
  view: { template: "main/eligibility/step.njk" },
  blocks: [cannotUseServiceBlock],
});
