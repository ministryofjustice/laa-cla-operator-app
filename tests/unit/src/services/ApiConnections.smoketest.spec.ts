/**
 * API Connections Smoke Test
 *
 * Verifies that real API service functions can execute HTTP requests through
 * middleware-axios and receive MSW responses.
 */

import { strict as assert } from 'assert';
import { create } from 'middleware-axios';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import config from '#config.js';
import { getAllCases } from '#src/services/api/caseDetailsService.js';
import type { AxiosInstanceWrapper } from '#types/axios-instance-wrapper.js';

describe('API Connections Smoke Test', () => {
  const apiConfig = config.api as { baseUrl: unknown };
  let originalBaseUrl: unknown;

  const server = setupServer(
    http.get('http://api.test/call_centre/api/v1/case/', () => {
      return HttpResponse.json({
        count: 2,
        results: [
          { reference: 'FA-1111-1111', full_name: 'Test User One' },
          { reference: 'FA-2222-2222', full_name: 'Test User Two' },
        ],
      });
    }),
    http.get('http://api.test/call_centre/api/v1/case/error', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  before(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  beforeEach(() => {
    originalBaseUrl = apiConfig.baseUrl;
    apiConfig.baseUrl = 'http://api.test';
  });

  afterEach(() => {
    apiConfig.baseUrl = originalBaseUrl;
  });

  after(() => {
    server.close();
  });

  it('returns mocked data through getAllCases', async () => {
    const axiosWrapper = create({ timeout: 5000 }) as AxiosInstanceWrapper;

    const result = await getAllCases(axiosWrapper);

    assert.equal(result.count, 2);
    assert.equal(result.results.length, 2);
    assert.equal(result.results[0].reference, 'FA-1111-1111');
  });

  it('surfaces transport errors from middleware-axios request', async () => {
    const axiosWrapper = create({ timeout: 5000 }) as AxiosInstanceWrapper;

    await assert.rejects(async () => {
      await axiosWrapper.get('/call_centre/api/v1/case/error');
    });
  });
});
