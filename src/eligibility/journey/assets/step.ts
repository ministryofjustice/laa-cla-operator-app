import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import { createAddAnotherStep } from "../add-another-step.js";
import { BANK_ACCOUNTS_LIST } from "../../lists/index.js";
import { clientAssetsBlocks } from "./block.js";

export const ASSETS_STEP_CODE = "assets";

export const assetsStep = createAddAnotherStep({
  code: ASSETS_STEP_CODE,
  title: eligibilityCopy.assets,
  listKey: BANK_ACCOUNTS_LIST.key,
  blocks: clientAssetsBlocks,
});
