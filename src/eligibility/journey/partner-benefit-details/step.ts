import { createAddAnotherStep } from "../add-another-step.js";
import { loadBenefitTypesHook } from "../benefit-types-unavailable/hook.js";
import {
  partnerBenefitDetailsHeadingBlock,
  partnerBenefitDetailsRowsBlock,
  partnerBenefitDetailsButtonsBlock,
} from "../partner-blocks.js";

export const PARTNER_BENEFIT_DETAILS_STEP_CODE = "partner_benefit_details";

export const partnerBenefitDetailsStep = createAddAnotherStep({
  code: PARTNER_BENEFIT_DETAILS_STEP_CODE,
  title: "Partner benefit details",
  listKey: "partner_benefits",
  onAccess: [loadBenefitTypesHook(PARTNER_BENEFIT_DETAILS_STEP_CODE)],
  blocks: [
    partnerBenefitDetailsHeadingBlock,
    partnerBenefitDetailsRowsBlock,
    partnerBenefitDetailsButtonsBlock,
  ],
});
