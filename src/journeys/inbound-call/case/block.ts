import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKSummaryList,
  SummaryListRow,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  ChainableRef,
  Data,
  Condition,
  Format,
  ChainableGenerator,
  TransformerFunctionExpr,
  Transformer,
} from "@ministryofjustice/hmpps-forge/core/authoring";

import { Transformers } from "#src/journeys/transformers.js";
import { MOJSubNavigation } from "@ministryofjustice/hmpps-forge/moj-components";

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

const toRows = ({
  label,
  value,
  valueKey = "text",
  link,
  transformer,
}: {
  label: string;
  value: ChainableRef;
  valueKey?: "text" | "html";
  link: string | ChainableGenerator;
  transformer?: TransformerFunctionExpr;
}): SummaryListRow[] => {
  return [
    {
      key: { text: label },
      value: { [valueKey]: transformer ? value.pipe(transformer) : value },
      actions: {
        items: [
          {
            text: "Change",
            href: link,
            visuallyHiddenText: label.toLowerCase(),
          },
        ],
      },
      visibleWhen: value.match(Condition.IsRequired()),
    },
    {
      key: { text: label },
      value: {
        html: Format(
          `<a href="%1" class="govuk-link">Enter %2</a>`,
          link,
          label.toLowerCase(),
        ),
      }, //`<a href="${link}" class="govuk-link">Enter ${label.toLowerCase()}</a>`
      visibleWhen: value.not.match(Condition.IsRequired()),
    },
  ];
};
const clientDetailsUrl = (section: string) =>
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
