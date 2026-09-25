import sinon from "sinon"
import type { Request, Response } from "express";

const FIRST_ARGUMENT = 0

/**
 * Get a test express request object
 * @returns {Request} - Returns a test express request object
 */
export function createTestRequest(): Request  {
    return {
        session: {
            // Creates a Sinon stub that, when called, calls its first argument with null
            // This is useful when the req.session.save is wrapped in a promise
            save: sinon.stub().callsArgWith(FIRST_ARGUMENT, null),
        },
        query: {}
    } as unknown as Request;
}

/**
 * Get a test express response object
 * @returns {Response} - Returns a test express response object
 */
export function createTestResponse(): Response {
    return {
        redirect: sinon.stub(),
        send: sinon.stub(),
    } as unknown as Response;
}