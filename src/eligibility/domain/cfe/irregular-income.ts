// Port of CCQ's `Cfe::IrregularIncomePayloadService` +
// `CfeParamBuilders::IrregularIncome`. The payments builder is shared: the
// client's `other_income` step and the partner's `partner_other_income` step
// save the same fields (just `partner_`-prefixed), so partner.ts normalises
// its own fields and calls `buildIrregularIncomePayments` directly.
import type { Answers } from "../logic.js";
import { asOptionalBoolean, asOptionalNumber } from "./types.js";
import type { IrregularIncomePayment } from "./types.js";

const ZERO = 0;
const CONTROLLED = "controlled";

/** The normalised fields the irregular-income builder reads, independent of
 * whether they come from the client's or the partner's answers. */
export interface IrregularIncomeAnswers {
  student_finance_relevant?: boolean;
  student_finance_conditional_value?: number;
  other_relevant?: boolean;
  other_conditional_value?: number;
}

/**
 * Reads an irregular-income amount, which is only present when its
 * "relevant" question was answered yes. Ported from
 * `CfeParamBuilders::IrregularIncome.extract_amount`.
 * @param {boolean | undefined} relevant - whether this income type applies
 * @param {number | undefined} conditionalValue - the amount, if relevant
 * @returns {number} the amount, or zero if not relevant
 */
function extractAmount(
  relevant: boolean | undefined,
  conditionalValue: number | undefined,
): number {
  return relevant === true ? (conditionalValue ?? ZERO) : ZERO;
}

/**
 * Builds the irregular income payments (student finance and/or an
 * unspecified other source) for a client or partner. Ported from
 * `CfeParamBuilders::IrregularIncome.call`.
 * @param {IrregularIncomeAnswers} form - the normalised irregular-income answers
 * @param {unknown} levelOfHelp - the check's `level_of_help` answer
 * @returns {IrregularIncomePayment[]} the irregular income payments
 */
export function buildIrregularIncomePayments(
  form: IrregularIncomeAnswers,
  levelOfHelp: unknown,
): IrregularIncomePayment[] {
  const payments: IrregularIncomePayment[] = [];

  const studentFinanceAmount = extractAmount(
    form.student_finance_relevant,
    form.student_finance_conditional_value,
  );
  if (studentFinanceAmount > ZERO) {
    payments.push({
      income_type: "student_loan",
      frequency: "annual",
      amount: studentFinanceAmount,
    });
  }

  const otherAmount = extractAmount(
    form.other_relevant,
    form.other_conditional_value,
  );
  if (otherAmount > ZERO) {
    payments.push({
      income_type: "unspecified_source",
      frequency: levelOfHelp === CONTROLLED ? "monthly" : "quarterly",
      amount: otherAmount,
    });
  }

  return payments;
}

/**
 * Builds the `irregular_incomes` section of a CFE payload, if the client's
 * other income is relevant. Ported from `Cfe::IrregularIncomePayloadService`.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @returns {{payments: IrregularIncomePayment[]} | undefined} the irregular incomes section, if relevant
 */
export function buildIrregularIncomeSection(
  answers: Answers,
  relevantSteps: Set<string>,
): { payments: IrregularIncomePayment[] } | undefined {
  if (!relevantSteps.has("other_income")) return undefined;

  const payments = buildIrregularIncomePayments(
    {
      student_finance_relevant: asOptionalBoolean(
        answers.student_finance_relevant,
      ),
      student_finance_conditional_value: asOptionalNumber(
        answers.student_finance_conditional_value,
      ),
      other_relevant: asOptionalBoolean(answers.other_relevant),
      other_conditional_value: asOptionalNumber(
        answers.other_conditional_value,
      ),
    },
    answers.level_of_help,
  );

  return { payments };
}
