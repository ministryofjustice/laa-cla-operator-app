import { createAddAnotherStep } from "../add-another-step.js";
import {
  partnerIncomeHeadingBlock,
  partnerIncomeRowsBlock,
  partnerIncomeButtonsBlock,
} from "../partner-blocks.js";

export const PARTNER_INCOME_STEP_CODE = "partner_income";

export const partnerIncomeStep = createAddAnotherStep({
  code: PARTNER_INCOME_STEP_CODE,
  title: "Partner employment income",
  listKey: "partner_incomes",
  blocks: [
    partnerIncomeHeadingBlock,
    partnerIncomeRowsBlock,
    partnerIncomeButtonsBlock,
  ],
});
