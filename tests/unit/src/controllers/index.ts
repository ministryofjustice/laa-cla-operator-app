import sinon from "sinon";
import type { Request, Response } from "express";

const FIRST_ARGUMENT = 0;

/**
 * Get a test express request object
 * @param {Record<string, unknown>} overrides - additional request properties
 * @returns {Request} - Returns a test express request object
 */
export function createTestRequest(overrides?: Record<string, unknown>): Request {
  const req = {
    session: {
      // Creates a Sinon stub that, when called, calls its first argument with null
      // This is useful when the req.session.save is wrapped in a promise
      save: sinon.stub().callsArgWith(FIRST_ARGUMENT, null),
      destroy: sinon.stub().callsArgWith(FIRST_ARGUMENT, null),
      regenerate: sinon.stub().callsArgWith(FIRST_ARGUMENT, null),
    },
    query: {}
  }
  if(overrides !== undefined) {
    if(overrides.session !== undefined) {
      Object.assign(req.session, overrides.session)
      delete overrides.session
    }
    Object.assign(req, overrides)
  }
  // eslint-disable-next-line  @typescript-eslint/no-unsafe-type-assertion -- This test request
  return req as unknown as Request
}

/**
 * Get a test express response object
 * @param {Record<string, unknown>} overrides - additional response properties
 * @returns {Response} - Returns a test express response object
 */
export function createTestResponse(overrides?: Record<string, unknown>): Response {
  const response = {
    redirect: sinon.stub(),
    send: sinon.stub(),
    status: sinon.stub(),
    clearCookie: sinon.stub()
  };
  response.status.returns(response);
  if(overrides !== undefined) {
    Object.assign(response, overrides)
  }
  // eslint-disable-next-line  @typescript-eslint/no-unsafe-type-assertion -- This test response
  return response as unknown as Response;
}
