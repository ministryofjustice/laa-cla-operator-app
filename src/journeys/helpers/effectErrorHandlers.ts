import type { EffectFunctionContext } from "#node_modules/@ministryofjustice/hmpps-forge/dist/core/index.js";
import type { AxiosLikeError, ErrorSummary, EffectBody } from "#types/form-validation.js";
import { HTTP_BAD_GATEWAY, HTTP_SERVICE_UNAVAILABLE, HTTP_GATEWAY_TIMEOUT, EXTERNAL_SERVICE_ERROR_ANCHOR } from "#src/journeys/helpers/constants.js";
import { extractErrorMessage } from "#src/scripts/helpers/index.js";

/**
 * Checks if the given error has a service unavailable HTTP status.
 * @param {unknown} error - The error object to check.
 * @returns {boolean} True if the error has a service unavailable status, otherwise false.
 */
function hasServiceUnavailableStatus(error: unknown): boolean {
    if (error === null || error === undefined || typeof error !== "object") {
        return false;
    }

    const candidate = error as AxiosLikeError;
    const status = candidate.response?.status;

    return status === HTTP_BAD_GATEWAY || status === HTTP_SERVICE_UNAVAILABLE || status === HTTP_GATEWAY_TIMEOUT;
}

/**
 * Checks if the given error has a network code.
 * 
 * @param {unknown} error - The error object to check.
 * @returns {boolean} True if the error has a network code, otherwise false.
 */
function hasNetworkCode(error: unknown): boolean {
    if (error === null || error === undefined || typeof error !== "object") {
        return false;
    }

    const candidate = error as AxiosLikeError;
    return typeof candidate.code === "string";
}

/**
 * Returns a GOV.UK error summary entry when the external API is unavailable.
 * @param {unknown} error - The error object to check.
 * @returns {ErrorSummary | null} The error summary entry if the external service is unavailable, otherwise null.
 */
export function mapExternalServiceErrorToSummary(error: unknown): ErrorSummary | null {
    if (error instanceof Error) {
        if (hasServiceUnavailableStatus(error.cause) || hasNetworkCode(error.cause)) {
            return {
                text: error.message,
                href: `#${EXTERNAL_SERVICE_ERROR_ANCHOR}`,
            };
        }
    }

    if (hasServiceUnavailableStatus(error) || hasNetworkCode(error)) {
        return {
            text: extractErrorMessage(error),
            href: `#${EXTERNAL_SERVICE_ERROR_ANCHOR}`,
        };
    }

    return null;
}

/**
 * Wraps an effect with service unavailability handling so callers can avoid local try/catch blocks.
 * @param {EffectBody} effectBody - Effect implementation to execute.
 * @returns {EffectBody} Wrapped effect implementation.
 */
export function withServiceUnavailableSummary(effectBody: EffectBody): EffectBody {
    return async (context: EffectFunctionContext): Promise<void> => {
        try {
            await effectBody(context);
            context.setData("serviceUnavailableError", null);
        } catch (error) {
            const serviceError = mapExternalServiceErrorToSummary(error);

            if (serviceError !== null) {
                context.setData("serviceUnavailableError", serviceError);
                return;
            }

            throw error;
        }
    };
}