import { createEligibilityPackage } from "#src/eligibility/index.js";
import { Params, Format } from "@ministryofjustice/hmpps-forge/core/authoring";
import { requireSilasAuth } from "../auth.js";

/**
 * Create the eligibility journey package for mounting under /case/:caseId/eligibility
 * Dependencies (assessor, resultHandler, answerStore) are injected by cla-operator-app
 */
export function createEligibilityJourneyPackage() {
  return createEligibilityPackage({
    path: "/case/:caseId/eligibility",
    onAccess: [requireSilasAuth],
    checkId: Params("caseId"),
    onComplete: Format("/case/%1", Params("caseId")),
    template: { layout: "layouts/operator.njk" },
  });
}
