import {
  CollectionBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";

export const clientHomeBlock = CollectionBlock({

    collection : [

        GovUKButton({ text: "Continue to Scope" }),
        ]
});