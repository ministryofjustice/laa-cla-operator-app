import { expect } from 'chai';

import { isBlankString } from '#src/helpers/dataTransformers.js';

describe('Data Transformation Helpers', () => {
  describe('isBlankString()', () => {
    it('returns true for undefined, null, and empty string', () => {
      expect(isBlankString(undefined)).to.equal(true);
      expect(isBlankString(null)).to.equal(true);
      expect(isBlankString('')).to.equal(true);
    });

    it('returns false for non-empty strings', () => {
      expect(isBlankString('postcode')).to.equal(false);
      expect(isBlankString(' ')).to.equal(false);
    });
  });
});