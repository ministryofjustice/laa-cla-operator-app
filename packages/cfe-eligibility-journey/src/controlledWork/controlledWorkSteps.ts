import { ADULT_AGE, calculateAge } from '../clientAge.js'
import {
  ASSESSMENT_ROUTES,
  CONTROLLED_WORK_ANSWER_CODES,
  CONTROLLED_WORK_ANSWER_OPTIONS,
  CONTROLLED_WORK_COUNT_ANSWER_CODES,
  CONTROLLED_WORK_STEP_CODES,
  NO,
  OTHER_INCOME_FREQUENCIES,
  OTHER_INCOME_FREQUENCY_CODES,
  OTHER_INCOME_RELEVANT_CODES,
  OTHER_INCOME_VALUE_CODES,
  PARTNER_OTHER_INCOME_FREQUENCY_CODES,
  PARTNER_OTHER_INCOME_RELEVANT_CODES,
  PARTNER_OTHER_INCOME_VALUE_CODES,
  YES,
  type AssessmentRoute,
  type ControlledWorkAnswerCode,
  type ControlledWorkAnswers,
  type ControlledWorkCountAnswerCode,
  type ControlledWorkContext,
  type ControlledWorkStepCode,
  type MissingControlledWorkStep,
  type ResolvedControlledWorkJourney,
} from './controlledWorkTypes.js'

const STEPS = CONTROLLED_WORK_STEP_CODES
const NO_DEPENDANTS = 0
const COUNT_ANSWER_CODE_SET = new Set<string>(CONTROLLED_WORK_COUNT_ANSWER_CODES)
const CONTROLLED_WORK_ANSWER_CODE_SET = new Set<string>(CONTROLLED_WORK_ANSWER_CODES)
const CHOICE_ANSWER_CODE_SET = new Set<string>(Object.keys(CONTROLLED_WORK_ANSWER_OPTIONS))
const OTHER_INCOME_VALUE_CODE_SET = new Set<string>([...OTHER_INCOME_VALUE_CODES, ...PARTNER_OTHER_INCOME_VALUE_CODES])
const OTHER_INCOME_FREQUENCY_CODE_SET = new Set<string>([
  ...OTHER_INCOME_FREQUENCY_CODES,
  ...PARTNER_OTHER_INCOME_FREQUENCY_CODES,
])
const OTHER_INCOME_RELEVANT_CODE_SET = new Set<string>([
  ...OTHER_INCOME_RELEVANT_CODES,
  ...PARTNER_OTHER_INCOME_RELEVANT_CODES,
])
const OTHER_INCOME_CONDITIONAL_CODE_SET = new Set<string>([
  ...OTHER_INCOME_VALUE_CODES,
  ...OTHER_INCOME_FREQUENCY_CODES,
  ...PARTNER_OTHER_INCOME_VALUE_CODES,
  ...PARTNER_OTHER_INCOME_FREQUENCY_CODES,
])
const OTHER_INCOME_FREQUENCY_SET = new Set<string>(OTHER_INCOME_FREQUENCIES)
const OTHER_INCOME_AMOUNT_PATTERN = /^-?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)$/u

/**
 * Checks whether a controlled-work answer is a dependant-count code.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @returns {boolean} True for child or adult dependant counts
 */
function isCountAnswerCode(code: ControlledWorkAnswerCode): code is ControlledWorkCountAnswerCode {
  return COUNT_ANSWER_CODE_SET.has(code)
}

/**
 * Checks whether a controlled-work answer code is one of the configured choice fields.
 * @param {ControlledWorkAnswerCode} code The candidate answer code.
 * @returns {boolean} Whether the answer code has a fixed set of string options.
 */
function isChoiceAnswerCode(code: ControlledWorkAnswerCode): code is keyof typeof CONTROLLED_WORK_ANSWER_OPTIONS {
  return CHOICE_ANSWER_CODE_SET.has(code)
}

/**
 * Maps an other-income conditional field code to its Yes/No relevance answer.
 * @param {string} code The amount or frequency answer code.
 * @returns {string} The matching relevance answer code.
 */
function getOtherIncomeRelevantCode(code: string): string {
  return code.replace(/_(?:conditional_value|frequency)$/u, '_relevant')
}

/**
 * Checks whether a string is one of the known other-income relevance answer codes.
 * @param {string} code The candidate answer code.
 * @returns {boolean} Whether the code belongs to an other-income question.
 */
function isOtherIncomeRelevantCode(
  code: string,
): code is (typeof OTHER_INCOME_RELEVANT_CODES)[number] | (typeof PARTNER_OTHER_INCOME_RELEVANT_CODES)[number] {
  return OTHER_INCOME_RELEVANT_CODE_SET.has(code)
}

/**
 * Checks whether a conditional other-income answer belongs to a Yes response.
 * @param {ControlledWorkAnswerCode} code The conditional answer code.
 * @param {ControlledWorkAnswers} answers The answers resolved for the current route.
 * @returns {boolean} Whether the field remains relevant.
 */
function isOtherIncomeConditionalAnswerRelevant(code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (!OTHER_INCOME_CONDITIONAL_CODE_SET.has(code)) return true
  const relevantCode = getOtherIncomeRelevantCode(code)
  return isOtherIncomeRelevantCode(relevantCode) && answers[relevantCode] === YES
}

/**
 * Checks whether a saved other-income amount is numeric and positive.
 * @param {unknown} value The saved field value.
 * @returns {boolean} Whether the value is a valid positive amount.
 */
function isValidOtherIncomeAmount(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalised = value.trim().replace(/^£/u, '')
  if (!OTHER_INCOME_AMOUNT_PATTERN.test(normalised)) return false
  const amount = Number(normalised.replace(/,/gu, ''))
  return Number.isFinite(amount) && amount > NO_DEPENDANTS
}

interface RoutingState {
  answers: ControlledWorkAnswers
  context: ControlledWorkContext
}

interface ControlledWorkStepDefinition {
  code: ControlledWorkStepCode
  /** Answers collected on the step. Empty for informational pages. */
  answerCodes: readonly ControlledWorkAnswerCode[]
  /** May only read answers collected by earlier steps. */
  isApplicable: (state: RoutingState) => boolean
}

/**
 * Derives the facts the journey needs from the client's date of birth, which is captured on client details.
 * @param {unknown} dateOfBirth The client's date of birth as an ISO `YYYY-MM-DD` string
 * @param {Date} now The current instant
 * @returns {ControlledWorkContext} The derived context; `isUnder18` is undefined when no valid DOB exists
 */
export function deriveControlledWorkContext(dateOfBirth: unknown, now: Date): ControlledWorkContext {
  const age = calculateAge(dateOfBirth, now)
  return age === null ? {} : { isUnder18: age < ADULT_AGE }
}

function resolveUnder18Route({ answers }: RoutingState): AssessmentRoute {
  const { 'controlled-legal-representation': clr, 'aggregated-means': aggregated } = answers
  if (clr === YES) return ASSESSMENT_ROUTES.exempt
  if (clr === undefined || aggregated === undefined) return ASSESSMENT_ROUTES.undetermined
  if (aggregated === YES) return ASSESSMENT_ROUTES.means

  const { 'regular-income': regularIncome, 'under-18-assets': assets } = answers
  if (regularIncome === YES) return ASSESSMENT_ROUTES.means
  if (regularIncome === undefined || assets === undefined) return ASSESSMENT_ROUTES.undetermined
  return assets === YES ? ASSESSMENT_ROUTES.means : ASSESSMENT_ROUTES.exempt
}

/**
 * Determines whether the CCQ matter-type and asylum-support questions apply.
 * @param {RoutingState} state The current answers and DOB-derived context
 * @returns {boolean} True when matter details must be collected
 */
function shouldAskMatterDetails({ answers, context }: RoutingState): boolean {
  if (answers['immigration-or-asylum'] !== YES) return false
  return context.isUnder18 !== true || resolveUnder18Route({ answers, context }) === ASSESSMENT_ROUTES.means
}

/**
 * Resolves the additional route decision made by the matter-type and asylum-support answers.
 * @param {RoutingState} state The current answers and DOB-derived context
 * @returns {AssessmentRoute | undefined} A known route, or undefined when those answers do not change it
 */
function resolveMatterRoute(state: RoutingState): AssessmentRoute | undefined {
  if (!shouldAskMatterDetails(state)) return undefined
  const { answers } = state
  if (answers['immigration-or-asylum-type'] === undefined || answers['asylum-support'] === undefined) {
    return ASSESSMENT_ROUTES.undetermined
  }
  return answers['asylum-support'] === YES ? ASSESSMENT_ROUTES.exempt : undefined
}

/**
 * Classifies the assessment as means-tested, exempt, or not yet determinable from the answers so far.
 * @param {RoutingState} state The answers collected by earlier steps and the derived context
 * @returns {AssessmentRoute} The assessment route
 */
function resolveRoute(state: RoutingState): AssessmentRoute {
  const { answers, context } = state
  if (context.isUnder18 === undefined || answers['immigration-or-asylum'] === undefined) {
    return ASSESSMENT_ROUTES.undetermined
  }

  const under18Route = context.isUnder18 ? resolveUnder18Route(state) : undefined
  if (under18Route === ASSESSMENT_ROUTES.undetermined || under18Route === ASSESSMENT_ROUTES.exempt) return under18Route
  const matterRoute = resolveMatterRoute(state)
  if (matterRoute !== undefined) return matterRoute
  return under18Route ?? ASSESSMENT_ROUTES.means
}

function isMeansTestedWithoutPassporting(state: RoutingState): boolean {
  return resolveRoute(state) === ASSESSMENT_ROUTES.means && state.answers.passporting === NO
}

/**
 * Checks whether either dependant category has been selected.
 * @param {RoutingState} state The current controlled-work state
 * @returns {boolean} True when child or adult dependants are present
 */
function hasDependants({ answers }: RoutingState): boolean {
  return answers['child-dependants'] === YES || answers['adult-dependants'] === YES
}

/**
 * Checks whether a selected dependant has income.
 * @param {RoutingState} state The current controlled-work state
 * @returns {boolean} True when dependant income details apply
 */
function dependantsGetIncomeSelected({ answers }: RoutingState): boolean {
  return answers['dependants-get-income'] === YES
}

/**
 * Checks whether a count belongs to a selected dependant category.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @param {ControlledWorkAnswers} answers The answers resolved so far
 * @returns {boolean} True when the count is applicable
 */
function isAnswerRelevant(code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (code === 'child-dependants-count') return answers['child-dependants'] === YES
  if (code === 'adult-dependants-count') return answers['adult-dependants'] === YES
  return isOtherIncomeConditionalAnswerRelevant(code, answers)
}

/**
 * Checks whether an answer is required on its page for the current route.
 * @param {ControlledWorkStepCode} stepCode The page code
 * @param {ControlledWorkAnswerCode} code The answer code
 * @param {ControlledWorkAnswers} answers The relevant answers
 * @returns {boolean} True when the answer is conditionally required
 */
function isRequiredAnswer(stepCode: ControlledWorkStepCode, code: ControlledWorkAnswerCode, answers: ControlledWorkAnswers): boolean {
  if (stepCode === STEPS.dependantDetails && code === 'child-dependants-count') {
    return answers['child-dependants'] === YES
  }
  if (stepCode === STEPS.dependantDetails && code === 'adult-dependants-count') {
    return answers['adult-dependants'] === YES
  }
  if ((stepCode === STEPS.otherIncome || stepCode === STEPS.partnerOtherIncome) && OTHER_INCOME_CONDITIONAL_CODE_SET.has(code)) {
    return isOtherIncomeConditionalAnswerRelevant(code, answers)
  }
  return true
}

/** Ordered journey definition: the single source of truth for navigation, clean-up and validation. */
export const CONTROLLED_WORK_STEPS: readonly ControlledWorkStepDefinition[] = [
  {
    code: STEPS.immigrationOrAsylum,
    answerCodes: ['immigration-or-asylum'],
    isApplicable: () => true,
  },
  {
    code: STEPS.under18Clr,
    answerCodes: ['controlled-legal-representation'],
    isApplicable: ({ context }) => context.isUnder18 === true,
  },
  {
    code: STEPS.aggregatedMeans,
    answerCodes: ['aggregated-means'],
    isApplicable: ({ answers }) => answers['controlled-legal-representation'] === NO,
  },
  {
    code: STEPS.howToAggregate,
    answerCodes: [],
    isApplicable: ({ answers }) => answers['aggregated-means'] === YES,
  },
  {
    code: STEPS.regularIncome,
    answerCodes: ['regular-income'],
    isApplicable: ({ answers }) => answers['aggregated-means'] === NO,
  },
  {
    code: STEPS.under18Assets,
    answerCodes: ['under-18-assets'],
    isApplicable: ({ answers }) => answers['regular-income'] === NO,
  },
  {
    code: STEPS.immigrationOrAsylumType,
    answerCodes: ['immigration-or-asylum-type'],
    isApplicable: shouldAskMatterDetails,
  },
  {
    code: STEPS.asylumSupport,
    answerCodes: ['asylum-support'],
    isApplicable: shouldAskMatterDetails,
  },
  {
    code: STEPS.applicant,
    answerCodes: ['partner', 'passporting'],
    isApplicable: (state) => resolveRoute(state) === ASSESSMENT_ROUTES.means,
  },
  {
    code: STEPS.dependantDetails,
    answerCodes: ['child-dependants', 'child-dependants-count', 'adult-dependants', 'adult-dependants-count'],
    isApplicable: isMeansTestedWithoutPassporting,
  },
  {
    code: STEPS.dependantIncome,
    answerCodes: ['dependants-get-income'],
    isApplicable: (state) => isMeansTestedWithoutPassporting(state) && hasDependants(state),
  },
  {
    code: STEPS.dependantIncomeDetails,
    answerCodes: [],
    isApplicable: dependantsGetIncomeSelected,
  },
  {
    code: STEPS.employmentStatus,
    answerCodes: ['employment-status'],
    isApplicable: isMeansTestedWithoutPassporting,
  },
  {
    code: STEPS.income,
    answerCodes: ['income-completed'],
    isApplicable: (state) =>
      isMeansTestedWithoutPassporting(state) && state.answers['employment-status'] === 'in_work',
  },
  {
    code: STEPS.benefits,
    answerCodes: ['receives-benefits'],
    isApplicable: isMeansTestedWithoutPassporting,
  },
  {
    code: STEPS.benefitDetails,
    answerCodes: ['benefit-details-completed'],
    isApplicable: ({ answers, context }) =>
      isMeansTestedWithoutPassporting({ answers, context }) && answers['receives-benefits'] === YES,
  },
  {
    code: STEPS.otherIncome,
    answerCodes: [
      ...OTHER_INCOME_RELEVANT_CODES,
      ...OTHER_INCOME_VALUE_CODES,
      ...OTHER_INCOME_FREQUENCY_CODES,
      'other-income-completed',
    ],
    isApplicable: ({ answers, context }) =>
      isMeansTestedWithoutPassporting({ answers, context }) &&
      (answers['receives-benefits'] === NO ||
        (answers['receives-benefits'] === YES && answers['benefit-details-completed'] === YES)),
  },
  {
    code: STEPS.partnerDetails,
    answerCodes: ['partner-over-60'],
    isApplicable: (state) =>
      resolveRoute(state) === ASSESSMENT_ROUTES.means &&
      state.answers.partner === YES &&
      state.answers.passporting !== undefined,
  },
  {
    code: STEPS.partnerEmploymentStatus,
    answerCodes: ['partner-employment-status'],
    isApplicable: (state) => isMeansTestedWithoutPassporting(state) && state.answers.partner === YES,
  },
  {
    code: STEPS.partnerIncome,
    answerCodes: ['partner-income-completed'],
    isApplicable: ({ answers }) => answers['partner-employment-status'] === 'in_work',
  },
  {
    code: STEPS.partnerBenefits,
    answerCodes: ['partner-receives-benefits'],
    isApplicable: (state) => isMeansTestedWithoutPassporting(state) && state.answers.partner === YES,
  },
  {
    code: STEPS.partnerBenefitDetails,
    answerCodes: ['partner-benefit-details-completed'],
    isApplicable: ({ answers }) => answers['partner-receives-benefits'] === YES,
  },
  {
    code: STEPS.partnerOtherIncome,
    answerCodes: [
      ...PARTNER_OTHER_INCOME_RELEVANT_CODES,
      ...PARTNER_OTHER_INCOME_VALUE_CODES,
      ...PARTNER_OTHER_INCOME_FREQUENCY_CODES,
      'partner-other-income-completed',
    ],
    isApplicable: (state) =>
      isMeansTestedWithoutPassporting(state) &&
      state.answers.partner === YES &&
      (state.answers['partner-receives-benefits'] === NO ||
        (state.answers['partner-receives-benefits'] === YES && state.answers['partner-benefit-details-completed'] === YES)),
  },
]

const STEP_DEFINITIONS_BY_CODE = new Map(CONTROLLED_WORK_STEPS.map((definition) => [definition.code, definition]))

/**
 * Checks a value is one of the exact values allowed for the answer code.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @param {unknown} value The value to check
 * @returns {boolean} True when the value is allowed
 */
export function isValidControlledWorkAnswer(code: ControlledWorkAnswerCode, value: unknown): boolean {
  if (isCountAnswerCode(code)) {
    if (typeof value === 'number') return Number.isInteger(value) && value > NO_DEPENDANTS
    return typeof value === 'string' && /^\+?\d+$/u.test(value) && Number(value) > NO_DEPENDANTS
  }
  if (OTHER_INCOME_VALUE_CODE_SET.has(code)) return isValidOtherIncomeAmount(value)
  if (OTHER_INCOME_FREQUENCY_CODE_SET.has(code)) {
    return typeof value === 'string' && OTHER_INCOME_FREQUENCY_SET.has(value)
  }
  if (!isChoiceAnswerCode(code)) return false
  return (CONTROLLED_WORK_ANSWER_OPTIONS[code] as readonly unknown[]).includes(value)
}

/**
 * Checks a string is a controlled-work answer code.
 * @param {string} code The candidate code
 * @returns {boolean} True when the code belongs to the controlled-work journey
 */
export function isControlledWorkAnswerCode(code: string): code is ControlledWorkAnswerCode {
  return CONTROLLED_WORK_ANSWER_CODE_SET.has(code)
}

/**
 * Gets the answer codes collected on a step.
 * @param {ControlledWorkStepCode} stepCode The step code
 * @returns {readonly ControlledWorkAnswerCode[]} The step's answer codes
 */
export function getStepAnswerCodes(stepCode: ControlledWorkStepCode): readonly ControlledWorkAnswerCode[] {
  return STEP_DEFINITIONS_BY_CODE.get(stepCode)?.answerCodes ?? []
}

/**
 * Walks the steps in order, keeping only answers of applicable steps so each rule sees only valid earlier answers.
 * Invalid values are treated as unanswered.
 * @param {ControlledWorkAnswers} answers The saved answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {ResolvedControlledWorkJourney} Applicable steps, relevant answers and answers that no longer apply
 */
export function resolveControlledWorkJourney(
  answers: ControlledWorkAnswers,
  context: ControlledWorkContext,
): ResolvedControlledWorkJourney {
  const relevant: ControlledWorkAnswers = {}
  const steps: ControlledWorkStepCode[] = []

  for (const definition of CONTROLLED_WORK_STEPS) {
    if (!definition.isApplicable({ answers: relevant, context })) continue
    steps.push(definition.code)
    for (const code of definition.answerCodes) {
      if (isAnswerRelevant(code, relevant) && isValidControlledWorkAnswer(code, answers[code])) {
        Object.assign(relevant, { [code]: answers[code] })
      }
    }
  }

  const removedCodes = (Object.keys(answers) as ControlledWorkAnswerCode[]).filter(
    (code) => relevant[code] === undefined,
  )
  return { steps, answers: relevant, removedCodes }
}

/**
 * Lists the steps that apply to the current answers, in journey order.
 * @param {ControlledWorkAnswers} answers The saved answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {ControlledWorkStepCode[]} Applicable step codes
 */
export function getApplicableSteps(answers: ControlledWorkAnswers, context: ControlledWorkContext): ControlledWorkStepCode[] {
  return resolveControlledWorkJourney(answers, context).steps
}

/**
 * Finds applicable steps that still need a valid answer.
 * @param {ControlledWorkAnswers} answers The saved answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {MissingControlledWorkStep[]} Missing steps in journey order
 */
export function findMissingSteps(answers: ControlledWorkAnswers, context: ControlledWorkContext): MissingControlledWorkStep[] {
  const resolved = resolveControlledWorkJourney(answers, context)
  const missing: MissingControlledWorkStep[] = []

  for (const stepCode of resolved.steps) {
    const answerCodes = getStepAnswerCodes(stepCode).filter(
      (code) => isRequiredAnswer(stepCode, code, resolved.answers) && resolved.answers[code] === undefined,
    )
    if (answerCodes.length > 0) missing.push({ stepCode, answerCodes })
  }
  return missing
}

/**
 * Finds the earliest applicable step that still needs an answer.
 * @param {ControlledWorkAnswers} answers The saved answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {ControlledWorkStepCode | undefined} The step code, or undefined when nothing is missing
 */
export function getFirstMissingStep(answers: ControlledWorkAnswers, context: ControlledWorkContext): ControlledWorkStepCode | undefined {
  return findMissingSteps(answers, context)[0]?.stepCode
}

/**
 * Checks every applicable step has an answer and the assessment route is known.
 * Without a known DOB the route can't be determined, so the journey is never complete.
 * @param {ControlledWorkAnswers} answers The saved answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {boolean} True when nothing further needs answering
 */
export function isControlledWorkComplete(answers: ControlledWorkAnswers, context: ControlledWorkContext): boolean {
  const resolvedState = { answers: resolveControlledWorkJourney(answers, context).answers, context }
  const route = resolveRoute(resolvedState)
  // The non-passported means route still has controlled-work pages after the client income section.
  return (
    route !== ASSESSMENT_ROUTES.undetermined &&
    !isMeansTestedWithoutPassporting(resolvedState) &&
    findMissingSteps(answers, context).length === 0
  )
}

/**
 * Checks whether a step applies to the current answers (e.g. to gate direct access to a page).
 * @param {ControlledWorkStepCode} stepCode The step code
 * @param {ControlledWorkAnswers} answers The saved answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {boolean} True when the step is applicable
 */
export function isStepApplicable(stepCode: ControlledWorkStepCode, answers: ControlledWorkAnswers, context: ControlledWorkContext): boolean {
  return getApplicableSteps(answers, context).includes(stepCode)
}

/**
 * Gets the next applicable step after the current one, whether or not it already has an answer.
 * @param {ControlledWorkStepCode} currentStep The step just completed
 * @param {ControlledWorkAnswers} answers The saved answers, including the just-submitted one
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {ControlledWorkStepCode | undefined} The next step, or undefined at the end of the journey
 */
export function getNextStep(
  currentStep: ControlledWorkStepCode,
  answers: ControlledWorkAnswers,
  context: ControlledWorkContext,
): ControlledWorkStepCode | undefined {
  const order = CONTROLLED_WORK_STEPS.map(({ code }) => code)
  const position = order.indexOf(currentStep)
  const applicable = new Set(getApplicableSteps(answers, context))
  return order.slice(position + 1).find((code) => applicable.has(code))
}

/**
 * Gets the previous applicable step before the current one, for back links and revisiting.
 * @param {ControlledWorkStepCode} currentStep The step being viewed
 * @param {ControlledWorkAnswers} answers The saved answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {ControlledWorkStepCode | undefined} The previous step, or undefined at the start of the journey
 */
export function getPreviousStep(
  currentStep: ControlledWorkStepCode,
  answers: ControlledWorkAnswers,
  context: ControlledWorkContext,
): ControlledWorkStepCode | undefined {
  const order = CONTROLLED_WORK_STEPS.map(({ code }) => code)
  const position = order.indexOf(currentStep)
  const applicable = new Set(getApplicableSteps(answers, context))
  return order
    .slice(0, Math.max(position, 0))
    .reverse()
    .find((code) => applicable.has(code))
}
