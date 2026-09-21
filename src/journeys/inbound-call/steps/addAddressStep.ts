// src/journeys/inbound-call/steps/addAddressStep.ts
import { requireSilasAuth } from "#src/journeys/auth.js";
import { InboundCallEffects } from "#src/journeys/effects.js";
import { step, submit, redirect, Data, Condition } from "@ministryofjustice/hmpps-forge/core/authoring";
import { HtmlBlock } from "@ministryofjustice/hmpps-forge/core/components";
import { addAddress } from "../blocks/addAddressBlock.js";

export const addAddressStep = step({
  code: "add-address",
  title: "Enter client’s address",
  path: "/add-address",
  reachability: { entryWhen: true },
  onAccess: [requireSilasAuth],
  view: { template: "main/forms/addAddress.njk" },
  blocks: [
    HtmlBlock({
      content: `<div class="govuk-error-summary" role="alert">
        <div class="govuk-error-summary__body">
          <h2 class="govuk-error-summary__title">There is a problem</h2>
          <p class="govuk-body">We couldn't save the address. Try again.</p>
        </div>
      </div>`,
      visibleWhen: Data("addressSaved").match(Condition.Equals(false)),
    }),
    addAddress,
  ],
  onSubmission: [
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.postAddress()],
        next: [
          redirect({
            when: Data("addressSaved").match(Condition.Equals(true)),
            goto: "/",
          }),

        ],
      },
    }),
  ],
});