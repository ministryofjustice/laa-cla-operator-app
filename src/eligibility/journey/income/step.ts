import { createAddAnotherStep } from "../add-another-step.js";
import {
  incomeHeadingBlock,
  incomeRowsBlock,
  incomeButtonsBlock,
} from "./block.js";

export const INCOME_STEP_CODE = "income";

export const incomeStep = createAddAnotherStep({
  code: INCOME_STEP_CODE,
  title: "Employment income",
  listKey: "incomes",
  blocks: [incomeHeadingBlock, incomeRowsBlock, incomeButtonsBlock],
});
