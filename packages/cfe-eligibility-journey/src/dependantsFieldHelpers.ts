import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'

export const MAX_DEPENDANTS = 50
export const MAX_DEPENDANTS_MESSAGE = 'Enter 50 or fewer dependants'

/**
 * Shared max-count validation for any dependants field in the journey (client and partner,
 * 16-and-over and 15-and-under).
 * @returns {unknown} The max-count validation rule
 */
export function dependantsMaxValidation() {
  return validation({
    condition: Self().match(Condition.Number.LessThanOrEqual(MAX_DEPENDANTS)),
    message: MAX_DEPENDANTS_MESSAGE,
  })
}
