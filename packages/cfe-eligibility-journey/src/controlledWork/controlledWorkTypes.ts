export const YES = 'yes'
export const NO = 'no'
export const YES_NO_OPTIONS = [YES, NO] as const

export const MATTER_TYPE_OPTIONS = ['immigration_clr', 'immigration_legal_help', 'asylum'] as const
export const EMPLOYMENT_STATUS_OPTIONS = ['in_work', 'unemployed'] as const
export const CONTROLLED_WORK_COUNT_ANSWER_CODES = ['child-dependants-count', 'adult-dependants-count'] as const

/** Allowed values for controlled-work choice answers. Count answers use a whole-number validator. */
export const CONTROLLED_WORK_ANSWER_OPTIONS = {
  'immigration-or-asylum': YES_NO_OPTIONS,
  'controlled-legal-representation': YES_NO_OPTIONS,
  'aggregated-means': YES_NO_OPTIONS,
  'regular-income': YES_NO_OPTIONS,
  'under-18-assets': YES_NO_OPTIONS,
  'immigration-or-asylum-type': MATTER_TYPE_OPTIONS,
  'asylum-support': YES_NO_OPTIONS,
  partner: YES_NO_OPTIONS,
  passporting: YES_NO_OPTIONS,
  'child-dependants': YES_NO_OPTIONS,
  'adult-dependants': YES_NO_OPTIONS,
  'dependants-get-income': YES_NO_OPTIONS,
  'employment-status': EMPLOYMENT_STATUS_OPTIONS,
  'partner-employment-status': EMPLOYMENT_STATUS_OPTIONS,
} as const

type ChoiceAnswerCode = keyof typeof CONTROLLED_WORK_ANSWER_OPTIONS
export type ControlledWorkCountAnswerCode = (typeof CONTROLLED_WORK_COUNT_ANSWER_CODES)[number]
export type ControlledWorkAnswerCode = ChoiceAnswerCode | ControlledWorkCountAnswerCode
export type ControlledWorkCountAnswer = number | string

export const CONTROLLED_WORK_ANSWER_CODES = [
  'immigration-or-asylum',
  'controlled-legal-representation',
  'aggregated-means',
  'regular-income',
  'under-18-assets',
  'immigration-or-asylum-type',
  'asylum-support',
  'partner',
  'passporting',
  'child-dependants',
  'adult-dependants',
  'dependants-get-income',
  'employment-status',
  'partner-employment-status',
  ...CONTROLLED_WORK_COUNT_ANSWER_CODES,
] as const satisfies readonly ControlledWorkAnswerCode[]

/** Typed controlled-work answers. A missing key means "not answered", which is never treated as "no". */
export type ControlledWorkAnswers = {
  [Code in ChoiceAnswerCode]?: (typeof CONTROLLED_WORK_ANSWER_OPTIONS)[Code][number]
} & Partial<Record<ControlledWorkCountAnswerCode, ControlledWorkCountAnswer>>

export const CONTROLLED_WORK_STEP_CODES = {
  immigrationOrAsylum: 'immigration-or-asylum',
  under18Clr: 'under-18-clr',
  aggregatedMeans: 'aggregated-means',
  howToAggregate: 'how-to-aggregate',
  regularIncome: 'regular-income',
  under18Assets: 'under-18-assets',
  immigrationOrAsylumType: 'immigration-or-asylum-type',
  asylumSupport: 'asylum-support',
  applicant: 'applicant',
  dependantDetails: 'dependant-details',
  dependantIncome: 'dependant-income',
  dependantIncomeDetails: 'dependant-income-details',
  employmentStatus: 'employment-status',
  partnerEmploymentStatus: 'partner-employment-status',
} as const

export type ControlledWorkStepCode = (typeof CONTROLLED_WORK_STEP_CODES)[keyof typeof CONTROLLED_WORK_STEP_CODES]

export const ASSESSMENT_ROUTES = {
  means: 'means',
  exempt: 'exempt',
  undetermined: 'undetermined',
} as const

export type AssessmentRoute = (typeof ASSESSMENT_ROUTES)[keyof typeof ASSESSMENT_ROUTES]

/** Facts derived from case data, never asked of the user. `isUnder18` is undefined when the DOB is unknown. */
export interface ControlledWorkContext {
  isUnder18?: boolean
}

export interface MissingControlledWorkStep {
  stepCode: ControlledWorkStepCode
  answerCodes: ControlledWorkAnswerCode[]
}

export interface ResolvedControlledWorkJourney {
  /** Applicable steps, in journey order */
  steps: ControlledWorkStepCode[]
  /** Only the answers that belong to applicable steps */
  answers: ControlledWorkAnswers
  /** Answer codes that were present but no longer belong to an applicable step */
  removedCodes: ControlledWorkAnswerCode[]
}
