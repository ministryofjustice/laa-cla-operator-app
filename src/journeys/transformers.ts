import type { Deps } from "#src/journeys/api.js";
import { TransformerRegistry } from '@ministryofjustice/hmpps-forge/core/authoring'

export const transformers = new TransformerRegistry<Deps>()

export const Transformers = {

  /**
   * Converts a "safe to call" value into a human-readable "Yes" or "No".
   * @param value - The input string indicating if it is safe to call.
   */
  SafeToCall: transformers.register(
    'SafeToCall',
    (deps) => (value: string) => {
      if (value.toLowerCase() === "safe") {
        return 'Yes'
      }
      return 'No <span class="moj-badge moj-badge--red">not safe to call</span>'
    },
  ),

    WithheldNumbersAcceptedParser: transformers.register(
    'WithheldNumbersAcceptedParser',
    (deps) => (value: boolean | null) => {
        if (value === null) {
          return null
        }
        return value ? 'yes' : 'no'
    },
  ),

  WithheldNumbersAccepted: transformers.register(
    'WithheldNumbersAccepted',
    (deps) => (value: boolean | null) => {
      if (!value) {
        return 'No <span class="moj-badge moj-badge--red">withheld numbers screened</span>'
      }
      return 'Yes'
    },
  ),

  Concat: transformers.register(
    'Concat',
    (deps) => (value: string, separator: string, ...args: string[]) => {
      return [value, ...args].join(separator)
    },
  )
}