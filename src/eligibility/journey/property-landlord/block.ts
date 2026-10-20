import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKBackLink,
  GovUKRadioInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Format,
  Params,
  validation,
  Condition,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const propertyLandlordBackLinkBlock = GovUKBackLink({
  href: Format("/eligibility/%1/property", Params("caseId")),
  text: eligibilityCopy.back,
});

export const propertyLandlordBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "property_landlord",
      fieldset: {
        legend: {
          text: eligibilityCopy.is_the_landlord_the_only_other_joint_owner,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        { value: "true", text: eligibilityCopy.yes },
        { value: "false", text: eligibilityCopy.no },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message:
            eligibilityCopy.select_yes_if_the_landlord_is_the_only_other_joint_owner,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
