import {
  Answer,
  Condition,
  Self,
  or,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type {
  PredicateExpr,
  ValidationExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { ResolvableString } from "@ministryofjustice/hmpps-forge/core/components";

export const POUNDS_AMOUNT_PATTERN = "^\\d+(\\.\\d{1,2})?$";
export const WHOLE_PERCENTAGE_PATTERN = "^(100|[1-9]\\d?)$";

// Anything that reads as a number, so a non-number can be told apart from a
// number that is out of range.
export const NUMBER_PATTERN = "^-?\\d+(\\.\\d+)?$";

// Amounts greater than 0: 0.01 to any value
export const POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN =
  "^([0-9]*[1-9][0-9]*(\\.[0-9]{1,2})?|0\\.[0-9]{0,1}[1-9]|0\\.[1-9])$";

// Amounts >= 500: 500.00 to any value
export const POUNDS_AMOUNT_MIN_500_PATTERN =
  "^([5-9]\\d{2}|[1-9]\\d{3,})(\\.[0-9]{1,2})?$";

/**
 * Requires a pounds amount only when the related answer matches, so unasked amounts can stay blank.
 * Accepts any valid pound amount including 0.
 * @param {string} answerCode - Journey code of the yes/no answer that gates the amount.
 * @param {string} expectedAnswer - Answer value that makes the amount required.
 * @returns {PredicateExpr} Passes when the amount is not needed or is a valid pounds amount.
 */
export const poundsAmountWhenAnswered = (
  answerCode: string,
  expectedAnswer: string,
): PredicateExpr =>
  or([
    Answer(answerCode).not.match(Condition.Equals(expectedAnswer)),
    Self().match(Condition.String.MatchesRegex(POUNDS_AMOUNT_PATTERN)),
  ]);

/**
 * Requires a pounds amount > 0 only when the related answer matches.
 * @param {string} answerCode - Journey code of the yes/no answer that gates the amount.
 * @param {string} expectedAnswer - Answer value that makes the amount required.
 * @returns {PredicateExpr} Passes when the amount is not needed or is a valid amount > 0.
 */
export const poundsAmountGreaterThanZeroWhenAnswered = (
  answerCode: string,
  expectedAnswer: string,
): PredicateExpr =>
  or([
    Answer(answerCode).not.match(Condition.Equals(expectedAnswer)),
    Self().match(
      Condition.String.MatchesRegex(POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN),
    ),
  ]);

export interface AmountMessages {
  required: ResolvableString;
  notANumber: ResolvableString;
  outOfRange: ResolvableString;
}

/**
 * The checks CCQ makes on a money field, each reporting only when the ones
 * before it pass so one mistake gives one message: something was entered, it
 * is a number, and it is within `rangePattern`.
 * @param {AmountMessages} messages - the message for each check
 * @param {string} rangePattern - the pattern an in-range amount matches
 * @returns {ValidationExpr[]} the validation rules for the field
 */
export function amountValidations(
  messages: AmountMessages,
  rangePattern: string,
): ValidationExpr[] {
  const entered = Self().match(Condition.IsRequired());
  const isNumber = Self().match(Condition.String.MatchesRegex(NUMBER_PATTERN));
  return [
    validation({ condition: entered, message: messages.required }),
    validation({
      condition: or([Self().not.match(Condition.IsRequired()), isNumber]),
      message: messages.notANumber,
    }),
    validation({
      condition: or([
        Self().not.match(Condition.String.MatchesRegex(NUMBER_PATTERN)),
        Self().match(Condition.String.MatchesRegex(rangePattern)),
      ]),
      message: messages.outOfRange,
    }),
  ];
}
