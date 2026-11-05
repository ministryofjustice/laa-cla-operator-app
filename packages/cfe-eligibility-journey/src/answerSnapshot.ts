export type YesNoAnswer = 'yes' | 'no'
export type MoneyAnswer = string | number

export interface PropertyAnswer {
  value?: MoneyAnswer
  'mortgage-left'?: MoneyAnswer
  disputed?: YesNoAnswer
  main?: YesNoAnswer
  share?: MoneyAnswer
}

export interface EligibilityAnswers {
  category?: string
  'under-18'?: YesNoAnswer
  'under-18-receives-regular-payment'?: YesNoAnswer
  'under-18-has-valuables'?: YesNoAnswer
  'has-partner'?: YesNoAnswer
  '60-or-over'?: YesNoAnswer
  '60-or-over-with-partner'?: YesNoAnswer
  'has-property'?: YesNoAnswer
  propertySet?: PropertyAnswer[]
  'universal-credit'?: YesNoAnswer
  'income-support'?: YesNoAnswer
  'income-based-jsa'?: YesNoAnswer
  'pension-credit'?: YesNoAnswer
  'employment-support'?: YesNoAnswer
  'bank-balance'?: MoneyAnswer
  'investment-balance'?: MoneyAnswer
  'asset-balance'?: MoneyAnswer
  'credit-balance'?: MoneyAnswer
  'bank-balance-partner'?: MoneyAnswer
  'investment-balance-partner'?: MoneyAnswer
  'asset-balance-partner'?: MoneyAnswer
  'credit-balance-partner'?: MoneyAnswer
  'bank-balance-disputed'?: MoneyAnswer
  'investment-balance-disputed'?: MoneyAnswer
  'asset-balance-disputed'?: MoneyAnswer
  'credit-balance-disputed'?: MoneyAnswer
  disregards?: string[]
  'self-employed'?: YesNoAnswer
  'self-employed-partner'?: YesNoAnswer
  'dependants-16-over'?: MoneyAnswer
  'dependants-15-under'?: MoneyAnswer
  'mortgage'?: MoneyAnswer
  'mortgage-frequency'?: string
  rent?: MoneyAnswer
  'rent-frequency'?: string
  'maintenance-paid'?: MoneyAnswer
  'maintenance-paid-frequency'?: string
  'childcare-costs'?: MoneyAnswer
  'childcare-costs-frequency'?: string
  'legal-aid-contributions'?: MoneyAnswer
  'earnings'?: MoneyAnswer
  'earnings-frequency'?: string
  'income-tax'?: MoneyAnswer
  'income-tax-frequency'?: string
  'national-insurance'?: MoneyAnswer
  'national-insurance-frequency'?: string
  'self-employment-drawings'?: MoneyAnswer
  'self-employment-drawings-frequency'?: string
  'income-benefits'?: MoneyAnswer
  'income-benefits-frequency'?: string
  'tax-credits'?: MoneyAnswer
  'tax-credits-frequency'?: string
  'child-benefit'?: MoneyAnswer
  'child-benefit-frequency'?: string
  'maintenance-received'?: MoneyAnswer
  'maintenance-received-frequency'?: string
  'pension-income'?: MoneyAnswer
  'pension-income-frequency'?: string
  'other-income'?: MoneyAnswer
  'other-income-frequency'?: string
  'earnings-partner'?: MoneyAnswer
  'earnings-partner-frequency'?: string
  'income-tax-partner'?: MoneyAnswer
  'income-tax-partner-frequency'?: string
  'national-insurance-partner'?: MoneyAnswer
  'national-insurance-partner-frequency'?: string
  'self-employment-drawings-partner'?: MoneyAnswer
  'self-employment-drawings-partner-frequency'?: string
  'income-benefits-partner'?: MoneyAnswer
  'income-benefits-partner-frequency'?: string
  'tax-credits-partner'?: MoneyAnswer
  'tax-credits-partner-frequency'?: string
  'child-benefit-partner'?: MoneyAnswer
  'child-benefit-partner-frequency'?: string
  'maintenance-received-partner'?: MoneyAnswer
  'maintenance-received-partner-frequency'?: string
  'pension-income-partner'?: MoneyAnswer
  'pension-income-partner-frequency'?: string
  'other-income-partner'?: MoneyAnswer
  'other-income-partner-frequency'?: string
  'dependants-16-over-partner'?: MoneyAnswer
  'dependants-15-under-partner'?: MoneyAnswer
  'mortgage-partner'?: MoneyAnswer
  'mortgage-partner-frequency'?: string
  'rent-partner'?: MoneyAnswer
  'rent-partner-frequency'?: string
  'maintenance-paid-partner'?: MoneyAnswer
  'maintenance-paid-partner-frequency'?: string
  'childcare-costs-partner'?: MoneyAnswer
  'childcare-costs-partner-frequency'?: string
  'legal-aid-contributions-partner'?: MoneyAnswer
}

export interface EligibilityAnswerSnapshot {
  schemaVersion: 1
  caseId: string
  clientDateOfBirth?: string
  answers: EligibilityAnswers
}

export interface MissingEligibilityAnswer {
  answerCode: string
  stepPath: string
}

const BENEFIT_CODES = [
  'universal-credit',
  'income-support',
  'income-based-jsa',
  'pension-credit',
  'employment-support',
] as const

const SAVINGS_CODES = [
  'bank-balance',
  'investment-balance',
  'asset-balance',
  'credit-balance',
] as const

const DISPUTED_SAVINGS_CODES = [
  'bank-balance-disputed',
  'investment-balance-disputed',
  'asset-balance-disputed',
  'credit-balance-disputed',
] as const

const INCOME_CODES = [
  'earnings',
  'income-tax',
  'national-insurance',
  'self-employment-drawings',
  'income-benefits',
  'tax-credits',
  'child-benefit',
  'maintenance-received',
  'pension-income',
  'other-income',
] as const
const PARTNER_INCOME_CODES = INCOME_CODES.filter((code) => code !== 'child-benefit')

const EXPENSE_CODES = [
  'mortgage',
  'rent',
  'maintenance-paid',
  'childcare-costs',
] as const

const VALID_ANSWER_CODES = new Set<string>([
  'category',
  'under-18',
  'under-18-receives-regular-payment',
  'under-18-has-valuables',
  'has-partner',
  '60-or-over',
  '60-or-over-with-partner',
  'has-property',
  'propertySet',
  ...BENEFIT_CODES,
  ...SAVINGS_CODES,
  ...SAVINGS_CODES.map((code) => `${code}-partner`),
  ...DISPUTED_SAVINGS_CODES,
  'disregards',
  'self-employed',
  'self-employed-partner',
  ...INCOME_CODES,
  ...INCOME_CODES.map((code) => `${code}-frequency`),
  ...INCOME_CODES.map((code) => `${code}-partner`),
  ...INCOME_CODES.map((code) => `${code}-partner-frequency`),
  ...EXPENSE_CODES,
  ...EXPENSE_CODES.map((code) => `${code}-frequency`),
  ...EXPENSE_CODES.map((code) => `${code}-partner`),
  ...EXPENSE_CODES.map((code) => `${code}-partner-frequency`),
  'legal-aid-contributions',
  'legal-aid-contributions-partner',
  'dependants-16-over',
  'dependants-15-under',
])

export function isEligibilityAnswerCode(code: string): boolean {
  return VALID_ANSWER_CODES.has(code) ||
    /^(value|mortgage-left|disputed|main|share)_\d+$/u.test(code)
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

function isYesNo(value: unknown): value is YesNoAnswer {
  return value === 'yes' || value === 'no'
}

function isValidAmount(value: unknown): boolean {
  if (!isPresent(value) || (typeof value !== 'string' && typeof value !== 'number')) {
    return false
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 99_999_999.98 && /^\d+(\.\d{1,2})?$/u.test(String(value))
}

function isValidCount(value: unknown): boolean {
  return isPresent(value) && Number.isInteger(Number(value)) && Number(value) >= 0
}

function isDebtOrFamily(answers: Record<string, unknown>): boolean {
  return answers.category === 'debt' || answers.category === 'family'
}

function addCodes(target: Set<string>, ...codes: string[]): void {
  for (const code of codes) target.add(code)
}

function benefitsArePassported(answers: Record<string, unknown>): boolean {
  return BENEFIT_CODES.some((code) => answers[code] === 'yes')
}

function isUnder18Passported(answers: Record<string, unknown>): boolean {
  return answers['under-18'] === 'yes' &&
    answers['under-18-receives-regular-payment'] === 'no' &&
    answers['under-18-has-valuables'] === 'no'
}

function activeCodes(answers: Record<string, unknown>): Set<string> {
  const codes = new Set<string>(['category', 'under-18'])
  if (!isYesNo(answers['under-18'])) return codes

  if (answers['under-18'] === 'yes') {
    codes.add('under-18-receives-regular-payment')
    if (!isYesNo(answers['under-18-receives-regular-payment'])) return codes
    if (answers['under-18-receives-regular-payment'] === 'no') {
      codes.add('under-18-has-valuables')
      if (!isYesNo(answers['under-18-has-valuables'])) return codes
      if (isUnder18Passported(answers)) return codes
    }
  }

  codes.add('has-partner')
  if (!isYesNo(answers['has-partner'])) return codes
  codes.add(answers['has-partner'] === 'yes' ? '60-or-over-with-partner' : '60-or-over')

  addCodes(codes, ...BENEFIT_CODES)
  if (BENEFIT_CODES.some((code) => !isYesNo(answers[code]))) return codes

  codes.add('has-property')
  if (!isYesNo(answers['has-property'])) return codes
  if (answers['has-property'] === 'yes') {
    codes.add('propertySet')
  }

  const savingsCodes = isDebtOrFamily(answers) ? DISPUTED_SAVINGS_CODES : SAVINGS_CODES
  addCodes(codes, ...SAVINGS_CODES, ...savingsCodes)
  if (answers['has-partner'] === 'yes') {
    addCodes(codes, ...(isDebtOrFamily(answers)
      ? ['bank-balance-partner', 'investment-balance-partner', 'asset-balance-partner', 'credit-balance-partner']
      : SAVINGS_CODES.map((code) => `${code}-partner`)))
    if (isDebtOrFamily(answers)) {
      addCodes(codes, 'bank-balance-partner', 'investment-balance-partner', 'asset-balance-partner', 'credit-balance-partner')
    }
  }
  codes.add('disregards')

  if (!benefitsArePassported(answers)) {
    codes.add('self-employed')
    addCodes(codes, ...INCOME_CODES, ...INCOME_CODES.map((code) => `${code}-frequency`))
    if (answers['has-partner'] === 'yes') {
      codes.add('self-employed-partner')
      addCodes(codes, ...PARTNER_INCOME_CODES.map((code) => `${code}-partner`))
      addCodes(codes, ...PARTNER_INCOME_CODES.map((code) => `${code}-partner-frequency`))
      addCodes(codes, 'dependants-16-over', 'dependants-15-under')
    } else {
      addCodes(codes, 'dependants-16-over', 'dependants-15-under')
    }
    addCodes(codes, ...EXPENSE_CODES, ...EXPENSE_CODES.map((code) => `${code}-frequency`), 'legal-aid-contributions')
    if (answers['has-partner'] === 'yes') {
      addCodes(codes, ...EXPENSE_CODES.map((code) => `${code}-partner`))
      addCodes(codes, ...EXPENSE_CODES.map((code) => `${code}-partner-frequency`))
      codes.add('legal-aid-contributions-partner')
    }
  }

  return codes
}

export function createEligibilityAnswerSnapshot(
  caseId: string,
  answers: Record<string, unknown>,
  properties: PropertyAnswer[],
  clientDateOfBirth: unknown,
): EligibilityAnswerSnapshot {
  const allowedCodes = activeCodes(answers)
  const activeAnswers: Record<string, unknown> = {}

  for (const code of allowedCodes) {
    if (isEligibilityAnswerCode(code) && code in answers) {
      activeAnswers[code] = answers[code]
    }
  }
  if (allowedCodes.has('propertySet')) activeAnswers.propertySet = properties

  return {
    schemaVersion: 1,
    caseId,
    ...(typeof clientDateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(clientDateOfBirth)
      ? { clientDateOfBirth }
      : {}),
    answers: activeAnswers as EligibilityAnswers,
  }
}

export function findFirstMissingEligibilityAnswer(
  answers: Record<string, unknown>,
  properties: PropertyAnswer[],
): MissingEligibilityAnswer | undefined {
  const required: Array<{ code: string; stepPath: string; valid?: (value: unknown) => boolean }> = []
  const addYesNo = (code: string, stepPath: string) => required.push({ code, stepPath, valid: isYesNo })
  const addMoney = (code: string, stepPath: string) => required.push({ code, stepPath, valid: isValidAmount })

  addYesNo('under-18', 'under-18')
  if (!isYesNo(answers['under-18'])) return { answerCode: 'under-18', stepPath: 'under-18' }
  if (answers['under-18'] === 'yes') {
    addYesNo('under-18-receives-regular-payment', 'under-18-receives-regular-payment')
    if (!isYesNo(answers['under-18-receives-regular-payment'])) {
      return { answerCode: 'under-18-receives-regular-payment', stepPath: 'under-18-receives-regular-payment' }
    }
    if (answers['under-18-receives-regular-payment'] === 'no') {
      addYesNo('under-18-has-valuables', 'under-18-has-valuables')
      if (!isYesNo(answers['under-18-has-valuables'])) {
        return { answerCode: 'under-18-has-valuables', stepPath: 'under-18-has-valuables' }
      }
      if (isUnder18Passported(answers)) return undefined
    }
  }

  const partner = answers['has-partner']
  addYesNo('has-partner', 'has-partner')
  if (!isYesNo(partner)) return { answerCode: 'has-partner', stepPath: 'has-partner' }
  const ageCode = partner === 'yes' ? '60-or-over-with-partner' : '60-or-over'
  addYesNo(ageCode, ageCode)
  if (!isYesNo(answers[ageCode])) return { answerCode: ageCode, stepPath: ageCode }

  for (const code of BENEFIT_CODES) addYesNo(code, 'benefits')
  for (const code of BENEFIT_CODES) {
    if (!isYesNo(answers[code])) return { answerCode: code, stepPath: 'benefits' }
  }

  addYesNo('has-property', partner === 'yes' ? 'client-partner-properties' : 'properties')
  if (!isYesNo(answers['has-property'])) {
    return { answerCode: 'has-property', stepPath: partner === 'yes' ? 'client-partner-properties' : 'properties' }
  }
  if (answers['has-property'] === 'yes') {
    const propertyPath = partner === 'yes' ? 'client-partner-properties' : 'properties'
    if (properties.length === 0) return { answerCode: 'propertySet', stepPath: propertyPath }
    for (const [index, property] of properties.entries()) {
      for (const code of ['value', 'mortgage-left'] as const) {
        if (!isValidAmount(property[code])) return { answerCode: `${code}_${index}`, stepPath: propertyPath }
      }
      if (isDebtOrFamily(answers) && !isYesNo(property.disputed)) {
        return { answerCode: `disputed_${index}`, stepPath: propertyPath }
      }
      if (!isYesNo(property.main)) return { answerCode: `main_${index}`, stepPath: propertyPath }
      const share = Number(property.share)
      if (!isPresent(property.share) || !Number.isInteger(share) || share < 1 || share > 100) {
        return { answerCode: `share_${index}`, stepPath: propertyPath }
      }
    }
    if (properties.filter((property) => property.main === 'yes').length > 1) {
      return { answerCode: 'main_0', stepPath: propertyPath }
    }
  }

  const debtOrFamily = isDebtOrFamily(answers)
  const savingsOwnerCodes = debtOrFamily
    ? partner === 'yes' ? ['bank-balance', 'investment-balance', 'asset-balance', 'credit-balance', 'bank-balance-partner', 'investment-balance-partner', 'asset-balance-partner', 'credit-balance-partner', ...DISPUTED_SAVINGS_CODES] : ['bank-balance', 'investment-balance', 'asset-balance', 'credit-balance', ...DISPUTED_SAVINGS_CODES]
    : partner === 'yes' ? [...SAVINGS_CODES, ...SAVINGS_CODES.map((code) => `${code}-partner`)] : [...SAVINGS_CODES]
  const savingsPath = debtOrFamily ? 'your-undisputed-savings' : 'your-savings'
  for (const code of savingsOwnerCodes) addMoney(code, code.endsWith('-partner') ? 'partner-undisputed-savings' : code.endsWith('-disputed') ? 'disputed-savings' : savingsPath)

  for (const code of savingsOwnerCodes) {
    const item = required.find((entry) => entry.code === code)
    if (item && !item.valid?.(answers[code])) return { answerCode: code, stepPath: item.stepPath }
  }
  if (!isPresent(answers.disregards) || (Array.isArray(answers.disregards) && answers.disregards.length === 0)) {
    return { answerCode: 'disregards', stepPath: 'disregards' }
  }

  if (benefitsArePassported(answers)) return undefined

  const validateIncomeGroup = (incomeCodes: readonly string[], suffix: string, path: string, selfEmployedCode: string): MissingEligibilityAnswer | undefined => {
    if (!isYesNo(answers[selfEmployedCode])) return { answerCode: selfEmployedCode, stepPath: path }
    for (const code of incomeCodes) {
      const answerCode = `${code}${suffix}`
      if (!isValidAmount(answers[answerCode])) return { answerCode, stepPath: path }
      const frequencyCode = `${answerCode}-frequency`
      if (!['per_week', 'per_2week', 'per_4week', 'per_month', 'per_year'].includes(String(answers[frequencyCode]))) {
        return { answerCode: frequencyCode, stepPath: path }
      }
    }
    return undefined
  }
  const clientIncomeMissing = validateIncomeGroup(INCOME_CODES, '', 'your-income', 'self-employed')
  if (clientIncomeMissing) return clientIncomeMissing
  if (partner === 'yes') {
    const partnerIncomeMissing = validateIncomeGroup(PARTNER_INCOME_CODES, '-partner', 'partner-income', 'self-employed-partner')
    if (partnerIncomeMissing) return partnerIncomeMissing
  }

  const dependantsPath = partner === 'yes' ? 'partner-dependants' : 'dependants'
  const dependantCodes = ['dependants-16-over', 'dependants-15-under']
  for (const code of dependantCodes) {
    if (!isValidCount(answers[code])) return { answerCode: code, stepPath: dependantsPath }
  }

  const expensesPath = 'your-expenses'
  const expenseCodes = partner === 'yes'
    ? [...EXPENSE_CODES, ...EXPENSE_CODES.map((code) => `${code}-partner`), 'legal-aid-contributions', 'legal-aid-contributions-partner']
    : [...EXPENSE_CODES, 'legal-aid-contributions']
  for (const code of expenseCodes) {
    const ownerPath = code.endsWith('-partner') ? 'partner-expenses' : expensesPath
    if (!isValidAmount(answers[code])) return { answerCode: code, stepPath: ownerPath }
    if (!code.startsWith('legal-aid-contributions')) {
      const frequencyCode = `${code}-frequency`
      if (!['per_week', 'per_2week', 'per_4week', 'per_month', 'per_year'].includes(String(answers[frequencyCode]))) {
        return { answerCode: frequencyCode, stepPath: ownerPath }
      }
    }
  }
  return undefined
}
