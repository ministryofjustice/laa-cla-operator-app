import { ADULT_AGE, calculateAge } from '../clientAge.js'
import {
  ASSESSMENT_ROUTES,
  CONTROLLED_WORK_ANSWER_OPTIONS,
  CONTROLLED_WORK_STEP_CODES,
  NO,
  YES,
  type AssessmentRoute,
  type ControlledWorkAnswerCode,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
  type ControlledWorkStepCode,
  type MissingControlledWorkStep,
  type ResolvedControlledWorkJourney,
} from './controlledWorkTypes.js'

const STEPS = CONTROLLED_WORK_STEP_CODES

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
    code: STEPS.employmentStatus,
    answerCodes: ['employment-status'],
    isApplicable: isMeansTestedWithoutPassporting,
  },
  {
    code: STEPS.partnerEmploymentStatus,
    answerCodes: ['partner-employment-status'],
    isApplicable: (state) => isMeansTestedWithoutPassporting(state) && state.answers.partner === YES,
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
  return (CONTROLLED_WORK_ANSWER_OPTIONS[code] as readonly unknown[]).includes(value)
}

/**
 * Checks a string is a controlled-work answer code.
 * @param {string} code The candidate code
 * @returns {boolean} True when the code belongs to the controlled-work journey
 */
export function isControlledWorkAnswerCode(code: string): code is ControlledWorkAnswerCode {
  return Object.hasOwn(CONTROLLED_WORK_ANSWER_OPTIONS, code)
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
      if (isValidControlledWorkAnswer(code, answers[code])) Object.assign(relevant, { [code]: answers[code] })
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
    const answerCodes = getStepAnswerCodes(stepCode).filter((code) => resolved.answers[code] === undefined)
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
  const { answers: relevant } = resolveControlledWorkJourney(answers, context)
  const route = resolveRoute({ answers: relevant, context })
  return route !== ASSESSMENT_ROUTES.undetermined && findMissingSteps(answers, context).length === 0
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
