import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKDateInputFull,
  GovUKHeading,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
  or,
  Generator,
  Transformer,
} from "@ministryofjustice/hmpps-forge/core/authoring";

const MAX_PARTNER_AGE_YEARS = 120;

export const partnerDetailsBlock = CollectionBlock({
  collection: [
    GovUKHeading({
      text: eligibilityCopy.tell_us_about_the_partner,
      size: "xl",
    }),
    GovUKDateInputFull({
      code: "partner_date_of_birth",
      fieldset: {
        legend: {
          text: eligibilityCopy.what_is_the_partner_s_date_of_birth,
          classes: "govuk-fieldset__legend--m",
        },
      },
      hint: { text: eligibilityCopy.for_example_27_3_2007 },
      validWhen: [
        validation({
          condition: Self().match(Condition.Date.IsValid()),
          message: eligibilityCopy.enter_a_valid_date_of_birth,
        }),
        validation({
          condition: or(
            Self().not.match(Condition.Date.IsValid()),
            Self().not.match(Condition.Date.IsFutureDate()),
          ),
          message: eligibilityCopy.year_cannot_be_in_the_future,
          details: { field: "year" },
        }),
        validation({
          condition: or(
            Self().not.match(Condition.Date.IsValid()),
            Self().not.match(
              Condition.Date.IsBefore(
                Generator.Date.Today().pipe(
                  Transformer.Date.AddYears(-MAX_PARTNER_AGE_YEARS),
                  Transformer.Date.Format("YYYY-MM-DD"),
                ),
              ),
            ),
          ),
          message: eligibilityCopy.year_cannot_be_more_than_120_years_ago,
          details: { field: "year" },
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
