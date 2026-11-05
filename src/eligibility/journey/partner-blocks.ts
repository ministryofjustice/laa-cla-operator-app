// The partner's income steps are the client's, asked about the partner and
// saved under `partner_` answer keys, so they are built from the same
// factories.
import { createEmploymentStatusBlock } from "./employment-status/block.js";
import { createBenefitsBlock } from "./benefits/block.js";
import {
  createIncomeButtonsBlock,
  createIncomeHeadingBlock,
  createIncomeRowsBlock,
} from "./income/block.js";
import {
  createBenefitDetailsButtonsBlock,
  createBenefitDetailsHeadingBlock,
  createBenefitDetailsRowsBlock,
} from "./benefit-details/block.js";
import { createOtherIncomeBlock } from "./other-income/block.js";
import { createOutgoingsBlock } from "./outgoings/block.js";
import { PARTNER } from "./income-subject.js";
import { PARTNER_BENEFITS_LIST, PARTNER_INCOMES_LIST } from "../lists/index.js";

export const partnerEmploymentStatusBlock =
  createEmploymentStatusBlock(PARTNER);

export const partnerIncomeHeadingBlock = createIncomeHeadingBlock(PARTNER);
export const partnerIncomeRowsBlock = createIncomeRowsBlock(
  PARTNER,
  PARTNER_INCOMES_LIST,
);
export const partnerIncomeButtonsBlock = createIncomeButtonsBlock();

export const partnerBenefitsBlock = createBenefitsBlock(PARTNER);

export const partnerBenefitDetailsHeadingBlock =
  createBenefitDetailsHeadingBlock(PARTNER);
export const partnerBenefitDetailsRowsBlock = createBenefitDetailsRowsBlock(
  PARTNER,
  PARTNER_BENEFITS_LIST,
);
export const partnerBenefitDetailsButtonsBlock =
  createBenefitDetailsButtonsBlock();

export const partnerOtherIncomeBlock = createOtherIncomeBlock(PARTNER);

export const partnerOutgoingsBlock = createOutgoingsBlock(PARTNER);
