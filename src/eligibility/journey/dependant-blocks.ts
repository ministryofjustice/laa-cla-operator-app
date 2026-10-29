import eligibilityCopy from "../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
  type ResolvableString,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKDetails,
  GovUKRadioInput,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Answer,
  Condition,
  Data,
  Format,
  Item,
  Iterator,
  Self,
  or,
  validation,
  type PredicateExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { DEPENDANT_INCOMES_LIST } from "../lists/index.js";
import { DependantIncomeBelowLimit } from "../registries/conditions.js";
import {
  NUMBER_PATTERN,
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  amountValidations,
} from "./amount-validation.js";
import { DEPENDANT_MONTHLY_INCOME_LIMIT } from "../domain/dependant-income-limits.js";

const DEPENDANT_COUNT_NUMBER_PATTERN = "^\\d+$";
const DEPENDANT_COUNT_POSITIVE_PATTERN = "^[1-9]\\d*$";
const CURRENCY_DECIMAL_PLACES = 2;
const CHILD_DEPENDANTS_YES = Answer("child_dependants").match(
  Condition.Equals("true"),
);
const ADULT_DEPENDANTS_YES = Answer("adult_dependants").match(
  Condition.Equals("true"),
);

interface CountInputOptions {
  code: string;
  label: string;
  visibleWhen: PredicateExpr;
  notVisibleWhen: PredicateExpr;
  requiredMessage: string;
  numberMessage: string;
  integerMessage: string;
  greaterThanZeroMessage: string;
}

interface DependantQuestionOptions {
  code: string;
  legend: ResolvableString;
  detailsSummary: string;
  detailsHtml: ResolvableString;
  countCode: string;
  countLabel: string;
  requiredMessage: string;
  countRequiredMessage: string;
  countNumberMessage: string;
  countIntegerMessage: string;
  countGreaterThanZeroMessage: string;
  visibleWhen: PredicateExpr;
  notVisibleWhen: PredicateExpr;
}

/**
 * Create a dependant count input with conditional visibility and validation.
 * @param {CountInputOptions} options - field codes, visibility and validation messages
 * @returns {ReturnType<typeof GovUKTextInput>} the count input block
 */
function countInput(
  options: CountInputOptions,
): ReturnType<typeof GovUKTextInput> {
  const { visibleWhen, notVisibleWhen } = options;
  const notRequired = Self().not.match(Condition.IsRequired());
  const isNumber = Self().match(Condition.String.MatchesRegex(NUMBER_PATTERN));
  const isInteger = Self().match(
    Condition.String.MatchesRegex(DEPENDANT_COUNT_NUMBER_PATTERN),
  );

  return GovUKTextInput({
    code: options.code,
    label: { text: options.label },
    classes: "govuk-input--width-5",
    visibleWhen,
    dependentWhen: visibleWhen,
    validWhen: [
      validation({
        condition: or([notVisibleWhen, Self().match(Condition.IsRequired())]),
        message: options.requiredMessage,
      }),
      validation({
        condition: or([notVisibleWhen, notRequired, isNumber]),
        message: options.numberMessage,
      }),
      validation({
        condition: or([
          notVisibleWhen,
          notRequired,
          Self().not.match(Condition.String.MatchesRegex(NUMBER_PATTERN)),
          isInteger,
        ]),
        message: options.integerMessage,
      }),
      validation({
        condition: or([
          notVisibleWhen,
          notRequired,
          Self().not.match(
            Condition.String.MatchesRegex(DEPENDANT_COUNT_NUMBER_PATTERN),
          ),
          Self().match(
            Condition.String.MatchesRegex(DEPENDANT_COUNT_POSITIVE_PATTERN),
          ),
        ]),
        message: options.greaterThanZeroMessage,
      }),
    ],
  });
}

/**
 * Create a dependant yes/no question with its conditional count field.
 * @param {DependantQuestionOptions} options - question copy and validation details
 * @returns {ReturnType<typeof CollectionBlock>} the question block
 */
function dependantQuestion(
  options: DependantQuestionOptions,
): ReturnType<typeof CollectionBlock> {
  const {
    code,
    legend,
    detailsSummary,
    detailsHtml,
    countCode,
    countLabel,
    requiredMessage,
    countRequiredMessage,
    countNumberMessage,
    countIntegerMessage,
    countGreaterThanZeroMessage,
    visibleWhen,
    notVisibleWhen,
  } = options;
  const { dynamic } = eligibilityCopy;
  const { dependants: wording } = dynamic;

  return CollectionBlock({
    collection: [
      GovUKDetails({
        summaryText: detailsSummary,
        html: detailsHtml,
      }),
      GovUKRadioInput({
        code,
        fieldset: {
          legend: {
            text: legend,
            classes: "govuk-fieldset__legend--m",
          },
        },
        items: [
          {
            value: "true",
            text: eligibilityCopy.yes,
            hint: { text: wording.yesCountHint },
          },
          { value: "false", text: eligibilityCopy.no },
        ],
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: requiredMessage,
          }),
        ],
      }),
      countInput({
        code: countCode,
        label: countLabel,
        visibleWhen,
        notVisibleWhen,
        requiredMessage: countRequiredMessage,
        numberMessage: countNumberMessage,
        integerMessage: countIntegerMessage,
        greaterThanZeroMessage: countGreaterThanZeroMessage,
      }),
    ],
  });
}

export const dependantDetailsBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "h1",
      content: Data("dependantDetailsLegend"),
      classes: "govuk-heading-xl",
    }),
    HtmlBlock({
      content: Format(
        eligibilityCopy.dynamic.dependants.incomeWarningHtml,
        DEPENDANT_MONTHLY_INCOME_LIMIT.toFixed(CURRENCY_DECIMAL_PLACES),
      ),
    }),
    dependantQuestion({
      code: "child_dependants",
      legend: Data("childDependantsLegend"),
      detailsSummary: eligibilityCopy.dynamic.dependants.childDetailsSummary,
      detailsHtml: Format(
        Data("childDependantsDetailsHtml"),
        Data("dependantIncomeLimit"),
      ),
      countCode: "child_dependants_count",
      countLabel: eligibilityCopy.dynamic.dependants.childCountLabel,
      requiredMessage: eligibilityCopy.dependant_select_child_dependants,
      countRequiredMessage: eligibilityCopy.dependant_child_count_required,
      countNumberMessage: eligibilityCopy.dependant_count_not_number,
      countIntegerMessage: eligibilityCopy.dependant_count_not_integer,
      countGreaterThanZeroMessage:
        eligibilityCopy.dependant_child_count_greater_than_zero,
      visibleWhen: CHILD_DEPENDANTS_YES,
      notVisibleWhen: Answer("child_dependants").not.match(
        Condition.Equals("true"),
      ),
    }),
    dependantQuestion({
      code: "adult_dependants",
      legend: Data("adultDependantsLegend"),
      detailsSummary: eligibilityCopy.dynamic.dependants.adultDetailsSummary,
      detailsHtml: Format(
        Data("adultDependantsDetailsHtml"),
        Data("dependantIncomeLimit"),
      ),
      countCode: "adult_dependants_count",
      countLabel: eligibilityCopy.dynamic.dependants.adultCountLabel,
      requiredMessage: eligibilityCopy.dependant_select_adult_dependants,
      countRequiredMessage: eligibilityCopy.dependant_adult_count_required,
      countNumberMessage: eligibilityCopy.dependant_adult_count_not_number,
      countIntegerMessage: eligibilityCopy.dependant_adult_count_not_integer,
      countGreaterThanZeroMessage:
        eligibilityCopy.dependant_adult_count_greater_than_zero,
      visibleWhen: ADULT_DEPENDANTS_YES,
      notVisibleWhen: Answer("adult_dependants").not.match(
        Condition.Equals("true"),
      ),
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});

export const dependantIncomeBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      content: eligibilityCopy.dynamic.dependants.incomeHintHtml,
    }),
    GovUKRadioInput({
      code: "dependants_get_income",
      fieldset: {
        legend: {
          text: eligibilityCopy.dynamic.dependants.incomeQuestion,
          classes: "govuk-fieldset__legend--l",
          isPageHeading: true,
        },
      },
      items: [
        { value: "true", text: eligibilityCopy.yes },
        { value: "false", text: eligibilityCopy.no },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: eligibilityCopy.dependant_select_income,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});

/**
 * Resolve a dependant-income row field code from the current row data.
 * @param {string} field - the field within the dependant income row
 * @returns {ReturnType<ReturnType<typeof Item>["path"]>} the row field code
 */
const rowCode = (field: string): ReturnType<ReturnType<typeof Item>["path"]> =>
  Item().path(`codes.${field}`);

/**
 * Resolve row-specific validation copy and its position interpolation.
 * @param {string} field - the row field with the validation message
 * @param {string} validationName - the validation message key
 * @returns {ReturnType<typeof Format>} the formatted validation message
 */
const rowMessage = (
  field: string,
  validationName: string,
): ReturnType<typeof Format> =>
  Format(
    Item().path(`messages.${field}.${validationName}`),
    Item().path("position"),
  );

/**
 * Resolve the dependant-income ceiling message and its monthly limit.
 * @param {string} validationName - the ceiling message key
 * @returns {ReturnType<typeof Format>} the formatted ceiling message
 */
const rowLimitMessage = (validationName: string): ReturnType<typeof Format> =>
  Format(
    Item().path(`messages.amount.${validationName}`),
    DEPENDANT_MONTHLY_INCOME_LIMIT.toFixed(CURRENCY_DECIMAL_PLACES),
  );

const rowFrequencyCode = rowCode("frequency");
const rowFrequency = Answer(rowFrequencyCode);
const rowAmountIsNotNumber = Self().not.match(
  Condition.String.MatchesRegex(NUMBER_PATTERN),
);
const rowAmountIsNotPositive = Self().not.match(
  Condition.String.MatchesRegex(POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN),
);
const rowAmountNotNeeded = Self().not.match(Condition.IsRequired());
const rowFrequencyNotNeeded = rowFrequency.not.match(Condition.IsRequired());
const rowAmountBelowLimit = Self().match(
  DependantIncomeBelowLimit(rowFrequency),
);

export const dependantIncomeDetailsBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "h1",
      content: eligibilityCopy.dynamic.dependants.incomeDetailsHeading,
      classes: "govuk-heading-xl",
    }),
    HtmlBlock({
      tag: "p",
      content: eligibilityCopy.dynamic.dependants.incomeDetailsHint,
      classes: "govuk-body",
    }),
    CollectionBlock({
      collection: Data(DEPENDANT_INCOMES_LIST.rowsData).each(
        Iterator.Map(
          CollectionBlock({
            classes: "dependant-income-row govuk-!-margin-bottom-6",
            collection: [
              HtmlBlock({
                tag: "h2",
                content: Format(
                  Item().path("heading"),
                  Item().path("position"),
                ),
                classes: "govuk-heading-m",
              }),
              GovUKButton({
                name: "remove",
                value: Item().path("index"),
                text: eligibilityCopy.dynamic.dependants.removeIncome,
                classes: "govuk-button--secondary",
                visibleWhen: Item().path("removable"),
              }),
              GovUKRadioInput({
                code: rowCode("frequency"),
                fieldset: {
                  legend: {
                    text: eligibilityCopy.dynamic.dependants
                      .incomeFrequencyLegend,
                    classes: "govuk-fieldset__legend--s",
                  },
                },
                items: Data("dependantIncomeFrequencyOptions"),
                validWhen: [
                  validation({
                    condition: Self().match(Condition.IsRequired()),
                    message: rowMessage("frequency", "required"),
                  }),
                ],
              }),
              GovUKTextInput({
                code: rowCode("amount"),
                label: {
                  text: eligibilityCopy.dynamic.dependants.incomeAmountLabel,
                  classes: "govuk-label--s",
                },
                prefix: { text: eligibilityCopy.copy },
                classes: "govuk-input--width-10",
                validWhen: [
                  ...amountValidations(
                    {
                      required: rowMessage("amount", "required"),
                      notANumber: rowMessage("amount", "notANumber"),
                      outOfRange: rowMessage("amount", "greaterThanZero"),
                    },
                    POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
                  ),
                  validation({
                    condition: or([
                      rowAmountNotNeeded,
                      rowAmountIsNotNumber,
                      rowAmountIsNotPositive,
                      rowFrequencyNotNeeded,
                      rowFrequency.not.match(Condition.Equals("monthly")),
                      rowAmountBelowLimit,
                    ]),
                    message: rowLimitMessage("monthlyLimit"),
                  }),
                  validation({
                    condition: or([
                      rowAmountNotNeeded,
                      rowAmountIsNotNumber,
                      rowAmountIsNotPositive,
                      rowFrequencyNotNeeded,
                      rowFrequency.match(Condition.Equals("monthly")),
                      rowAmountBelowLimit,
                    ]),
                    message: rowLimitMessage("monthlyEquivalentLimit"),
                  }),
                ],
              }),
            ],
          }),
        ),
      ),
    }),
    GovUKButton({
      name: "action",
      value: "add",
      text: eligibilityCopy.dynamic.dependants.addIncome,
      classes: "govuk-button--secondary",
      visibleWhen: Data("dependantIncomeCanAddRows").match(
        Condition.Equals(true),
      ),
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ],
});
