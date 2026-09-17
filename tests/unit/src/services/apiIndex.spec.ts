import { strict as assert } from 'assert';
import * as apiIndex from '#src/services/api/index.js';
import * as caseDetails from '#src/services/api/caseDetailsService.js';

describe('services/api/index', () => {
  it('re-exports getAllCases from caseDetailsService', () => {
    assert.equal(apiIndex.getAllCases, caseDetails.getAllCases);
  });

  it('apiService.getAllCases points to getAllCases implementation', () => {
    assert.equal(apiIndex.apiService.getAllCases, caseDetails.getAllCases);
  });

  it('re-exports base API utilities', () => {
    assert.equal(typeof apiIndex.configureAxiosInstance, 'function');
    assert.equal(typeof apiIndex.handleApiCall, 'function');
  });
});
