import eligibilityCopy from "../locales/en.json" with { type: "json" };
import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { Answers } from "../domain/logic.js";
import { DEPENDANT_MONTHLY_INCOME_LIMIT } from "../domain/dependant-income-limits.js";
import { DEPENDANT_INCOMES_LIST } from "../lists/index.js";
import { canAddRows } from "../lists/add-another.js";

/**
 * Publish dependant copy, the income ceiling and list availability.
 * @param {EffectFunctionContext} context - the effect context
 * @param {Answers} answers - saved journey answers
 * @param {boolean} hasPartner - whether the client has a partner
 */
export function publishDependantsFormData(
  context: EffectFunctionContext,
  answers: Answers,
  hasPartner: boolean,
): void {
  const { dynamic } = eligibilityCopy;
  const { dependants: wording } = dynamic;
  const partnerCopy = [
    [
      "dependantDetailsLegend",
      wording.detailsLegendWithoutPartner,
      wording.detailsLegendWithPartner,
    ],
    [
      "childDependantsLegend",
      wording.childLegendWithoutPartner,
      wording.childLegendWithPartner,
    ],
    [
      "adultDependantsLegend",
      wording.adultLegendWithoutPartner,
      wording.adultLegendWithPartner,
    ],
    [
      "childDependantsDetailsHtml",
      wording.childDetailsHtmlWithoutPartner,
      wording.childDetailsHtmlWithPartner,
    ],
    [
      "adultDependantsDetailsHtml",
      wording.adultDetailsHtmlWithoutPartner,
      wording.adultDetailsHtmlWithPartner,
    ],
  ] as const;

  for (const [key, withoutPartner, withPartner] of partnerCopy) {
    context.setData(key, hasPartner ? withPartner : withoutPartner);
  }
  context.setData("dependantIncomeLimit", DEPENDANT_MONTHLY_INCOME_LIMIT);
  context.setData(
    "dependantIncomeCanAddRows",
    canAddRows(DEPENDANT_INCOMES_LIST, answers),
  );
}
