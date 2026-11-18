import { type StepDefinition as ForgeStepDefinition, step as forgeStep } from '@ministryofjustice/hmpps-forge/core/authoring'

export interface StepDefinition extends ForgeStepDefinition {
    code: string
}

/**
 * Creates a step definition for the financial eligibility journey.
 * @param {Omit<StepDefinition, 'type'>} definition - The step definition without the 'type' property
 * @returns {StepDefinition} The complete step definition with the 'type' property added
 */
export function step<D extends StepDefinition>(definition: Omit<D, 'type'>): D {
    return forgeStep(definition) as D
}