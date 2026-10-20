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
    GovUKHeading({ text: "Tell us about the partner", size: "xl" }),
    GovUKDateInputFull({
      code: "partner_date_of_birth",
      fieldset: {
        legend: {
          text: "What is the partner's date of birth?",
          classes: "govuk-fieldset__legend--m",
        },
      },
      hint: { text: "For example, 27 3 2007" },
      validWhen: [
        validation({
          condition: Self().match(Condition.Date.IsValid()),
          message: "Enter a valid date of birth",
        }),
        validation({
          condition: or(
            Self().not.match(Condition.Date.IsValid()),
            Self().not.match(Condition.Date.IsFutureDate()),
          ),
          message: "Year cannot be in the future",
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
          message: "Year cannot be more than 120 years ago",
          details: { field: "year" },
        }),
      ],
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
