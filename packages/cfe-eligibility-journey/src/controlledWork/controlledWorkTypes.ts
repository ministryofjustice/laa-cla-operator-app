export const YES = 'yes'
export const NO = 'no'
export const YES_NO_OPTIONS = [YES, NO] as const

export const MATTER_TYPE_OPTIONS = ['immigration_clr', 'immigration_legal_help', 'asylum'] as const
export const EMPLOYMENT_STATUS_OPTIONS = ['in_work', 'unemployed'] as const
export const PROPERTY_OWNERSHIP_OPTIONS = ['with_mortgage', 'shared_ownership', 'outright', 'none'] as const
export const CONTROLLED_WORK_COUNT_ANSWER_CODES = ['child-dependants-count', 'adult-dependants-count'] as const
export const OTHER_INCOME_RELEVANT_CODES = [
  'friends_or_family_relevant',
  'maintenance_relevant',
  'property_or_lodger_relevant',
  'pension_relevant',
  'student_finance_relevant',
  'other_relevant',
] as const
export const OTHER_INCOME_VALUE_CODES = [
  'friends_or_family_conditional_value',
  'maintenance_conditional_value',
  'property_or_lodger_conditional_value',
  'pension_conditional_value',
  'student_finance_conditional_value',
  'other_conditional_value',
] as const
export const OTHER_INCOME_FREQUENCY_CODES = [
  'friends_or_family_frequency',
  'maintenance_frequency',
  'property_or_lodger_frequency',
  'pension_frequency',
] as const
export const PARTNER_OTHER_INCOME_RELEVANT_CODES = [
  'partner_friends_or_family_relevant',
  'partner_maintenance_relevant',
  'partner_property_or_lodger_relevant',
  'partner_pension_relevant',
  'partner_student_finance_relevant',
  'partner_other_relevant',
] as const
export const PARTNER_OTHER_INCOME_VALUE_CODES = [
  'partner_friends_or_family_conditional_value',
  'partner_maintenance_conditional_value',
  'partner_property_or_lodger_conditional_value',
  'partner_pension_conditional_value',
  'partner_student_finance_conditional_value',
  'partner_other_conditional_value',
] as const
export const PARTNER_OTHER_INCOME_FREQUENCY_CODES = [
  'partner_friends_or_family_frequency',
  'partner_maintenance_frequency',
  'partner_property_or_lodger_frequency',
  'partner_pension_frequency',
] as const
export const OTHER_INCOME_FREQUENCIES = ['every_week', 'every_two_weeks', 'every_four_weeks', 'monthly'] as const
export const OUTGOINGS_RELEVANT_CODES = [
  'childcare_payments_relevant',
  'maintenance_payments_relevant',
  'legal_aid_payments_relevant',
] as const
export const OUTGOINGS_VALUE_CODES = [
  'childcare_payments_conditional_value',
  'maintenance_payments_conditional_value',
  'legal_aid_payments_conditional_value',
] as const
export const OUTGOINGS_FREQUENCY_CODES = [
  'childcare_payments_frequency',
  'maintenance_payments_frequency',
  'legal_aid_payments_frequency',
] as const
export const OUTGOINGS_FREQUENCIES = ['every_week', 'every_two_weeks', 'every_four_weeks', 'monthly'] as const
export const PARTNER_OUTGOINGS_RELEVANT_CODES = [
  'partner_childcare_payments_relevant',
  'partner_maintenance_payments_relevant',
  'partner_legal_aid_payments_relevant',
] as const
export const PARTNER_OUTGOINGS_VALUE_CODES = [
  'partner_childcare_payments_conditional_value',
  'partner_maintenance_payments_conditional_value',
  'partner_legal_aid_payments_conditional_value',
] as const
export const PARTNER_OUTGOINGS_FREQUENCY_CODES = [
  'partner_childcare_payments_frequency',
  'partner_maintenance_payments_frequency',
  'partner_legal_aid_payments_frequency',
] as const
export const SHARED_OWNERSHIP_HOUSING_COST_AMOUNT_CODES = [
  'rent',
  'shared_ownership_mortgage',
  'housing_benefit_value',
] as const
export const SHARED_OWNERSHIP_HOUSING_COST_FREQUENCIES = [
  'every_week',
  'every_two_weeks',
  'every_four_weeks',
  'monthly',
  'total',
] as const
export const SHARED_OWNERSHIP_HOUSING_BENEFIT_FREQUENCIES = [
  'every_week',
  'every_two_weeks',
  'every_four_weeks',
  'monthly',
] as const
export const PROPERTY_ENTRY_VALUE_CODES = ['house_value', 'mortgage', 'percentage_owned'] as const
export const PROPERTY_ENTRY_ANSWER_CODES = [...PROPERTY_ENTRY_VALUE_CODES, 'house_in_dispute'] as const

/** Allowed values for controlled-work choice answers. Count answers use a whole-number validator. */
export const CONTROLLED_WORK_ANSWER_OPTIONS = {
  'immigration-or-asylum': YES_NO_OPTIONS,
  'controlled-legal-representation': YES_NO_OPTIONS,
  'aggregated-means': YES_NO_OPTIONS,
  'regular-income': YES_NO_OPTIONS,
  'under-18-assets': YES_NO_OPTIONS,
  'immigration-or-asylum-type': MATTER_TYPE_OPTIONS,
  'asylum-support': YES_NO_OPTIONS,
  'property-owned': PROPERTY_OWNERSHIP_OPTIONS,
  'additional-property-owned': PROPERTY_OWNERSHIP_OPTIONS,
  'property-landlord': YES_NO_OPTIONS,
  house_in_dispute: YES_NO_OPTIONS,
  combined_frequency: SHARED_OWNERSHIP_HOUSING_COST_FREQUENCIES,
  housing_benefit_relevant: YES_NO_OPTIONS,
  housing_benefit_frequency: SHARED_OWNERSHIP_HOUSING_BENEFIT_FREQUENCIES,
  partner: YES_NO_OPTIONS,
  'partner-over-60': YES_NO_OPTIONS,
  passporting: YES_NO_OPTIONS,
  'child-dependants': YES_NO_OPTIONS,
  'adult-dependants': YES_NO_OPTIONS,
  'dependants-get-income': YES_NO_OPTIONS,
  'employment-status': EMPLOYMENT_STATUS_OPTIONS,
  'income-completed': ['yes'],
  'receives-benefits': YES_NO_OPTIONS,
  'benefit-details-completed': ['yes'],
  friends_or_family_relevant: YES_NO_OPTIONS,
  maintenance_relevant: YES_NO_OPTIONS,
  property_or_lodger_relevant: YES_NO_OPTIONS,
  pension_relevant: YES_NO_OPTIONS,
  student_finance_relevant: YES_NO_OPTIONS,
  other_relevant: YES_NO_OPTIONS,
  partner_friends_or_family_relevant: YES_NO_OPTIONS,
  partner_maintenance_relevant: YES_NO_OPTIONS,
  partner_property_or_lodger_relevant: YES_NO_OPTIONS,
  partner_pension_relevant: YES_NO_OPTIONS,
  partner_student_finance_relevant: YES_NO_OPTIONS,
  partner_other_relevant: YES_NO_OPTIONS,
  childcare_payments_relevant: YES_NO_OPTIONS,
  maintenance_payments_relevant: YES_NO_OPTIONS,
  legal_aid_payments_relevant: YES_NO_OPTIONS,
  partner_childcare_payments_relevant: YES_NO_OPTIONS,
  partner_maintenance_payments_relevant: YES_NO_OPTIONS,
  partner_legal_aid_payments_relevant: YES_NO_OPTIONS,
  'other-income-completed': ['yes'],
  'partner-employment-status': EMPLOYMENT_STATUS_OPTIONS,
  'partner-income-completed': ['yes'],
  'partner-receives-benefits': YES_NO_OPTIONS,
  'partner-benefit-details-completed': ['yes'],
  'partner-other-income-completed': ['yes'],
} as const

type ChoiceAnswerCode = keyof typeof CONTROLLED_WORK_ANSWER_OPTIONS
export type OtherIncomeValueAnswerCode =
  | (typeof OTHER_INCOME_VALUE_CODES)[number]
  | (typeof PARTNER_OTHER_INCOME_VALUE_CODES)[number]
export type OtherIncomeFrequencyAnswerCode =
  | (typeof OTHER_INCOME_FREQUENCY_CODES)[number]
  | (typeof PARTNER_OTHER_INCOME_FREQUENCY_CODES)[number]
export type OutgoingsValueAnswerCode =
  | (typeof OUTGOINGS_VALUE_CODES)[number]
  | (typeof PARTNER_OUTGOINGS_VALUE_CODES)[number]
export type OutgoingsFrequencyAnswerCode =
  | (typeof OUTGOINGS_FREQUENCY_CODES)[number]
  | (typeof PARTNER_OUTGOINGS_FREQUENCY_CODES)[number]
export type ControlledWorkCountAnswerCode = (typeof CONTROLLED_WORK_COUNT_ANSWER_CODES)[number]
export type ControlledWorkAnswerCode =
  | ChoiceAnswerCode
  | ControlledWorkCountAnswerCode
  | OtherIncomeValueAnswerCode
  | OtherIncomeFrequencyAnswerCode
  | OutgoingsValueAnswerCode
  | OutgoingsFrequencyAnswerCode
  | (typeof SHARED_OWNERSHIP_HOUSING_COST_AMOUNT_CODES)[number]
  | (typeof PROPERTY_ENTRY_ANSWER_CODES)[number]
export type ControlledWorkCountAnswer = number | string

export const CONTROLLED_WORK_ANSWER_CODES = [
  'immigration-or-asylum',
  'controlled-legal-representation',
  'aggregated-means',
  'regular-income',
  'under-18-assets',
  'immigration-or-asylum-type',
  'asylum-support',
  'property-owned',
  'additional-property-owned',
  'property-landlord',
  ...PROPERTY_ENTRY_ANSWER_CODES,
  'partner',
  'partner-over-60',
  'passporting',
  'child-dependants',
  'adult-dependants',
  'dependants-get-income',
  'employment-status',
  'income-completed',
  'receives-benefits',
  'benefit-details-completed',
  ...OTHER_INCOME_RELEVANT_CODES,
  ...OTHER_INCOME_VALUE_CODES,
  ...OTHER_INCOME_FREQUENCY_CODES,
  ...PARTNER_OTHER_INCOME_RELEVANT_CODES,
  ...PARTNER_OTHER_INCOME_VALUE_CODES,
  ...PARTNER_OTHER_INCOME_FREQUENCY_CODES,
  ...OUTGOINGS_RELEVANT_CODES,
  ...OUTGOINGS_VALUE_CODES,
  ...OUTGOINGS_FREQUENCY_CODES,
  ...PARTNER_OUTGOINGS_RELEVANT_CODES,
  ...PARTNER_OUTGOINGS_VALUE_CODES,
  ...PARTNER_OUTGOINGS_FREQUENCY_CODES,
  ...SHARED_OWNERSHIP_HOUSING_COST_AMOUNT_CODES,
  'combined_frequency',
  'housing_benefit_relevant',
  'housing_benefit_frequency',
  'other-income-completed',
  'partner-employment-status',
  'partner-income-completed',
  'partner-receives-benefits',
  'partner-benefit-details-completed',
  'partner-other-income-completed',
  ...CONTROLLED_WORK_COUNT_ANSWER_CODES,
] as const satisfies readonly ControlledWorkAnswerCode[]

/** Typed controlled-work answers. A missing key means "not answered", which is never treated as "no". */
export type ControlledWorkAnswers = {
  [Code in ChoiceAnswerCode]?: (typeof CONTROLLED_WORK_ANSWER_OPTIONS)[Code][number]
} & Partial<Record<ControlledWorkCountAnswerCode, ControlledWorkCountAnswer>>
  & Partial<Record<OtherIncomeValueAnswerCode, string>>
  & Partial<Record<OtherIncomeFrequencyAnswerCode, (typeof OTHER_INCOME_FREQUENCIES)[number]>>
  & Partial<Record<OutgoingsValueAnswerCode, string>>
  & Partial<Record<OutgoingsFrequencyAnswerCode, (typeof OUTGOINGS_FREQUENCIES)[number]>>
  & Partial<Record<(typeof SHARED_OWNERSHIP_HOUSING_COST_AMOUNT_CODES)[number], string>>
  & Partial<Record<(typeof PROPERTY_ENTRY_VALUE_CODES)[number], string | number>>

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
  income: 'income',
  benefits: 'controlled-work-benefits',
  benefitDetails: 'benefit-details',
  otherIncome: 'other-income',
  partnerDetails: 'partner-details',
  partnerEmploymentStatus: 'partner-employment-status',
  partnerIncome: 'partner-employment-income',
  partnerBenefits: 'partner-benefits',
  partnerBenefitDetails: 'partner-benefit-details',
  partnerOtherIncome: 'partner-other-income',
  outgoings: 'outgoings',
  partnerOutgoings: 'partner-outgoings',
  property: 'property',
  propertyLandlord: 'property-landlord',
  sharedOwnershipHousingCosts: 'shared-ownership-housing-costs',
  propertyEntry: 'property-entry',
  additionalProperty: 'additional-property',
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
  eligibleForChildcareCosts?: boolean
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
