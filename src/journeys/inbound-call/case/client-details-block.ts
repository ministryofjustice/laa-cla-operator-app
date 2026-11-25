import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKSummaryList } from "@ministryofjustice/hmpps-forge/govuk-components";
import { toRows } from "#src/journeys/inbound-call/case/helpers.js";
import {
  Data,
  Format,
  type ChainableGenerator,
  Transformer,
} from "@ministryofjustice/hmpps-forge/core/authoring";

import { Transformers } from "#src/journeys/transformers.js";

/**
 * Get Client Details URL for a specific section
 * @param {string} section - The section of the client details to link to.
 * @returns {ChainableGenerator} - The URL for the specified client details section.
 */
const clientDetailsUrl = (section: string): ChainableGenerator =>
  Format("/case/%1/client-details#%2", Data("case.reference"), section);

export const clientHomePersonalDetailsBlock = CollectionBlock({
  collection: [
    GovUKSummaryList({
      card: { title: { text: "Client details" } },
      rows: [
        ...toRows({
          label: "Name",
          value: Data("personalDetails.full_name"),
          link: clientDetailsUrl("fullName"),
        }),
        ...toRows({
          label: "Date of birth",
          value: Data("personalDetails.dob").pipe(
            Transformers.dobToDate(),
            Transformer.Date.Format("D MMMM YYYY"),
          ),
          link: clientDetailsUrl("dateOfBirth"),
        }),
        ...toRows({
          label: "Phone number",
          value: Data("personalDetails.mobile_phone"),
          link: clientDetailsUrl("phoneNumber"),
        }),
        ...toRows({
          label: "Safe to call",
          value: Data("personalDetails.safe_to_contact"),
          valueKey: "html",
          link: clientDetailsUrl("safeToCall"),
          transformer: Transformers.SafeToCall(),
        }),
        ...toRows({
          label: "Withheld numbers accepted",
          value: Data("personalDetails.announce_call"),
          valueKey: "html",
          link: clientDetailsUrl("acceptsWithheldCalls"),
          transformer: Transformers.WithheldNumbersAccepted(),
        }),
        ...toRows({
          label: "Email address",
          value: Data("personalDetails.email"),
          link: clientDetailsUrl("email"),
        }),
        ...toRows({
          label: "Address",
          value: Data("personalDetails.street"),
          link: clientDetailsUrl("address"),
          transformer: Transformers.Concat(
            ", ",
            Data("personalDetails.postcode"),
          ),
        }),
      ],
    }),
  ],
});
