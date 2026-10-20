import eligibilityCopy from "../../locales/en.json" with { type: "json" };
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
  title: eligibilityCopy.benefits_could_not_be_loaded,
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
          content: eligibilityCopy.the_list_of_benefits_could_not_be_loaded,
          classes: "govuk-heading-xl",
        }),
        HtmlBlock({
          tag: "p",
          content:
            eligibilityCopy.we_could_not_get_the_list_of_benefits_from_the_financia_ad87ab1a55,
          classes: "govuk-body",
        }),
        HtmlBlock({
          tag: "p",
          content:
            eligibilityCopy.report_this_problem_and_include_the_details_below_you_c_bdcaee8797,
          classes: "govuk-body",
        }),
        GovUKSummaryList({ rows: Data("benefitTypesFailureRows") }),
        GovUKLinkButton({
          text: eligibilityCopy.try_again,
          href: Data("benefitTypesRetryPath"),
        }),
        GovUKLinkButton({
          text: eligibilityCopy.go_back,
          href: Data("benefitTypesBackPath"),
          classes: "govuk-button--secondary",
        }),
      ],
    }),
  ],
});
