import { ForgeTestHarness, type TestResult } from '@ministryofjustice/hmpps-forge/core/testing'
import type { EffectFunctionContext } from '@ministryofjustice/hmpps-forge/core/authoring'
import { govukComponents } from '@ministryofjustice/hmpps-forge/govuk-components'
import createEligibilityPackage, { CLIENT_DATE_OF_BIRTH_DATA_KEY } from '#packages/cfe-eligibility-journey/src/index.js'
import type { Deps, FinancialEligibilityEffectsWithDeps } from '#packages/cfe-eligibility-journey/src/api.js'
import { transformers } from '#packages/cfe-eligibility-journey/src/formatters.js'
import { moneyConditions } from '#packages/cfe-eligibility-journey/src/moneyFieldHelpers.js'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import type { FinancialEligibilitySession } from '#packages/cfe-eligibility-journey/src/context.type.js'
import {
  isControlledWorkChangeActive,
  readControlledWorkAnswers,
  writeControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSession.js'
import { resolveControlledWorkJourney } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import {
  CONTROLLED_WORK_STEP_CODES as STEPS,
  type ControlledWorkAnswers,
} from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { checkAnswersStepCode } from '#packages/cfe-eligibility-journey/src/checkAnswersPage/checkAnswersStep.js'

export const CASE_ID = 'CASE1'
export const OTHER_CASE_ID = 'CASE2'
export const COMPLETE = checkAnswersStepCode
export const CANNOT_USE_SERVICE = 'cannot-use-service'

const JOURNEY_PATH = `/cases/${CASE_ID}/cfe-eligibility/change`
const MAX_REDIRECTS = 12
const STEP_CODE_BY_PATH = new Map(
  (eligibilityJourney.steps ?? []).map(({ code, path }) => [`${JOURNEY_PATH}${path}`, code]),
)
const STEP_PATH_BY_CODE = new Map(
  (eligibilityJourney.steps ?? []).map(({ code, path }) => [code, `${JOURNEY_PATH}${path}`]),
)

export const NO_OTHER_INCOME = {
  friends_or_family_relevant: 'no',
  maintenance_relevant: 'no',
  property_or_lodger_relevant: 'no',
  pension_relevant: 'no',
  student_finance_relevant: 'no',
  other_relevant: 'no',
  'other-income-completed': 'yes',
} as const

export const NO_PARTNER_OTHER_INCOME = {
  partner_friends_or_family_relevant: 'no',
  partner_maintenance_relevant: 'no',
  partner_property_or_lodger_relevant: 'no',
  partner_pension_relevant: 'no',
  partner_student_finance_relevant: 'no',
  partner_other_relevant: 'no',
  'partner-other-income-completed': 'yes',
} as const

export const NO_ASSETS = {
  investments_relevant: 'no',
  valuables_relevant: 'no',
  'assets-completed': 'yes',
} as const

export const PROPERTY_ENTRY_ANSWERS = {
  house_value: '200000',
  percentage_owned: '100',
  house_in_dispute: 'no',
} as const satisfies ControlledWorkAnswers

export const HOUSING_COST_ANSWERS = {
  housing_benefit_relevant: 'no',
  housing_payments: '500',
  housing_payments_frequency: 'monthly',
} as const satisfies ControlledWorkAnswers

/** A complete adult, means-tested, single client who pays rent and owns no property. */
export const SINGLE_CLIENT: ControlledWorkAnswers = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'no',
  'child-dependants': 'no',
  'adult-dependants': 'no',
  'employment-status': 'unemployed',
  'receives-benefits': 'no',
  ...NO_OTHER_INCOME,
  maintenance_payments_relevant: 'no',
  legal_aid_payments_relevant: 'no',
  'property-owned': 'none',
  ...HOUSING_COST_ANSWERS,
  'additional-property-owned': 'none',
  ...NO_ASSETS,
}

/** A complete adult, means-tested, single client who owns their home outright, so pays no housing costs. */
export const SINGLE_HOMEOWNER: ControlledWorkAnswers = {
  ...without(SINGLE_CLIENT, ...Object.keys(HOUSING_COST_ANSWERS)),
  'property-owned': 'outright',
  ...PROPERTY_ENTRY_ANSWERS,
}

/** A complete adult, passported, single client who owns no property. */
export const PASSPORTED_CLIENT: ControlledWorkAnswers = {
  'immigration-or-asylum': 'no',
  partner: 'no',
  passporting: 'yes',
  'property-owned': 'none',
  'additional-property-owned': 'none',
  ...NO_ASSETS,
}

/** A complete adult, passported, single client who owns their home outright. */
export const PASSPORTED_HOMEOWNER: ControlledWorkAnswers = {
  ...PASSPORTED_CLIENT,
  'property-owned': 'outright',
  ...PROPERTY_ENTRY_ANSWERS,
}

/**
 * Removes answer codes from a set of answers.
 * @param {ControlledWorkAnswers} answers The answers to copy
 * @param {string[]} codes The codes to leave out
 * @returns {ControlledWorkAnswers} The remaining answers
 */
export function without(answers: ControlledWorkAnswers, ...codes: string[]): ControlledWorkAnswers {
  return Object.fromEntries(Object.entries(answers).filter(([code]) => !codes.includes(code)))
}

/** Valid submissions for the pages a change loop reaches in these scenarios, keyed by step code. */
const PAGE_ANSWERS: Record<string, Record<string, string>> = {
  [STEPS.property]: { 'property-owned': 'outright' },
  [STEPS.propertyEntry]: PROPERTY_ENTRY_ANSWERS,
  [STEPS.dependantDetails]: { 'child-dependants': 'no', 'adult-dependants': 'no' },
  [STEPS.employmentStatus]: { 'employment-status': 'unemployed' },
  [STEPS.benefits]: { 'receives-benefits': 'no' },
  [STEPS.otherIncome]: NO_OTHER_INCOME,
  [STEPS.outgoings]: { maintenance_payments_relevant: 'no', legal_aid_payments_relevant: 'no' },
  [STEPS.partnerDetails]: { 'partner-over-60': 'no' },
  [STEPS.partnerEmploymentStatus]: { 'partner-employment-status': 'unemployed' },
  [STEPS.partnerBenefits]: { 'partner-receives-benefits': 'no' },
  [STEPS.partnerOtherIncome]: NO_PARTNER_OTHER_INCOME,
  [STEPS.partnerOutgoings]: {
    partner_maintenance_payments_relevant: 'no',
    partner_legal_aid_payments_relevant: 'no',
  },
  [STEPS.partnerAdditionalProperty]: { 'partner-additional-property-owned': 'none' },
  [STEPS.partnerAssets]: { partner_investments_relevant: 'no', partner_valuables_relevant: 'no', amount_0: '0' },
}

export interface Outcome {
  /** Step the user ends up on, or undefined when the request did not render a journey step */
  step: string | undefined
  type: TestResult['type']
  /** Every step visited on the way, ending with `step` */
  trail: Array<string | undefined>
}

/**
 * Registers the real package with strict Forge validation and stubs the host effects, giving the case a fixed DOB.
 * @param {string} dateOfBirth The client's date of birth
 * @returns {ReturnType<ForgeTestHarness['createClient']>} A client for making requests to the real journey
 */
function createClient(dateOfBirth: string) {
  const noop = async (): Promise<void> => {}
  const effectsWithDeps: FinancialEligibilityEffectsWithDeps = {
    LoadCaseDetails: async (_deps: Deps, context: EffectFunctionContext) => {
      context.setData(CLIENT_DATE_OF_BIRTH_DATA_KEY, dateOfBirth)
    },
    LoadBenefitSuggestions: noop,
    RestoreCaseDraft: noop,
    ValidateDraftAnswers: noop,
    PrepareSubmission: noop,
    CheckPreparedSubmission: noop,
    RestoreSubmissionError: noop,
    ClearDraftAnswers: noop,
    SaveNewAnswerIfAnswered: noop,
  }

  return new ForgeTestHarness({ strictRegistration: true })
    .registerGlobalComponents(govukComponents)
    .registerGlobalFunctions(transformers, { formatCurrency: (value: number) => `£${value}` })
    .registerGlobalFunctions(moneyConditions)
    .registerPackage<Deps>(createEligibilityPackage, { effectsWithDeps })
    .createClient()
}

/** A browser-like user: one session, redirects followed, and a cap that turns a redirect loop into a failure. */
export class Browser {
  readonly session = { financialEligibilityDrafts: {} } as unknown as FinancialEligibilitySession

  private readonly client = createClient('1990-01-01')

  /**
   * Saves a set of answers as if the user had already entered them.
   * @param {ControlledWorkAnswers} answers The answers to seed
   * @param {string} [caseId] The case to seed
   * @returns {Browser} This browser
   */
  seed(answers: ControlledWorkAnswers, caseId = CASE_ID): this {
    writeControlledWorkAnswers(this.session, caseId, answers)
    return this
  }

  /** The case's saved answers, including any kept inactive while an earlier question is unanswered. */
  get savedAnswers(): ControlledWorkAnswers {
    return readControlledWorkAnswers(this.session, CASE_ID)
  }

  /** The answers that currently apply to the case. */
  get answers(): ControlledWorkAnswers {
    return resolveControlledWorkJourney(this.savedAnswers, { isUnder18: false }).answers
  }

  get changing(): boolean {
    return isControlledWorkChangeActive(this.session, CASE_ID)
  }

  /**
   * Opens a step, optionally as a Change link.
   * @param {string} stepCode The step to open
   * @param {{ change?: boolean }} [options] Whether the link carries `?change=true`
   * @returns {Promise<Outcome>} Where the user ended up
   */
  async open(stepCode: string, options: { change?: boolean } = {}): Promise<Outcome> {
    return this.request(stepCode, 'get', options.change ? { change: 'true' } : undefined)
  }

  /**
   * Submits a step's form.
   * @param {string} stepCode The step to submit
   * @param {Record<string, unknown>} body The posted form values
   * @returns {Promise<Outcome>} Where the user ended up
   */
  async submit(stepCode: string, body: Record<string, unknown>): Promise<Outcome> {
    return this.request(stepCode, 'post', undefined, body)
  }

  /**
   * Answers whatever page the user is on until the journey is complete, using a valid answer for each page.
   * @param {Outcome} from Where the user currently is
   * @returns {Promise<Outcome>} The final outcome, whose trail lists every page that was answered
   */
  async finishFrom(from: Outcome): Promise<Outcome> {
    let current = from
    const answered: string[] = []
    while (current.step !== COMPLETE) {
      const { step } = current
      if (step === undefined || answered.includes(step) || PAGE_ANSWERS[step] === undefined) {
        throw new Error(`Cannot continue from ${String(step)}; answered ${answered.join(' > ')}`)
      }
      answered.push(step)
      // eslint-disable-next-line no-await-in-loop
      current = await this.submit(step, PAGE_ANSWERS[step])
    }
    return { ...current, trail: [...answered, COMPLETE] }
  }

  private async request(
    stepCode: string,
    method: 'get' | 'post',
    query?: Record<string, string>,
    body?: Record<string, unknown>,
  ): Promise<Outcome> {
    const trail: Array<string | undefined> = []
    let path = STEP_PATH_BY_CODE.get(stepCode) ?? ''
    let result = await this.client[method](path, { params: { caseId: CASE_ID }, session: this.session, query, body })

    for (let hops = 0; result.type === 'redirect'; hops++) {
      if (hops >= MAX_REDIRECTS) throw new Error(`Redirect loop: ${trail.join(' > ')}`)
      path = new URL(result.url, 'http://localhost').pathname
      trail.push(STEP_CODE_BY_PATH.get(path))
      // eslint-disable-next-line no-await-in-loop
      result = await this.client.get(path, { params: { caseId: CASE_ID }, session: this.session })
    }

    return { step: result.type === 'render' ? STEP_CODE_BY_PATH.get(path) : undefined, type: result.type, trail }
  }
}
