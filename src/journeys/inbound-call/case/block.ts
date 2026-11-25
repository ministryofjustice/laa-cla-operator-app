import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKSummaryList,
  type SummaryListRow,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  type ChainableRef,
  Data,
  Condition,
  Format,
  type ChainableGenerator,
  type TransformerFunctionExpr,
  Transformer,
} from "@ministryofjustice/hmpps-forge/core/authoring";

import { Transformers } from "#src/journeys/transformers.js";
import { MOJSubNavigation } from "@ministryofjustice/hmpps-forge/moj-components";
interface SummaryListRowData {
  label: string;
  value: ChainableRef;
  valueKey?: "text" | "html";
  link: string | ChainableGenerator;
  transformer?: TransformerFunctionExpr;
}

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

/**
 * Get Client Details URL for a specific section
 * @param {string} section - The section of the client details to link to.
 * @returns {ChainableGenerator} - The URL for the specified client details section.
 */
const clientDetailsUrl = (section: string): ChainableGenerator =>
  Format("/case/%1/client-details#%2", Data("case.reference"), section);

export const clientHomePersonalDetailsBlock = CollectionBlock({
  collection: [
    GovUKSummaryList({
      card: { title: { text: "Client details" } },
      rows: [
        ...toRows({
          label: "Name",
          value: Data("case.full_name"),
          link: clientDetailsUrl("fullName"),
        }),
        ...toRows({
          label: "Date of Birth",
          value: Data("case.date_of_birth").pipe(
            Transformer.String.ToDate(),
            Transformer.Date.Format("D MMMM YYYY"),
          ),
          link: clientDetailsUrl("dateOfBirth"),
        }),
        ...toRows({
          label: "Phone number",
          value: Data("personalDetails.mobile_phone"),
          link: clientDetailsUrl("phoneNumber"),
        }),
        ...toRows({
          label: "Safe to call",
          value: Data("personalDetails.safe_to_contact"),
          valueKey: "html",
          link: clientDetailsUrl("safeToCall"),
          transformer: Transformers.SafeToCall(),
        }),
        ...toRows({
          label: "Withheld numbers accepted",
          value: Data("personalDetails.announce_call"),
          valueKey: "html",
          link: clientDetailsUrl("acceptsWithheldCalls"),
          transformer: Transformers.WithheldNumbersAccepted(),
        }),
        ...toRows({
          label: "Email address",
          value: Data("personalDetails.email"),
          link: clientDetailsUrl("email"),
        }),
        ...toRows({
          label: "Address",
          value: Data("personalDetails.street"),
          link: clientDetailsUrl("address"),
          transformer: Transformers.Concat(
            ", ",
            Data("personalDetails.postcode"),
          ),
        }),
      ],
    }),
  ],
});
