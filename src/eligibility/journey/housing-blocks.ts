import eligibilityCopy from "../locales/en.json" with { type: "json" };
// Blocks shared by the three housing costs steps (`housing_costs`,
// `shared_ownership_housing_costs` and `mortgage_or_loan_payment`): the
// Housing Benefit questions from CCQ's `BaseHousingCostsForm`, the guidance
// CCQ shows on each, and the rule that a payment needs a frequency.
import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import type { ResolvableString } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKDetails,
  GovUKRadioInput,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Answer,
  Condition,
  Data,
  Format,
  Self,
  or,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type {
  PredicateExpr,
  ValidationExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  POUNDS_AMOUNT_PATTERN,
  amountValidations,
  type AmountMessages,
} from "./amount-validation.js";

/**
 * The "Housing costs" heading and its hint, with the extra line CCQ adds
 * when there is a partner.
 * @param {string} hint - the first line of the hint
 * @returns {ReturnType<typeof CollectionBlock>} the heading and hint
 */
export function housingCostsHeadingBlock(
  hint: string,
): ReturnType<typeof CollectionBlock> {
  return CollectionBlock({
    collection: [
      HtmlBlock({
        tag: "h1",
        content: eligibilityCopy.housing_costs,
        classes: "govuk-heading-xl",
      }),
      HtmlBlock({ tag: "p", content: hint, classes: "govuk-body" }),
      HtmlBlock({
        tag: "p",
        content:
          eligibilityCopy.if_your_client_and_their_partner_live_separately_do_not_b23a32d5c5,
        classes: "govuk-body",
        visibleWhen: Data("housingHasPartner").match(Condition.Equals(true)),
      }),
    ],
  });
}

/** CCQ's "What to include with housing payments" guidance. */
export const whatToIncludeDetails = GovUKDetails({
  summaryText: eligibilityCopy.what_to_include_with_housing_payments,
  html: eligibilityCopy.dynamic.housing.whatToIncludeHtml,
});

/**
 * CCQ's "Living with someone else" guidance. The mortgage step runs the
 * first two paragraphs together.
 * @param {boolean} joinFirstParagraphs - whether to run the first two together
 * @returns {ReturnType<typeof GovUKDetails>} the details block
 */
export function livingWithSomeoneElseDetails(
  joinFirstParagraphs = false,
): ReturnType<typeof GovUKDetails> {
  return GovUKDetails({
    summaryText: eligibilityCopy.living_with_someone_else,
    html: joinFirstParagraphs
      ? Format(
          eligibilityCopy.dynamic.housing.livingTogetherHtml,
          eligibilityCopy.dynamic.housing.livingWithSomeoneElse,
          eligibilityCopy.dynamic.housing.liableForHalf,
          eligibilityCopy.dynamic.housing.evidence,
        )
      : Format(
          eligibilityCopy.dynamic.housing.livingSeparatelyHtml,
          eligibilityCopy.dynamic.housing.livingWithSomeoneElse,
          eligibilityCopy.dynamic.housing.liableForHalf,
          eligibilityCopy.dynamic.housing.evidence,
        ),
  });
}

/**
 * A payment amount that must be 0 or more, as CCQ's housing forms ask.
 * @param {object} options - the field's code, wording and errors
 * @param {string} options.code - the answer key
 * @param {string} options.label - the field label
 * @param {string} [options.labelClasses] - classes for the label
 * @param {string} options.hint - the hint under the label
 * @param {string} options.summaryLabel - the check your answers label
 * @param {AmountMessages} options.messages - the errors
 * @returns {ReturnType<typeof GovUKTextInput>} the amount field
 */
export function housingPaymentField(options: {
  code: string;
  label: string;
  labelClasses?: string;
  hint: string;
  summaryLabel: string;
  messages: AmountMessages;
}): ReturnType<typeof GovUKTextInput> {
  return GovUKTextInput({
    code: options.code,
    label: {
      text: options.label,
      ...(options.labelClasses === undefined
        ? {}
        : { classes: options.labelClasses }),
    },
    hint: { text: options.hint },
    prefix: { text: eligibilityCopy.copy },
    classes: "govuk-input--width-10",
    metadata: { summaryLabel: options.summaryLabel },
    validWhen: amountValidations(options.messages, POUNDS_AMOUNT_PATTERN),
  });
}

/**
 * Whether a payment amount on the same step is more than 0, so needs a
 * frequency.
 * @param {string} amountCode - the payment amount's answer key
 * @returns {PredicateExpr} true when the amount is more than 0
 */
export function paymentIsPositive(amountCode: string): PredicateExpr {
  return Answer(amountCode).match(
    Condition.String.MatchesRegex(POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN),
  );
}

/** When a payment frequency is needed. */
export type FrequencyNeeded =
  /** Checked and kept only when this holds. */
  | { neededWhen: PredicateExpr }
  /**
   * For a frequency asked before the amounts it depends on: Forge evaluates
   * `dependentWhen` in block order, so cannot see the later answers. Only
   * the validation reads them, and the frequency is kept.
   */
  | { notNeededWhen: PredicateExpr };

/**
 * How often a housing payment is made.
 * @param {object} options - the field's code, wording and options
 * @param {string} options.code - the answer key
 * @param {ResolvableString} options.legend - the legend
 * @param {string} [options.legendClasses] - classes for the legend
 * @param {string} options.optionsData - the `Data(...)` key of the options
 * @param {string} options.summaryLabel - the check your answers label
 * @param {string} options.message - the error when none is selected
 * @returns {ReturnType<typeof GovUKRadioInput>} the frequency field
 */
export function paymentFrequencyField(
  options: {
    code: string;
    legend: ResolvableString;
    legendClasses?: string;
    optionsData: string;
    summaryLabel: string;
    message: string;
  } & FrequencyNeeded,
): ReturnType<typeof GovUKRadioInput> {
  const required = Self().match(Condition.IsRequired());
  return GovUKRadioInput({
    code: options.code,
    fieldset: {
      legend: {
        text: options.legend,
        classes: options.legendClasses ?? "govuk-fieldset__legend--s",
      },
    },
    items: Data(options.optionsData),
    ...("neededWhen" in options ? { dependentWhen: options.neededWhen } : {}),
    metadata: { summaryLabel: options.summaryLabel },
    validWhen: [
      validation({
        condition:
          "notNeededWhen" in options
            ? or([options.notNeededWhen, required])
            : required,
        message: options.message,
      }),
    ],
  });
}

/** What differs between the two steps that ask about Housing Benefit. */
export interface HousingBenefitWording {
  /** Prefixes the field codes: see `registries/field-aliases.ts`. */
  codePrefix: string;
  legend: ResolvableString;
  relevantMessage: string;
  amountLabel: string;
  frequencyLegend: string;
  /** The "more than 0" error: the shared ownership one ends with a full stop. */
  outOfRangeMessage: string;
}

/**
 * The Housing Benefit questions on the housing costs and shared ownership
 * steps, as in CCQ's `BaseHousingCostsForm`. Amount and frequency are always
 * shown, and only checked, and kept, when the answer is yes.
 * @param {HousingBenefitWording} wording - the step's field code prefix and wording
 * @param {ValidationExpr} withinCosts - the check that the benefit is no more than the step's housing costs
 * @returns {ReturnType<typeof CollectionBlock>} the questions
 */
export function createHousingBenefitBlock(
  wording: HousingBenefitWording,
  withinCosts: ValidationExpr,
): ReturnType<typeof CollectionBlock> {
  const code = (key: string): string => `${wording.codePrefix}${key}`;
  const isRelevant = Answer(code("housing_benefit_relevant")).match(
    Condition.Equals("true"),
  );
  return CollectionBlock({
    collection: [
      GovUKRadioInput({
        code: code("housing_benefit_relevant"),
        fieldset: {
          legend: {
            text: wording.legend,
            classes: "govuk-fieldset__legend--m",
          },
        },
        hint: { text: Data("housingBenefitHint") },
        items: [
          { value: "true", text: eligibilityCopy.yes },
          { value: "false", text: eligibilityCopy.no },
        ],
        classes: "govuk-radios--inline",
        metadata: {
          summaryLabel: eligibilityCopy.is_housing_benefit_claimed_for_the_home,
        },
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: wording.relevantMessage,
          }),
        ],
      }),
      GovUKTextInput({
        code: code("housing_benefit_value"),
        label: { text: wording.amountLabel, classes: "govuk-label--s" },
        hint: { text: eligibilityCopy.if_yes_enter_amount_and_frequency },
        prefix: { text: eligibilityCopy.copy },
        classes: "govuk-input--width-10",
        dependentWhen: isRelevant,
        metadata: { summaryLabel: eligibilityCopy.housing_benefit_amount },
        validWhen: [
          ...amountValidations(
            {
              required: eligibilityCopy.enter_the_housing_benefit_amount,
              notANumber: eligibilityCopy.housing_benefit_must_be_a_number,
              outOfRange: wording.outOfRangeMessage,
            },
            POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
          ),
          withinCosts,
        ],
      }),
      paymentFrequencyField({
        code: code("housing_benefit_frequency"),
        legend: wording.frequencyLegend,
        optionsData: "benefitFrequencyOptions",
        neededWhen: isRelevant,
        summaryLabel: eligibilityCopy.housing_benefit_frequency,
        message: eligibilityCopy.select_frequency_of_housing_benefit,
      }),
    ],
  });
}
