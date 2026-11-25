import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {GovUKButton} from "@ministryofjustice/hmpps-forge/govuk-components";
import { MOJSubNavigation } from "@ministryofjustice/hmpps-forge/moj-components";


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


