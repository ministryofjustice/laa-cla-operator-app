import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton } from "@ministryofjustice/hmpps-forge/govuk-components";
import { MOJSubNavigation } from "@ministryofjustice/hmpps-forge/moj-components";
import { Data, Format } from "@ministryofjustice/hmpps-forge/core/authoring";

export const clientHomeBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      content: Format(
        `<div class="moj-interruption-card">
  <div class="card-header">
    <h1 class="moj-interruption-card__heading">%1</h1>
    <a class="govuk-link govuk-link--inverse" href="#">%2</a>
  </div>

  <div class="govuk-button-group moj-interruption-card__actions">
    <a href="#" role="button" draggable="false" class="govuk-button govuk-button--inverse" data-module="govuk-button">Manage Case</a>
    <a href="#" role="button" draggable="false" class="govuk-button govuk-button--inverse" data-module="govuk-button">Arrange CallBack</a>
    <a href="#" role="button" draggable="false" class="govuk-button govuk-button--inverse" data-module="govuk-button">Signpost to other help</a>
  </div>
</div>`,
        Data("case.full_name"),
        Data("case.reference"),
      ),
    }),
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
