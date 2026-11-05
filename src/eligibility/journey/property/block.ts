import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKRadioInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import type { ResolvableString } from "@ministryofjustice/hmpps-forge/core/components";
import {
  Data,
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";

const PROPERTY_OPTIONS = [
  {
    value: "with_mortgage",
    text: eligibilityCopy.yes_with_a_mortgage_or_loan,
  },
  {
    value: "shared_ownership",
    text: eligibilityCopy.yes_through_a_shared_ownership_scheme,
  },
  {
    value: "outright",
    text: eligibilityCopy.yes_owned_outright,
  },
  {
    value: "none",
    text: eligibilityCopy.no,
  },
];

export function createPropertyOwnershipBlock(
  code: string,
  legend: ResolvableString,
  errorMessage: string,
  summaryLabel: string,
) {
  return CollectionBlock({
    collection: [
      GovUKRadioInput({
        code,
        metadata: { summaryLabel },
        fieldset: {
          legend: {
            text: legend,
            classes: "govuk-fieldset__legend--l",
            isPageHeading: true,
          },
        },
        items: PROPERTY_OPTIONS,
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: errorMessage,
          }),
        ],
      }),
      GovUKButton({ text: eligibilityCopy.continue }),
    ],
  });
}

export const propertyBlock = createPropertyOwnershipBlock(
  "property_owned",
  Data("propertyOwnedLegend"),
  eligibilityCopy.dynamic.propertyOwnership.required,
  eligibilityCopy.dynamic.propertyOwnership.summaryLabel,
);
