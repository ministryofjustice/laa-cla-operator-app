// src/journeys/inbound-call/steps/addAddressStep.ts
import { requireSilasAuth } from "#src/journeys/auth.js";
import { InboundCallEffects } from "#src/journeys/effects.js";
import {
  step,
  submit,
  redirect,
  Data,
  Condition,
  Answer,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { HtmlBlock } from "@ministryofjustice/hmpps-forge/core/components";
import { addAddress } from "../blocks/addAddressBlock.js";

/**
 * Builds a GOV.UK error summary component.
 *
 * @param {string} message - The error message to display
 * @param {string} [href] - Optional anchor (e.g. "#address-line-1") linking to the field in error
 * @returns {string} HTML string for the error summary
 */
const errorSummary = (message: string, href?: string): string => `
  <div class="govuk-error-summary" data-error-summary data-module="govuk-error-summary">
    <div role="alert">
      <h2 class="govuk-error-summary__title">There is a problem</h2>
      <div class="govuk-error-summary__body">
        ${
          href !== undefined && href !== ""
            ? `<ul class="govuk-list govuk-error-summary__list">
                 <li><a href="${href}">${message}</a></li>
               </ul>`
            : `<p class="govuk-body">${message}</p>`
        }
      </div>
    </div>
  </div>`;

export const addAddressStep = step({
  code: "add-address",
  title: "Enter client’s address",
  path: "/add-address",
  reachability: { entryWhen: true },
  onAccess: [requireSilasAuth],
  view: { template: "main/forms/addAddress.njk" },
  blocks: [
    // Shown when validWhen fails (address-line-1 submitted blank)
    HtmlBlock({
      content: errorSummary("Address is required", "#address-line-1"),
      visibleWhen: Answer("address-line-1").match(Condition.Equals("")),
    }),
    // Shown when the form is valid but postAddress() fails
    HtmlBlock({
      content: errorSummary("We couldn't save the address. Try again."),
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