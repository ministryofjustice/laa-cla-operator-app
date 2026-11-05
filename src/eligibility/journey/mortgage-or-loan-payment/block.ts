import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton } from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  housingPaymentField,
  livingWithSomeoneElseDetails,
  paymentFrequencyField,
  paymentIsPositive,
} from "../housing-blocks.js";

/**
 * The housing costs step for a client who owns their home with a mortgage
 * or loan, as in CCQ's `MortgageOrLoanPaymentForm`.
 */
export const mortgageOrLoanPaymentBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "h1",
      content:
        eligibilityCopy.what_are_the_mortgage_or_loan_payments_for_the_home_you_121c02dea3,
      classes: "govuk-heading-xl",
    }),
    livingWithSomeoneElseDetails(true),
    housingPaymentField({
      code: "housing_loan_payments",
      label: eligibilityCopy.enter_full_amount_due,
      hint: eligibilityCopy.enter_0_if_this_does_not_apply_b21667f8,
      summaryLabel: eligibilityCopy.mortgage_or_loan_payments,
      messages: {
        required: eligibilityCopy.enter_the_mortgage_or_loan_payments_amount,
        notANumber: eligibilityCopy.mortgage_or_loan_payments_must_be_a_number,
        outOfRange: eligibilityCopy.dynamic.housing.mortgagePaymentsOutOfRange,
      },
    }),
    paymentFrequencyField({
      code: "housing_payments_loan_frequency",
      legend: eligibilityCopy.select_frequency,
      optionsData: "outgoingsFrequencyOptions",
      neededWhen: paymentIsPositive("housing_loan_payments"),
      summaryLabel: eligibilityCopy.mortgage_or_loan_payments_frequency,
      message: eligibilityCopy.select_frequency_of_mortgage_payments,
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
