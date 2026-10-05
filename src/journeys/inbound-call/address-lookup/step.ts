import {
  step,
  submit,
  redirect,
  validation,
  Condition,
  Self,
  Data,
  access,
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

import { InboundCallEffects } from "#src/journeys/effects.js";
import { requireSilasAuth } from "#src/journeys/auth.js";

export const ADDRESS_LOOKUP_STEP_CODE = "address-lookup";
export const addressLookupStep1 = step({
  code: ADDRESS_LOOKUP_STEP_CODE,
  path: ADDRESS_LOOKUP_STEP_CODE,
  title: "Search client's address",
  onAccess: [requireSilasAuth],
  reachability: { entryWhen: true },
  view: {
    template: "main/forms/address-lookup-form.njk",
  },

  blocks: [
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
          condition: Self().match(Condition.IsRequired()),
          message: "You must enter a valid postcode",
        }),
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
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.SaveToSession()],
        next: [redirect({ goto: "address-lookup/select" })],
      },
    }),
  ],
});

export const addressLookupStep2 = step({
  code: "address-lookup-select",
  path: "address-lookup/select",
  title: "Search client's address",
  reachability: { entryWhen: true },
  view: {
    template: "main/forms/address-lookup-select.njk",
  },
  onAccess: [
    requireSilasAuth,
    access({
      effects: [InboundCallEffects.PostcodeLookup()],
    }),
  ],
  blocks: [
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
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.SaveAddressLookup()],
      },
    }),
  ],
});
