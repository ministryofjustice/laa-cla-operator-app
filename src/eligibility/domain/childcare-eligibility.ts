// Port of CCQ's `ChildcareEligibilityService`, which decides whether the
// outgoings forms ask about childcare. CCQ's `Check` only reads answers for
// relevant steps, so this reads the same way.
import type { Answers } from "./logic.js";
import { relevantAnswers } from "./navigation.js";
import { withClientAge } from "./client-age.js";

const STATUTORY_PAY = "statutory_pay";

/**
 * Ruby truthiness, as CCQ reads these answers: anything but `false` and unset.
 * @param {unknown} value - a raw answer value
 * @returns {boolean} whether the value is truthy
 */
function truthy(value: unknown): boolean {
  return value !== false && value !== undefined && value !== null;
}

/**
 * Whether any employment income is something other than statutory pay.
 * Ported from `ChildcareEligibilityService.in_work?`.
 * @param {unknown} incomes - the saved income rows
 * @returns {boolean} whether the person is in work
 */
function inWork(incomes: unknown): boolean {
  return (
    Array.isArray(incomes) &&
    incomes.some(
      (income: unknown) =>
        typeof income !== "object" ||
        income === null ||
        (income as { income_type?: unknown }).income_type !== STATUTORY_PAY,
    )
  );
}

/**
 * Whether childcare costs can be claimed: there are child dependants, and
 * the client (and partner, if any) is in work or gets student finance.
 * Ported from `ChildcareEligibilityService.call`.
 * @param {Answers} answers - all saved answers
 * @param {Date} today - the date the client's age is worked out at
 * @returns {boolean} whether to ask about childcare
 */
export function eligibleForChildcareCosts(
  answers: Answers,
  today: Date,
): boolean {
  const check = relevantAnswers(withClientAge(answers, today));
  const clientEligible =
    truthy(check.student_finance_relevant) || inWork(check.incomes);
  const partnerEligible =
    truthy(check.partner_student_finance_relevant) ||
    inWork(check.partner_incomes);
  return (
    truthy(check.child_dependants) &&
    clientEligible &&
    (!truthy(check.partner) || partnerEligible)
  );
}
