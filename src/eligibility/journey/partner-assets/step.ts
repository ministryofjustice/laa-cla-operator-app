import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import { createAddAnotherStep } from "../add-another-step.js";
import { PARTNER_BANK_ACCOUNTS_LIST } from "../../lists/index.js";
import { partnerAssetsBlocks } from "../assets/block.js";

export const PARTNER_ASSETS_STEP_CODE = "partner_assets";

export const partnerAssetsStep = createAddAnotherStep({
  code: PARTNER_ASSETS_STEP_CODE,
  title: eligibilityCopy.partner_assets,
  listKey: PARTNER_BANK_ACCOUNTS_LIST.key,
  blocks: partnerAssetsBlocks,
});
