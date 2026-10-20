import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKRadioInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
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
  const { noun, possessive, people } = subject;
  const inWork = `Including if ${noun} is paid in cash, is a sole trader`;
  const inWorkEnd =
    "is in a partnership, or gets Statutory Sick Pay or Statutory Maternity Pay";

  return CollectionBlock({
    collection: [
      GovUKRadioInput({
        code: `${subject.prefix}employment_status`,
        fieldset: {
          legend: {
            text: `What is ${possessive} employment status?`,
            classes: "govuk-fieldset__legend--l",
            isPageHeading: true,
          },
        },
        items: [
          {
            value: "in_work",
            text: "Employed or self-employed",
            hint: {
              text: byLevelOfHelp(
                `${inWork}, is a company director, ${inWorkEnd}`,
                `${inWork}, ${inWorkEnd}`,
              ),
            },
          },
          {
            value: "unemployed",
            text: "Unemployed",
            hint: {
              text: `Including anyone without employment income, for example retired ${people}`,
            },
          },
        ],
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: "Select an employment status",
          }),
        ],
      }),
      GovUKButton({ text: "Continue" }),
    ],
  });
}

export const employmentStatusBlock = createEmploymentStatusBlock(CLIENT);
