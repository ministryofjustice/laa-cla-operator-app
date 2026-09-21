import { strict as assert } from 'assert';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { Request, Response, NextFunction } from 'express';
import {
  createApiMiddleware,
  hasValidSilasToken,
  requireAuth,
  setAuthStatus,
} from '#src/middleware/apiMiddleware.js';

describe('apiMiddleware', () => {
  const server = setupServer();

  before(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  after(() => {
    server.close();
  });

  it('attaches axios middleware to request and calls next', () => {
    const middleware = createApiMiddleware({ enableLogging: false });
    const req = { session: {} } as unknown as Request;
    const res = {} as Response;
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.ok(req.axiosMiddleware);
    assert.equal(typeof req.axiosMiddleware.get, 'function');
    assert.ok(req.state);
    assert.strictEqual(req.state.authenticatedAxios, req.axiosMiddleware);
  });

  it('adds authorization header from authService', async () => {
    const middleware = createApiMiddleware({
      enableLogging: false,
      authService: {
        getAuthHeader: async () => 'Bearer test-token',
        clearTokens: () => undefined,
      },
    });

    const req = { session: {} } as unknown as Request;
    const res = {} as Response;

    middleware(req, res, (() => undefined) as NextFunction);

    server.use(
      http.get('http://api.test/auth-header', ({ request }) => {
        const authHeader = request.headers.get('authorization');

        if (authHeader === 'Bearer test-token') {
          return HttpResponse.json({ ok: true });
        }

        return new HttpResponse(null, { status: 401 });
      })
    );

    const response = await req.axiosMiddleware.get('http://api.test/auth-header');

    assert.equal(response.status, 200);
    assert.deepEqual(response.data, { ok: true });
  });

  it('clears tokens on 401 responses', async () => {
    let clearTokensCalls = 0;

    const middleware = createApiMiddleware({
      enableLogging: false,
      authService: {
        getAuthHeader: async () => 'Bearer expired-token',
        clearTokens: () => {
          clearTokensCalls += 1;
        },
      },
    });

    const req = { session: {} } as unknown as Request;
    const res = {} as Response;

    middleware(req, res, (() => undefined) as NextFunction);

    server.use(
      http.get('http://api.test/unauthorized', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    await assert.rejects(async () => {
      await req.axiosMiddleware.get('http://api.test/unauthorized');
    });

    assert.equal(clearTokensCalls, 1);
  });

  it('does not throw when getAuthHeader fails', async () => {
    let called = 0;

    const middleware = createApiMiddleware({
      enableLogging: false,
      authService: {
        getAuthHeader: async () => {
          called += 1;
          throw new Error('header unavailable');
        },
        clearTokens: () => undefined,
      },
    });

    const req = { session: {} } as unknown as Request;
    const res = {} as Response;

    middleware(req, res, (() => undefined) as NextFunction);

    server.use(
      http.get('http://api.test/no-auth-required', () => {
        return HttpResponse.json({ ok: true });
      })
    );

    const response = await req.axiosMiddleware.get('http://api.test/no-auth-required');

    assert.equal(called, 1);
    assert.equal(response.status, 200);
  });
});

describe('requireAuth', () => {
  it('redirects to sign-in when silasAuth is missing from session', () => {
    const req = { session: {} } as unknown as Request;
    let redirectedTo = '';
    let nextCalled = false;

    const res = {
      redirect: (path: string) => {
        redirectedTo = path;
      },
    } as unknown as Response;

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(redirectedTo, '/sign-in');
    assert.equal(nextCalled, false);
  });

  it('calls next when silasAuth token is valid', () => {
    const req = {
      session: {
        silasAuth: {
          accessToken: 'token',
          idToken: 'id-token',
          expiresAt: Date.now() + 10_000,
          email: 'user@example.com',
          name: 'User',
        },
      },
    } as unknown as Request;

    const res = {
      redirect: () => undefined,
    } as unknown as Response;

    let nextCalled = false;

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });
});

describe('hasValidSilasToken', () => {
  it('returns false for undefined', () => {
    assert.equal(hasValidSilasToken(undefined), false);
  });

  it('returns false for expired token', () => {
    const token = {
      accessToken: 'token',
      idToken: 'id-token',
      expiresAt: Date.now() - 1,
      email: 'user@example.com',
      name: 'User',
    };

    assert.equal(hasValidSilasToken(token), false);
  });

  it('returns true for unexpired token', () => {
    const token = {
      accessToken: 'token',
      idToken: 'id-token',
      expiresAt: Date.now() + 1_000,
      email: 'user@example.com',
      name: 'User',
    };

    assert.equal(hasValidSilasToken(token), true);
  });
});

describe('setAuthStatus', () => {
  it('sets locals for unauthenticated users without silasAuth in session', () => {
    const req = { session: {} } as unknown as Request;
    const res = { locals: {} as Record<string, unknown> } as Response;

    let nextCalled = false;

    setAuthStatus(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.locals.isAuthenticated, false);
    assert.equal(res.locals.userEmail, null);
    assert.equal(res.locals.userName, null);
    assert.equal(nextCalled, true);
  });

  it('sets locals for authenticated users', () => {
    const req = {
      session: {
        silasAuth: {
          accessToken: 'token',
          idToken: 'id-token',
          expiresAt: Date.now() + 10_000,
          email: 'user@example.com',
          name: 'User',
        },
        user: {
          email: 'user@example.com',
          name: 'User',
          oid: 'oid-123',
        },
      },
    } as unknown as Request;

    const res = { locals: {} as Record<string, unknown> } as Response;

    setAuthStatus(req, res, (() => undefined) as NextFunction);

    assert.equal(res.locals.isAuthenticated, true);
    assert.equal(res.locals.userEmail, 'user@example.com');
    assert.equal(res.locals.userName, 'User');
  });
});
