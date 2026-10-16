import {
  Answer,
  Condition,
  Self,
  or,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { PredicateExpr } from "@ministryofjustice/hmpps-forge/core/authoring";

export const POUNDS_AMOUNT_PATTERN = "^\\d+(\\.\\d{1,2})?$";
export const WHOLE_PERCENTAGE_PATTERN = "^(100|[1-9]\\d?)$";

// Amounts greater than 0: 0.01 to any value
export const POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN = "^([0-9]*[1-9][0-9]*(\\.[0-9]{1,2})?|0\\.[0-9]{0,1}[1-9]|0\\.[1-9])$";

// Amounts >= 500: 500.00 to any value
export const POUNDS_AMOUNT_MIN_500_PATTERN = "^([5-9]\\d{2}|[1-9]\\d{3,})(\\.[0-9]{1,2})?$";

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
    Self().match(Condition.String.MatchesRegex(POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN)),
  ]);

/**
 * Requires a dispute answer only when SMOD applies (non-immigration/asylum cases).
 * @returns {PredicateExpr} Passes when SMOD doesn't apply or dispute is answered.
 */
export const smodDisputeWhenApplicable = (): PredicateExpr =>
  or([
    Answer("immigration_or_asylum").match(Condition.Equals("true")),
    Self().match(Condition.IsRequired()),
  ]);
