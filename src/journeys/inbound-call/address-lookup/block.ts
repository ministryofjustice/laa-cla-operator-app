import {
  validation,
  Condition,
  Self,
  Data,
  Item,
  Iterator,
} from "@ministryofjustice/hmpps-forge/core/authoring";

import {
  GovUKButton,
  GovUKRadioInput,
  GovUKTextInput,
  GovUKUtilityClasses,
  GovUKHeading,
} from "@ministryofjustice/hmpps-forge/govuk-components";

import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";

export const addressLookupStep1Blocks = CollectionBlock({
  collection: [
    GovUKHeading({
      text: "Find an address",
      size: "m",
    }),
    GovUKTextInput({
      code: "postcode",
      hint: "For example, AA3 1AB.",
      autocomplete: "postal-code",
      label: {
        text: "Postcode",
        classes: GovUKUtilityClasses.Label.Small,
      },
      validWhen: [
        validation({
          condition: Self().match(Condition.Address.IsValidPostcode()),
          message: "You must enter a valid postcode",
        }),
      ],
    }),
    GovUKTextInput({
      code: "building",
      hint: "For example, 15 or Prospect Cottage",
      label: {
        text: "Building number or name",
        classes: GovUKUtilityClasses.Label.Small,
      },
    }),
    GovUKButton({
      text: "Find address",
      value: "step1",
    }),
  ],
});

export const addressLookupStep2Blocks = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "address",
      label: "",
      items: Data("lookup.result").each(
        Iterator.Map({
          value: Item().path("uprn"),
          text: Item().path("address"),
        }),
      ),
    }),
    GovUKButton({
      text: "Use this address",
      value: "step2",
    }),
  ],
});
