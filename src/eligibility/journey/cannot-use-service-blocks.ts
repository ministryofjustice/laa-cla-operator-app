import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton } from "@ministryofjustice/hmpps-forge/govuk-components";

export const cannotUseServiceBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "div",
      content: `
        <div class="govuk-panel govuk-panel--confirmation" style="background-color: #d4351c;">
          <h1 class="govuk-panel__title">
            We cannot process your application
          </h1>
          <div class="govuk-panel__body">
            Based on the information provided, we are unable to offer legal aid for your case at this time.
          </div>
        </div>
        <h2 class="govuk-heading-m">What you can do next</h2>
        <p class="govuk-body">
          You may be able to:
        </p>
        <ul class="govuk-list govuk-list--bullet">
          <li>Contact us to discuss your situation</li>
          <li>Reapply if your circumstances change</li>
          <li>Seek advice from another organisation</li>
        </ul>
      `,
    }),
    GovUKButton({
      text: "Exit",
    }),
  ],
});
