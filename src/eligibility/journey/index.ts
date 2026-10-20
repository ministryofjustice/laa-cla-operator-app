import {
  createForgePackage,
  journey,
  access,
  type JourneyDefinition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps } from "../ports/index.js";
import {
  EligibilityEffectsRegistry,
  EligibilityConditionsRegistry,
} from "../registries/index.js";
import { EligibilityEffects } from "../registries/effects.js";
import { levelOfHelpStep } from "./level-of-help/index.js";
import { under18ClrStep } from "./under-18-clr/index.js";
import { aggregatedMeansStep } from "./aggregated-means/index.js";
import { howToAggregateStep } from "./how-to-aggregate/index.js";
import { regularIncomeStep } from "./regular-income/index.js";
import { underEighteenAssetsStep } from "./under-eighteen-assets/index.js";
import { applicantStep } from "./applicant/index.js";
import { propertyStep } from "./property/index.js";
import { propertyLandlordStep } from "./property-landlord/index.js";
import { propertyEntryStep } from "./property-entry/index.js";
import { assetsStep } from "./assets/index.js";
import { partnerAssetsStep } from "./partner-assets/index.js";
import { employmentStatusStep } from "./employment-status/index.js";
import { incomeStep } from "./income/index.js";
import { benefitsStep } from "./benefits/index.js";
import { benefitDetailsStep } from "./benefit-details/index.js";
import { otherIncomeStep } from "./other-income/index.js";
import { outgoingsStep } from "./outgoings/index.js";
import { partnerOutgoingsStep } from "./partner-outgoings/index.js";
import { sharedOwnershipHousingCostsStep } from "./shared-ownership-housing-costs/index.js";
import { mortgageOrLoanPaymentStep } from "./mortgage-or-loan-payment/index.js";
import { housingCostsStep } from "./housing-costs/index.js";
import { partnerDetailsStep } from "./partner-details/index.js";
import { partnerEmploymentStatusStep } from "./partner-employment-status/index.js";
import { partnerIncomeStep } from "./partner-income/index.js";
import { partnerBenefitsStep } from "./partner-benefits/index.js";
import { partnerBenefitDetailsStep } from "./partner-benefit-details/index.js";
import { partnerOtherIncomeStep } from "./partner-other-income/index.js";
import { immigrationOrAsylumStep } from "./immigration-or-asylum/index.js";
import { immigrationOrAsylumTypeStep } from "./immigration-or-asylum-type/index.js";
import {
  immigrationOrAsylumTypeUpperTribunalStep,
  asylumSupportStep,
  domesticAbuseApplicantStep,
} from "./matter-type-steps.js";
import {
  dependantDetailsStep,
  dependantIncomeStep,
  dependantIncomeDetailsStep,
} from "./dependants/index.js";
import {
  additionalPropertyStep,
  additionalPropertyDetailsStep,
  partnerAdditionalPropertyStep,
  partnerAdditionalPropertyDetailsStep,
} from "./additional-property/index.js";
import { vehiclesStep, vehicleDetailsStep } from "./vehicles/index.js";
import { cannotUseServiceStep } from "./cannot-use-service/index.js";
import { benefitTypesUnavailableStep } from "./benefit-types-unavailable/index.js";
import { createCheckYourAnswersStep } from "./check-your-answers/index.js";
import { createAnswerSummary } from "./check-your-answers/summary.js";

export interface CreateEligibilityPackageOptions {
  path: string;
  onAccess?: unknown[];
  checkId?: unknown;
  presetAnswers?: Record<string, unknown>;
  onComplete?: unknown;
  template?: { layout: string };
}

/**
 *
 * @param options
 */
export function createEligibilityPackage(
  options: CreateEligibilityPackageOptions,
) {
  const journeyConfig: Omit<JourneyDefinition, "type"> = {
    code: "eligibility",
    title: "Financial Eligibility Check",
    path: options.path,
    // Only level of help is an entry point; every other step is reached by
    // following the saved answers, so send stray requests to the furthest
    // step reached rather than back to the start.
    reachability: { unreachableRedirect: "frontier" },
    onAccess: [
      access({
        effects: [EligibilityEffects.LoadAnswers()],
      }),
    ],
    steps: [
      levelOfHelpStep,
      under18ClrStep,
      aggregatedMeansStep,
      howToAggregateStep,
      regularIncomeStep,
      underEighteenAssetsStep,
      applicantStep,
      propertyStep,
      propertyLandlordStep,
      propertyEntryStep,
      employmentStatusStep,
      incomeStep,
      benefitsStep,
      benefitDetailsStep,
      otherIncomeStep,
      outgoingsStep,
      partnerOutgoingsStep,
      sharedOwnershipHousingCostsStep,
      mortgageOrLoanPaymentStep,
      housingCostsStep,
      partnerDetailsStep,
      partnerEmploymentStatusStep,
      partnerIncomeStep,
      partnerBenefitsStep,
      partnerBenefitDetailsStep,
      partnerOtherIncomeStep,
      immigrationOrAsylumStep,
      immigrationOrAsylumTypeStep,
      immigrationOrAsylumTypeUpperTribunalStep,
      asylumSupportStep,
      domesticAbuseApplicantStep,
      dependantDetailsStep,
      dependantIncomeStep,
      dependantIncomeDetailsStep,
      additionalPropertyStep,
      additionalPropertyDetailsStep,
      partnerAdditionalPropertyStep,
      partnerAdditionalPropertyDetailsStep,
      assetsStep,
      partnerAssetsStep,
      vehiclesStep,
      vehicleDetailsStep,
      cannotUseServiceStep,
      benefitTypesUnavailableStep,
    ],
  };

  // Only add view if template is provided
  if (options.template) {
    journeyConfig.view = { template: options.template.layout };
  }

  const summary = createAnswerSummary(journeyConfig.steps ?? []);
  journeyConfig.steps?.push(createCheckYourAnswersStep(summary.load()));
  const eligibilityJourney = journey(journeyConfig);

  return createForgePackage<EligibilityDeps>({
    journey: eligibilityJourney,
    functions: [
      EligibilityEffectsRegistry,
      EligibilityConditionsRegistry,
      summary.registry,
    ],
  });
}
