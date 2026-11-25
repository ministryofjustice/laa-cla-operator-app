import type {SummaryListRow} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  type ChainableRef,
  Condition,
  Format,
  type ChainableGenerator,
  type TransformerFunctionExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export interface SummaryListRowData {
  label: string;
  value: ChainableRef;
  valueKey?: "text" | "html";
  link: string | ChainableGenerator;
  transformer?: TransformerFunctionExpr;
}

/**
 * Create summary list rows from the provided data.
 * @param {SummaryListRowData} data - The summary list row data.
 * @returns {SummaryListRow[]} - An array of summary list rows based on the provided data.
 */
export const toRows = (data: SummaryListRowData): SummaryListRow[] => {
  const valueKey = data.valueKey ?? "text";
  return [
    {
      key: { text: data.label },
      value: {
        [valueKey]:
          data.transformer === undefined
            ? data.value
            : data.value.pipe(data.transformer),
      },
      actions: {
        items: [
          {
            text: "Change",
            href: data.link,
            visuallyHiddenText: data.label.toLowerCase(),
          },
        ],
      },
      visibleWhen: data.value.match(Condition.IsRequired()),
    },
    {
      key: { text: data.label },
      value: {
        html: Format(
          `<a href="%1" class="govuk-link">Enter %2</a>`,
          data.link,
          data.label.toLowerCase(),
        ),
      },
      visibleWhen: data.value.not.match(Condition.IsRequired()),
    },
  ];
};