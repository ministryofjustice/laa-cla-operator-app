import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import { createAddAnotherStep } from "../add-another-step.js";
import {
  incomeHeadingBlock,
  incomeRowsBlock,
  incomeButtonsBlock,
} from "./block.js";

export const INCOME_STEP_CODE = "income";

export const incomeStep = createAddAnotherStep({
  code: INCOME_STEP_CODE,
  title: eligibilityCopy.employment_income,
  listKey: "incomes",
  blocks: [incomeHeadingBlock, incomeRowsBlock, incomeButtonsBlock],
});
