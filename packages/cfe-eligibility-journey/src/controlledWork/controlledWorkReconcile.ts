import {
  CONTROLLED_WORK_STEPS,
  findMissingSteps,
  isValidControlledWorkAnswer,
  resolveControlledWorkJourney,
} from './controlledWorkSteps.js'
import {
  CONTROLLED_WORK_ANSWER_OPTIONS,
  type ControlledWorkAnswerCode,
  type ControlledWorkAnswers,
  type ControlledWorkContext,
  type ControlledWorkStepCode,
  type MissingControlledWorkStep,
  type ReconciledControlledWorkJourney,
} from './controlledWorkTypes.js'

const MAX_FILL_ROUNDS = 60
const MAX_FIRST_STEP_COMBINATIONS = 24
/** Values accepted by the free-entry answers (amounts, counts, frequencies, completion markers) */
const REPRESENTATIVE_VALUES = ['yes', '1', '100', '500', 'monthly']

type Pick = 'first' | 'last'

/**
 * Lists values an answer could take, for exploring which steps pending answers could switch on.
 * @param {ControlledWorkAnswerCode} code The answer code
 * @returns {unknown[]} Every option for a choice, or one valid representative value for a free-entry answer
 */
function possibleValues(code: ControlledWorkAnswerCode): unknown[] {
  const options = (CONTROLLED_WORK_ANSWER_OPTIONS as Record<string, readonly unknown[] | undefined>)[code]
  if (options !== undefined) return [...options]
  const value = REPRESENTATIVE_VALUES.find((candidate) => isValidControlledWorkAnswer(code, candidate))
  return value === undefined ? [] : [value]
}

/**
 * Lists the ways a step's pending answers could be filled in.
 * @param {MissingControlledWorkStep} missing The step with unanswered questions
 * @returns {ControlledWorkAnswers[]} Every combination, or none when there are too many to enumerate
 */
function answerCombinations(missing: MissingControlledWorkStep): ControlledWorkAnswers[] {
  let combinations: ControlledWorkAnswers[] = [{}]
  for (const code of missing.answerCodes) {
    const values = possibleValues(code)
    if (values.length === 0) continue
    combinations = combinations.flatMap((combination) => values.map((value) => ({ ...combination, [code]: value })))
    if (combinations.length > MAX_FIRST_STEP_COMBINATIONS) return []
  }
  return combinations
}

/**
 * Finds every step that applies in at least one way the pending questions could be answered.
 * The first pending step is tried with every answer combination; later pending steps are filled with their first
 * options, then their last options, which covers the Yes and the No branch of each Yes/No gate.
 * @param {ControlledWorkAnswers} saved The saved answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @returns {Set<ControlledWorkStepCode>} Steps that apply now or could apply once pending questions are answered
 */
function findPossiblyApplicableSteps(
  saved: ControlledWorkAnswers,
  context: ControlledWorkContext,
): Set<ControlledWorkStepCode> {
  const possible = new Set<ControlledWorkStepCode>()

  const fillAndResolve = (start: ControlledWorkAnswers, pick: Pick): void => {
    let current = start
    for (let round = 0; round < MAX_FILL_ROUNDS; round++) {
      const resolved = resolveControlledWorkJourney(current, context)
      resolved.steps.forEach((code) => possible.add(code))
      const missing = findMissingSteps(resolved.answers, context)[0]
      if (missing === undefined) return

      const assignment: ControlledWorkAnswers = {}
      for (const code of missing.answerCodes) {
        const values = possibleValues(code)
        const value = pick === 'first' ? values[0] : values.at(-1)
        if (value !== undefined) Object.assign(assignment, { [code]: value })
      }
      if (Object.keys(assignment).length === 0) return
      current = { ...current, ...assignment }
    }
  }

  const resolved = resolveControlledWorkJourney(saved, context)
  resolved.steps.forEach((code) => possible.add(code))
  const firstMissing = findMissingSteps(resolved.answers, context)[0]
  if (firstMissing === undefined) return possible

  const combinations = answerCombinations(firstMissing)
  for (const combination of combinations.length > 0 ? combinations : [{}]) {
    fillAndResolve({ ...saved, ...combination }, 'first')
    fillAndResolve({ ...saved, ...combination }, 'last')
  }
  return possible
}

/**
 * Reconciles saved answers with the journey after a change, deciding which answers to delete.
 * An answer is deleted when its step does not apply and cannot come to apply however the pending questions are
 * answered. If the step might still apply (for example financial pages while a new matter-type question is open,
 * or assets while a newly required property page is unanswered), its saved answers are kept inactive. They never
 * appear in the resolved answers, so they cannot affect routing, check answers or submission, and they are deleted
 * as soon as the pending questions settle that the step does not apply.
 * @param {ControlledWorkAnswers} saved The saved answers
 * @param {ControlledWorkContext} context Facts derived from case data
 * @param {boolean} keepUndecided Whether to keep answers that might still apply. Only a change-answer loop does: it
 *   edits a journey that was complete, so later answers are real and must survive until the pending questions settle.
 *   Outside a loop answers are deleted as soon as their step stops applying.
 * @returns {ReconciledControlledWorkJourney} The resolved journey, the answers kept inactive and the steps not yet decided
 */
export function reconcileControlledWorkAnswers(
  saved: ControlledWorkAnswers,
  context: ControlledWorkContext,
  keepUndecided: boolean,
): ReconciledControlledWorkJourney {
  const resolved = resolveControlledWorkJourney(saved, context)
  if (!keepUndecided || resolved.removedCodes.length === 0) return { ...resolved, retained: {}, undecidedSteps: [] }

  const applicable = new Set(resolved.steps)
  const undecided = new Set(
    [...findPossiblyApplicableSteps(saved, context)].filter((code) => !applicable.has(code)),
  )

  const retained: ControlledWorkAnswers = {}
  for (const code of resolved.removedCodes) {
    const owners = CONTROLLED_WORK_STEPS.filter((definition) => definition.answerCodes.includes(code))
    if (owners.some((owner) => undecided.has(owner.code))) Object.assign(retained, { [code]: saved[code] })
  }

  return {
    ...resolved,
    removedCodes: resolved.removedCodes.filter((code) => retained[code] === undefined),
    retained,
    undecidedSteps: [...undecided],
  }
}
