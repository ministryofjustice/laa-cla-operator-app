import { strict as assert } from 'assert';
import sinon from 'sinon';
import type { Application, NextFunction, Request, Response } from 'express';
import { setupGlobalErrorHandler } from '#src/middleware/errorHandler.js';

describe('setupGlobalErrorHandler', () => {
  beforeEach(() => {
    sinon.stub(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('registers middleware that renders the error page with normalized message', () => {
    const use = sinon.stub();
    const app = { use } as unknown as Application;

    setupGlobalErrorHandler(app);

    assert.equal(use.calledOnce, true);

    const registeredHandler = use.firstCall.args[0] as (
      error: unknown,
      req: Request,
      res: Response,
      next: NextFunction
    ) => void;

    const req = {} as Request;
    const next = sinon.stub();
    const render = sinon.stub();
    const res = {
      headersSent: false,
      status: sinon.stub().callsFake(() => res),
      render,
    } as unknown as Response;

    registeredHandler(new Error('db down'), req, res, next);

    assert.equal((res.status as unknown as sinon.SinonStub).calledOnceWithExactly(500), true);
    assert.equal(render.calledOnce, true);
    assert.equal(render.firstCall.args[0], 'main/error.njk');
    assert.deepEqual(render.firstCall.args[1], {
      status: 500,
      error: 'An unexpected error occurred. Please try again.',
    });
    assert.equal(next.called, false);
  });

  it('delegates to next when headers were already sent', () => {
    const use = sinon.stub();
    const app = { use } as unknown as Application;

    setupGlobalErrorHandler(app);

    const registeredHandler = use.firstCall.args[0] as (
      error: unknown,
      req: Request,
      res: Response,
      next: NextFunction
    ) => void;

    const req = {} as Request;
    const next = sinon.stub();
    const status = sinon.stub();
    const render = sinon.stub();
    const error = new Error('response already in flight');
    const res = {
      headersSent: true,
      status,
      render,
    } as unknown as Response;

    registeredHandler(error, req, res, next);

    assert.equal(next.calledOnceWithExactly(error), true);
    assert.equal(status.called, false);
    assert.equal(render.called, false);
  });
});
