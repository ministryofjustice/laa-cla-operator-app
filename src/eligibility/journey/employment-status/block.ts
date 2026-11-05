import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKRadioInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Format,
  Self,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  CLIENT,
  byLevelOfHelp,
  type IncomeSubject,
} from "../income-subject.js";

/**
 * The employment status question, as in CCQ's `EmploymentStatusForm`.
 * @param {IncomeSubject} subject - whose employment status this is
 * @returns {ReturnType<typeof CollectionBlock>} the question and its button
 */
export function createEmploymentStatusBlock(
  subject: IncomeSubject,
): ReturnType<typeof CollectionBlock> {
  return CollectionBlock({
    collection: [
      GovUKRadioInput({
        code: `${subject.prefix}employment_status`,
        fieldset: {
          legend: {
            text: eligibilityCopy.dynamic.employmentStatus.question.replace(
              "%1",
              subject.possessive,
            ),
            classes: "govuk-fieldset__legend--l",
            isPageHeading: true,
          },
        },
        items: [
          {
            value: "in_work",
            text: eligibilityCopy.employed_or_self_employed,
            hint: {
              text: byLevelOfHelp(
                Format(
                  eligibilityCopy.dynamic.employmentStatus.inWorkControlled,
                  subject.noun,
                ),
                Format(
                  eligibilityCopy.dynamic.employmentStatus.inWorkCertificated,
                  subject.noun,
                ),
              ),
            },
          },
          {
            value: "unemployed",
            text: eligibilityCopy.unemployed,
            hint: {
              text: Format(
                eligibilityCopy.dynamic.employmentStatus.unemployedHint,
                subject.people,
              ),
            },
          },
        ],
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: eligibilityCopy.select_an_employment_status,
          }),
        ],
      }),
      GovUKButton({ text: eligibilityCopy.continue }),
    ],
  });
}

export const employmentStatusBlock = createEmploymentStatusBlock(CLIENT);
