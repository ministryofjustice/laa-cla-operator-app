import {
  step,
  access,
  redirect,
  Condition,
  Data,
  Query,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKLinkButton,
  GovUKSummaryList,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { EligibilityEffects } from "../../registries/effects.js";

export const BENEFIT_TYPES_UNAVAILABLE_STEP_CODE = "benefit_types_unavailable";

// Not part of the domain's step list, like cannot_use_service: it is only
// reached from a benefit details step whose CFE call failed. Visiting it
// retries the call, and returns to the benefit step once CFE answers.
export const benefitTypesUnavailableStep = step({
  code: BENEFIT_TYPES_UNAVAILABLE_STEP_CODE,
  path: "/benefit-types-unavailable",
  title: "Benefits could not be loaded",
  reachability: { entryWhen: true },
  onAccess: [
    access({
      effects: [EligibilityEffects.LoadBenefitTypes(Query("from"))],
      next: [
        redirect({
          when: Data("benefitTypesUnavailable").not.match(
            Condition.Equals(true),
          ),
          goto: Data("benefitTypesRetryPath"),
        }),
      ],
    }),
  ],
  view: { template: "main/eligibility/step.njk" },
  blocks: [
    CollectionBlock({
      collection: [
        HtmlBlock({
          tag: "h1",
          content: "The list of benefits could not be loaded",
          classes: "govuk-heading-xl",
        }),
        HtmlBlock({
          tag: "p",
          content:
            "We could not get the list of benefits from the financial eligibility service (CFE), so you cannot add benefit details yet. Your other answers are saved.",
          classes: "govuk-body",
        }),
        HtmlBlock({
          tag: "p",
          content:
            "Report this problem and include the details below. You can try again, or go back to the previous question.",
          classes: "govuk-body",
        }),
        GovUKSummaryList({ rows: Data("benefitTypesFailureRows") }),
        GovUKLinkButton({
          text: "Try again",
          href: Data("benefitTypesRetryPath"),
        }),
        GovUKLinkButton({
          text: "Go back",
          href: Data("benefitTypesBackPath"),
          classes: "govuk-button--secondary",
        }),
      ],
    }),
  ],
});
