import { CollectionBlock, HtmlBlock } from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton, } from "@ministryofjustice/hmpps-forge/govuk-components";



async function casseDetails() {


  return 

}



export const clientHomeBlock = CollectionBlock({
  
  collection: [
HtmlBlock({
  content: `<div class="moj-interruption-card">
  <div class="card-header">
    <h1 class="moj-interruption-card__heading">Janet Jackson</h1>
    <a class="govuk-link govuk-link--inverse" href="#">P3-4950-9422</a>
  </div>
  
  <div class="govuk-button-group moj-interruption-card__actions">
    <a href="#" role="button" draggable="false" class="govuk-button govuk-button--inverse" data-module="govuk-button">Manage Case</a>
    <a href="#" role="button" draggable="false" class="govuk-button govuk-button--inverse" data-module="govuk-button">Arrange CallBack</a>
    <a href="#" role="button" draggable="false" class="govuk-button govuk-button--inverse" data-module="govuk-button">Signpost to other help</a>
  </div>
</div>`
})
],
});
