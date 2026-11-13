import { TransformerRegistry } from '@ministryofjustice/hmpps-forge/core/authoring'
import type { Deps } from '#packages/cfe-eligibility-journey/src/api.js'

export interface TransformerRegistryDeps {
  formatCurrency: (value: number) => string | unknown
}

export const transformers = new TransformerRegistry<TransformerRegistryDeps>()

export const Transformers = {
  Currency: transformers.register('CfeCurrency', {
    /**
     * Factory function to create a transformer that formats a number as currency.
     * @param {Deps} deps Dependencies required for the transformer (not used in this case).
     * @returns {(value: number) => string} A function that takes a number and returns it formatted as currency.
     */
    factory: (deps) => (value: number) => deps.formatCurrency(value),
  })
}