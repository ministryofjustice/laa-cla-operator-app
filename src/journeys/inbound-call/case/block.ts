import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";

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
  ],
});
