import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton } from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Answer,
  Self,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { HousingBenefitWithinHousingPayments } from "../../registries/conditions.js";
import {
  createHousingBenefitBlock,
  housingCostsHeadingBlock,
  housingPaymentField,
  livingWithSomeoneElseDetails,
  paymentFrequencyField,
  paymentIsPositive,
  whatToIncludeDetails,
} from "../housing-blocks.js";

/**
 * The housing costs step for a client who does not own their home, as in
 * CCQ's `HousingCostsForm`.
 */
export const housingCostsBlock = CollectionBlock({
  collection: [
    housingCostsHeadingBlock(eligibilityCopy.dynamic.housing.housingCostsHint),
    HtmlBlock({
      tag: "h2",
      content: eligibilityCopy.housing_payments,
      classes: "govuk-heading-m",
    }),
    HtmlBlock({
      tag: "p",
      content: eligibilityCopy.for_example_rent_mortgage_or_board_and_lodgings,
      classes: "govuk-hint",
    }),
    whatToIncludeDetails,
    livingWithSomeoneElseDetails(),
    housingPaymentField({
      code: "housing_payments",
      label: eligibilityCopy.enter_amount,
      hint: eligibilityCopy.enter_0_if_this_does_not_apply,
      summaryLabel: eligibilityCopy.housing_payments,
      messages: {
        required:
          eligibilityCopy.enter_the_housing_payments_amount_enter_0_if_this_does_not_apply,
        notANumber:
          eligibilityCopy.housing_payments_must_be_a_number_enter_0_if_this_does_not_apply,
        outOfRange: eligibilityCopy.dynamic.housing.housingPaymentsOutOfRange,
      },
    }),
    paymentFrequencyField({
      code: "housing_payments_frequency",
      legend: eligibilityCopy.select_frequency,
      optionsData: "outgoingsFrequencyOptions",
      neededWhen: paymentIsPositive("housing_payments"),
      summaryLabel: eligibilityCopy.housing_payments_frequency,
      message: eligibilityCopy.select_frequency_of_housing_payments,
    }),
    createHousingBenefitBlock(
      {
        codePrefix: "",
        legend:
          eligibilityCopy.is_housing_benefit_claimed_at_the_home_the_client_lives_in,
        relevantMessage:
          eligibilityCopy.select_yes_if_housing_benefit_is_claimed_at_the_home_yo_aad2b33647,
        amountLabel: eligibilityCopy.enter_amount,
        frequencyLegend: eligibilityCopy.select_frequency,
        outOfRangeMessage: eligibilityCopy.housing_benefit_must_be_more_than_0,
      },
      validation({
        condition: Self().match(
          HousingBenefitWithinHousingPayments(
            Answer("housing_benefit_frequency"),
            Answer("housing_payments"),
            Answer("housing_payments_frequency"),
          ),
        ),
        message:
          eligibilityCopy.housing_benefit_cannot_be_higher_than_housing_costs,
      }),
    ),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
