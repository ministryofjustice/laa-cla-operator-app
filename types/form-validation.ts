/**
 * Common types and interfaces for form validation and error handling.
 */

import type { EffectFunctionContext } from "#node_modules/@ministryofjustice/hmpps-forge/dist/core/index.js";

export interface InputError {
  fieldName: string;
  text: string;
}

export interface ErrorSummary {
  text: string;
  href?: string;
}

export interface AxiosLikeError {
    response?: { status?: number };
    code?: string;
    cause?: unknown;
}

 export type EffectBody = (context: EffectFunctionContext) => Promise<void>;
