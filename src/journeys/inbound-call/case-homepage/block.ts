import {
  type ChainableRef,
  Data,
  Condition,
  Format,
  type ChainableGenerator,
  type TransformerFunctionExpr,
  Transformer,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton, GovUKSummaryList, type SummaryListRow, } from "@ministryofjustice/hmpps-forge/govuk-components";
import { MOJSubNavigation } from "@ministryofjustice/hmpps-forge/moj-components";

interface SummaryListRowData {
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
const toRows = (data: SummaryListRowData): SummaryListRow[] => {
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


export const clientHomeBlock = CollectionBlock({
  collection: [
    MOJSubNavigation({
      label: "Case sections",
      // TODO: once sections are built add links to real pages
      items: [
        { text: "Client's details", href: "#details", active: true },
        { text: "Scope", href: "#scope" },
        { text: "Financial eligibility", href: "#eligibility" },
        { text: "Diversity", href: "#diversity" },
        { text: "Refer", href: "#refer" },
        { text: "Case history", href: "#history" },
      ],
    }),
    GovUKButton({ text: "Continue to Scope" }),
  ],
});


export const thirdPartyBlock = CollectionBlock({
  collection: [
    GovUKSummaryList({ 
      card: {title: {text: "Third Party Details"}},
      rows: [
        ...toRows({label: "Name", value: Data("thirdparty.personal_details.full_name"), link: "#",}),
        ...toRows({label: "Phone number", value: Data("thirdparty.personal_details.mobile_phone"), link: "#"}),
        ...toRows({label: "Email address", value: Data("thirdparty.personal_details.email"), link: "#"}),
      ]
    })
  ]
});
