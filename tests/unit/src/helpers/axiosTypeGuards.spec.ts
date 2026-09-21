import { strict as assert } from 'assert';
import { isAxiosInstanceWrapper } from '#src/helpers/axiosTypeGuards.js';

describe('axiosTypeGuards', () => {
  describe('isAxiosInstanceWrapper', () => {
    it('returns false for null and undefined', () => {
      assert.equal(isAxiosInstanceWrapper(null), false);
      assert.equal(isAxiosInstanceWrapper(undefined), false);
    });

    it('returns false for primitives', () => {
      assert.equal(isAxiosInstanceWrapper('x'), false);
      assert.equal(isAxiosInstanceWrapper(1), false);
      assert.equal(isAxiosInstanceWrapper(true), false);
    });

    it('returns false when required fields are missing', () => {
      assert.equal(isAxiosInstanceWrapper({}), false);
      assert.equal(isAxiosInstanceWrapper({ axiosInstance: {} }), false);
      assert.equal(isAxiosInstanceWrapper({ get: () => undefined }), false);
    });

    it('returns true when axiosInstance and get are present', () => {
      const candidate = {
        axiosInstance: { defaults: { headers: { common: {} } } },
        get: () => Promise.resolve({ data: {} }),
      };

      assert.equal(isAxiosInstanceWrapper(candidate), true);
    });
  });
});
