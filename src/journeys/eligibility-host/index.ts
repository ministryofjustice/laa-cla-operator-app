import { createEligibilityPackage } from "#src/eligibility/index.js";
import { Params, Format } from "@ministryofjustice/hmpps-forge/core/authoring";

/**
 * Create the eligibility journey package for mounting under /eligibility/:caseId
 * Dependencies (assessor, resultHandler, answerStore) are injected by cla-operator-app
 */
export function createEligibilityJourneyPackage() {
  return createEligibilityPackage({
    path: "/eligibility/:caseId",
    onAccess: [],
    checkId: Params("caseId"),
    onComplete: Format("/case/%1", Params("caseId")),
    template: { layout: "layouts/operator.njk" },
  });
}
