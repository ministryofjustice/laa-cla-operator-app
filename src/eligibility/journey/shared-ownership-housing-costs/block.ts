import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKDetails,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Answer,
  Data,
  Self,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  CombinedPaymentNeedsFrequency,
  HousingBenefitWithinSharedOwnershipPayments,
} from "../../registries/conditions.js";
import { SHARED_OWNERSHIP_FIELD_PREFIX } from "../../registries/field-aliases.js";
import {
  createHousingBenefitBlock,
  housingCostsHeadingBlock,
  housingPaymentField,
  livingWithSomeoneElseDetails,
  paymentFrequencyField,
  whatToIncludeDetails,
} from "../housing-blocks.js";

const paymentFrequencyHelp = GovUKDetails({
  summaryText: eligibilityCopy.help_with_different_payment_frequencies,
  html: eligibilityCopy.dynamic.housing.paymentFrequencyHelpHtml,
});

/**
 * The housing costs step for a client who owns their home through a shared
 * ownership scheme, as in CCQ's `SharedOwnershipHousingCostsForm`: rent and
 * mortgage share one frequency, which the Housing Benefit is checked against.
 */
export const sharedOwnershipHousingCostsBlock = CollectionBlock({
  collection: [
    housingCostsHeadingBlock(
      eligibilityCopy.dynamic.housing.sharedOwnershipHint,
    ),
    whatToIncludeDetails,
    livingWithSomeoneElseDetails(),
    paymentFrequencyHelp,
    paymentFrequencyField({
      code: "combined_frequency",
      legend: eligibilityCopy.select_frequency_of_mortgage_and_rent_payments,
      legendClasses: "govuk-fieldset__legend--m",
      optionsData: "benefitFrequencyOptions",
      notNeededWhen: Answer("rent").not.match(
        CombinedPaymentNeedsFrequency(Answer("shared_ownership_mortgage")),
      ),
      summaryLabel: eligibilityCopy.mortgage_and_rent_payments_frequency,
      message: eligibilityCopy.select_frequency_of_rent_payments,
    }),
    housingPaymentField({
      code: "rent",
      label: eligibilityCopy.what_is_the_rent,
      labelClasses: "govuk-label--m",
      hint: eligibilityCopy.enter_0_if_this_does_not_apply,
      summaryLabel: eligibilityCopy.rent,
      messages: {
        required: eligibilityCopy.enter_the_rent_amount,
        notANumber:
          eligibilityCopy.rent_must_be_a_number_enter_0_if_this_does_not_apply,
        outOfRange: eligibilityCopy.dynamic.housing.rentOutOfRange,
      },
    }),
    housingPaymentField({
      code: "shared_ownership_mortgage",
      label: eligibilityCopy.what_is_the_mortgage_payment,
      labelClasses: "govuk-label--m",
      hint: eligibilityCopy.enter_0_if_this_does_not_apply,
      summaryLabel: eligibilityCopy.mortgage_payment,
      messages: {
        required:
          eligibilityCopy.enter_the_mortgage_payment_enter_0_if_this_does_not_apply,
        notANumber:
          eligibilityCopy.mortgage_payment_must_be_a_number_enter_0_if_this_does_not_apply,
        outOfRange: eligibilityCopy.dynamic.housing.mortgagePaymentOutOfRange,
      },
    }),
    createHousingBenefitBlock(
      {
        codePrefix: SHARED_OWNERSHIP_FIELD_PREFIX,
        legend: Data("sharedOwnershipHousingBenefitLegend"),
        relevantMessage:
          eligibilityCopy.select_yes_if_your_client_gets_housing_benefit_for_this_home,
        amountLabel: eligibilityCopy.amount,
        frequencyLegend: eligibilityCopy.frequency,
        outOfRangeMessage:
          eligibilityCopy.housing_benefit_must_be_more_than_0_f5358641,
      },
      validation({
        condition: Self().match(
          HousingBenefitWithinSharedOwnershipPayments(
            Answer(`${SHARED_OWNERSHIP_FIELD_PREFIX}housing_benefit_frequency`),
            Answer("rent"),
            Answer("shared_ownership_mortgage"),
            Answer("combined_frequency"),
          ),
        ),
        message:
          eligibilityCopy.housing_benefit_cannot_be_higher_than_housing_costs_774038f1,
      }),
    ),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
