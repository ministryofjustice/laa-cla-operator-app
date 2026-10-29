import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import { createAddAnotherStep } from "../add-another-step.js";
import { loadBenefitTypesHook } from "../benefit-types-unavailable/hook.js";
import {
  benefitDetailsHeadingBlock,
  benefitDetailsRowsBlock,
  benefitDetailsButtonsBlock,
} from "./block.js";

export const BENEFIT_DETAILS_STEP_CODE = "benefit_details";

export const benefitDetailsStep = createAddAnotherStep({
  code: BENEFIT_DETAILS_STEP_CODE,
  title: eligibilityCopy.benefit_details,
  listKey: "benefits",
  onAccess: [loadBenefitTypesHook(BENEFIT_DETAILS_STEP_CODE)],
  blocks: [
    benefitDetailsHeadingBlock,
    benefitDetailsRowsBlock,
    benefitDetailsButtonsBlock,
  ],
});
