/**
 * @description Tests for src/helpers/dataTransformers.ts
 */

import { expect } from 'chai';
import {
  capitaliseFirst,
  extractFormFields
} from '#src/helpers/dataTransformers.js';

describe('src/helpers/dataTransformers', () => {
  describe('capitaliseFirst()', () => {
    it('capitalises the first letter of each word', () => {
      expect(capitaliseFirst('john smith')).to.equal('John Smith');
    });

    it('leaves an already-capitalised string unchanged', () => {
      expect(capitaliseFirst('Jane Doe')).to.equal('Jane Doe');
    });

    it('returns an empty string unchanged', () => {
      expect(capitaliseFirst('')).to.equal('');
    });
  });

  describe('extractFormFields()', () => {
    it('extracts the requested keys from the body', () => {
      const body = { fullName: 'John Smith', address: '123 Test Street', unused: 'ignored' };

      expect(extractFormFields(body, ['fullName', 'address'])).to.deep.equal({
        fullName: 'John Smith',
        address: '123 Test Street'
      });
    });

    it('defaults missing keys to an empty string', () => {
      expect(extractFormFields({}, ['fullName'])).to.deep.equal({ fullName: '' });
    });

    it('returns an empty object when no keys are requested', () => {
      expect(extractFormFields({ fullName: 'John Smith' }, [])).to.deep.equal({});
    });
  });
});
