import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  type ResolvableString,
} from "@ministryofjustice/hmpps-forge/core/components";
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
import { guidanceLink } from "../guidance.js";

/**
 * The text that points the operator at the guidance on which benefits to
 * leave out, with CCQ's examples. Shared by the benefits question and the
 * benefit details step.
 * @param {string} lead - the sentence before the guidance link
 * @returns {ReturnType<typeof byLevelOfHelp>} the HTML, by level of help
 */
export function benefitsNotNeededHtml(
  lead: ResolvableString,
): ReturnType<typeof byLevelOfHelp> {
  const list = `<ul class="govuk-list govuk-list--bullet">${eligibilityCopy.dynamic.benefits.examples.map((example) => `<li>${example}</li>`).join("")}</ul>`;
  const guidance = (level: "controlled" | "certificated"): ResolvableString =>
    Format(
      eligibilityCopy.dynamic.benefits.guidanceHtml,
      lead,
      guidanceLink(
        level,
        "disregardedPayments",
        eligibilityCopy.dynamic.benefits.checkGuidance,
      ),
      list,
    );
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
              ? eligibilityCopy.dynamic.benefits.questionPartner
              : eligibilityCopy.dynamic.benefits.questionClient,
            classes: "govuk-fieldset__legend--l",
            isPageHeading: true,
          },
        },
        hint: {
          html: benefitsNotNeededHtml(
            eligibilityCopy.dynamic.benefits.questionGuidanceLead,
          ),
        },
        items: [
          { value: "true", text: eligibilityCopy.yes },
          { value: "false", text: eligibilityCopy.no },
        ],
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: Format(
              eligibilityCopy.dynamic.benefits.required,
              subject.noun,
            ),
          }),
        ],
      }),
      GovUKButton({ text: eligibilityCopy.continue }),
    ],
  });
}

/** The client's benefits question. */
export const benefitsBlock = createBenefitsBlock(CLIENT);
