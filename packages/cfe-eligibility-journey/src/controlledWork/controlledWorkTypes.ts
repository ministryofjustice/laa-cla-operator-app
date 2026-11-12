export const YES = 'yes'
export const NO = 'no'
export const YES_NO_OPTIONS = [YES, NO] as const

export const MATTER_TYPE_OPTIONS = ['immigration_clr', 'immigration_legal_help', 'asylum'] as const
export const EMPLOYMENT_STATUS_OPTIONS = ['in_work', 'unemployed'] as const

/** Every controlled-work answer code, mapped to the exact values it may hold. */
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
  'employment-status': EMPLOYMENT_STATUS_OPTIONS,
  'partner-employment-status': EMPLOYMENT_STATUS_OPTIONS,
} as const

export type ControlledWorkAnswerCode = keyof typeof CONTROLLED_WORK_ANSWER_OPTIONS

/** Typed controlled-work answers. A missing key means "not answered", which is never treated as "no". */
export type ControlledWorkAnswers = {
  [Code in ControlledWorkAnswerCode]?: (typeof CONTROLLED_WORK_ANSWER_OPTIONS)[Code][number]
}

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
