import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton } from "@ministryofjustice/hmpps-forge/govuk-components";
import { MOJSubNavigation } from "@ministryofjustice/hmpps-forge/moj-components";
import { Data, Format } from "@ministryofjustice/hmpps-forge/core/authoring";

export const caseHomeBlockHeader = CollectionBlock({
  collection: [
    HtmlBlock({
      content: Format(
        `<div class="pageHeaderBanner">
    <div class="pageHeaderBanner__inner">
      <div class="pageHeaderBanner__identity">
        <h1 class="govuk-heading-l pageHeaderBanner__name">%1</h1>
        <span class="pageHeaderBanner__ref">%2</span>
      </div>
      
      <div class="govuk-button-group pageHeaderBanner__actions">
        <a href="#" role="button" draggable="false" class="govuk-button govuk-button--secondary" data-module="govuk-button">Manage case</a>
        <a href="#" role="button" draggable="false" class="govuk-button govuk-button--secondary" data-module="govuk-button">Arrange callback</a>
        <a href="#" role="button" draggable="false" class="govuk-button govuk-button--secondary" data-module="govuk-button">Signpost to other help</a>
      </div>
        </div>
      </div>`,
        Data("case.full_name"),
        Data("case.reference"),
      ),
    }),
  ],
});

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
