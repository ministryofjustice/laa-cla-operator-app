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
import { guidanceLink } from "../guidance.js";

const NOT_NEEDED_EXAMPLES = [
  "Housing Benefit",
  "State Pension",
  "Personal Independence Payment (PIP)",
  "Carer’s Allowance",
  "Community Care direct payments",
  "Fostering allowance",
  "Cost of Living Payments",
];

/**
 * The text that points the operator at the guidance on which benefits to
 * leave out, with CCQ's examples. Shared by the benefits question and the
 * benefit details step.
 * @param {string} lead - the sentence before the guidance link
 * @returns {ReturnType<typeof byLevelOfHelp>} the HTML, by level of help
 */
export function benefitsNotNeededHtml(
  lead: string,
): ReturnType<typeof byLevelOfHelp> {
  const list = `<ul class="govuk-list govuk-list--bullet">${NOT_NEEDED_EXAMPLES.map((example) => `<li>${example}</li>`).join("")}</ul>`;
  const guidance = (level: "controlled" | "certificated"): string =>
    `<p class="govuk-body">${lead} ${guidanceLink(level, "disregardedPayments", "Check the guidance")} to find out which benefits you do not need to tell us about for this question, for example:</p>${list}`;
  return byLevelOfHelp(guidance("controlled"), guidance("certificated"));
}

/**
 * The "does anyone get benefits" question, as in CCQ's `BenefitsForm`.
 * @param {IncomeSubject} subject - whose benefits these are
 * @returns {ReturnType<typeof CollectionBlock>} the question and its button
 */
export function createBenefitsBlock(
  subject: IncomeSubject,
): ReturnType<typeof CollectionBlock> {
  const isPartner = subject.prefix === "partner_";

  return CollectionBlock({
    collection: [
      GovUKRadioInput({
        code: `${subject.prefix}receives_benefits`,
        fieldset: {
          legend: {
            text: isPartner
              ? "Does the partner get any benefits?"
              : "Does your client get any non-passporting benefits?",
            classes: "govuk-fieldset__legend--l",
            isPageHeading: true,
          },
        },
        hint: {
          html: benefitsNotNeededHtml(
            "For example, Child Benefit, tax credits or asylum support payments.",
          ),
        },
        items: [
          { value: "true", text: "Yes" },
          { value: "false", text: "No" },
        ],
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: `Select yes if ${subject.noun} gets any benefits`,
          }),
        ],
      }),
      GovUKButton({ text: "Continue" }),
    ],
  });
}

/** The client's benefits question. */
export const benefitsBlock = createBenefitsBlock(CLIENT);
