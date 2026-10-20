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
    text: "Yes, with a mortgage or loan",
  },
  {
    value: "shared_ownership",
    text: "Yes, through a shared ownership scheme",
  },
  {
    value: "outright",
    text: "Yes, owned outright",
  },
  {
    value: "none",
    text: "No",
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
      GovUKButton({ text: "Continue" }),
    ],
  });
}

export const propertyBlock = createPropertyOwnershipBlock(
  "property_owned",
  Data("propertyOwnedLegend"),
  "Select if your client owns the home they live in",
  "Does your client own the home they usually live in?",
);
