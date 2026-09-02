/**
 * @description Tests for the utility functions in dataTransformers work as expected
 */

import { expect } from 'chai';
import type { FieldConfig } from '#types/form-controller-types.js';
import {
  safeString,
  safeOptionalString,
  isRecord,
  safeStringFromRecord,
  hasProperty,
  safeNestedField,
  booleanToString,
  capitaliseFirst,
  safeBodyString,
  extractFormFields,
  safeApiField,
  extractCurrentFields,
  normaliseSelectedCheckbox,
  isYes
} from '#src/scripts/helpers/dataTransformers.js';

describe('Data Transformation Helpers', () => {

  describe('safeString()', () => {
    it('returns empty string for null or undefined', () => {
      expect(safeString(null)).to.equal('');
      expect(safeString(undefined)).to.equal('');
    });

    it('returns the string unchanged', () => {
      expect(safeString('hello')).to.equal('hello');
    });

    it('converts number and boolean to string', () => {
      expect(safeString(123)).to.equal('123');
      expect(safeString(true)).to.equal('true');
    });

    it('returns empty string for other types', () => {
      expect(safeString({})).to.equal('');
      expect(safeString([])).to.equal('');
      expect(safeString(() => {})).to.equal('');
    });
  });

  describe('safeOptionalString()', () => {
    it('returns undefined for null or undefined', () => {
      expect(safeOptionalString(null)).to.be.undefined;
      expect(safeOptionalString(undefined)).to.be.undefined;
    });

    it('returns string for string values', () => {
      expect(safeOptionalString('world')).to.equal('world');
    });

    it('converts number and boolean to string', () => {
      expect(safeOptionalString(0)).to.equal('0');
      expect(safeOptionalString(false)).to.equal('false');
    });

    it('returns undefined for other types', () => {
      expect(safeOptionalString({})).to.be.undefined;
      expect(safeOptionalString([])).to.be.undefined;
    });
  });

  describe('isRecord()', () => {
    it('returns true for plain objects', () => {
      expect(isRecord({ a: 1 })).to.be.true;
    });

    it('returns false for null, arrays, functions, and primitives', () => {
      expect(isRecord(null)).to.be.false;
      expect(isRecord([])).to.be.false;
      expect(isRecord(() => {})).to.be.false;
      expect(isRecord(123)).to.be.false;
      expect(isRecord('test')).to.be.false;
    });
  });

  describe('safeStringFromRecord()', () => {
    it('returns string value for valid key with non-empty string', () => {
      const obj = { name: 'Alice' };
      expect(safeStringFromRecord(obj, 'name')).to.equal('Alice');
    });

    it('returns null if key missing or value not a non-empty string', () => {
      const obj = { name: '' };
      expect(safeStringFromRecord(obj, 'age')).to.be.null;
      expect(safeStringFromRecord(obj, 'name')).to.be.null;
      expect(safeStringFromRecord(null, 'name')).to.be.null;
    });
  });

  describe('hasProperty()', () => {
    it('returns true if object has property', () => {
      expect(hasProperty({ foo: 123 }, 'foo')).to.be.true;
    });

    it('returns false if not a record or property missing', () => {
      expect(hasProperty(null, 'foo')).to.be.false;
      expect(hasProperty({}, 'foo')).to.be.false;
      expect(hasProperty([], 'foo')).to.be.false;
    });
  });

  describe('safeNestedField()', () => {
    it('returns undefined when the base value is not a record', () => {
      expect(safeNestedField(null, 'a.b')).to.be.undefined;
      expect(safeNestedField('string', 'a.b')).to.be.undefined;
    });

    it('resolves a top-level field', () => {
      expect(safeNestedField({ fullName: 'John Smith' }, 'fullName')).to.equal('John Smith');
    });

    it('resolves a nested path', () => {
      expect(safeNestedField({ thirdParty: { fullName: 'John Smith' } }, 'thirdParty.fullName')).to.equal('John Smith');
    });

    it('returns undefined when an intermediate segment is missing', () => {
      expect(safeNestedField({ thirdParty: {} }, 'thirdParty.fullName')).to.be.undefined;
      expect(safeNestedField({}, 'thirdParty.fullName')).to.be.undefined;
    });
  });

  describe('booleanToString()', () => {
    it('converts boolean values to strings', () => {
      expect(booleanToString(true)).to.equal('true');
      expect(booleanToString(false)).to.equal('false');
    });

    it('passes through string boolean values', () => {
      expect(booleanToString('true')).to.equal('true');
      expect(booleanToString('false')).to.equal('false');
    });

    it('returns empty string for anything else', () => {
      expect(booleanToString('maybe')).to.equal('');
      expect(booleanToString(undefined)).to.equal('');
      expect(booleanToString(123)).to.equal('');
    });
  });

  describe('capitaliseFirst()', () => {
    it('capitalises only the first character', () => {
      expect(capitaliseFirst('fullName')).to.equal('FullName');
    });

    it('returns an empty string unchanged', () => {
      expect(capitaliseFirst('')).to.equal('');
    });
  });

  describe('safeBodyString() / extractFormFields()', () => {
    it('extracts a value present on the body', () => {
      expect(safeBodyString({ fullName: 'John Smith' }, 'fullName')).to.equal('John Smith');
    });

    it('defaults to an empty string when missing', () => {
      expect(safeBodyString({}, 'fullName')).to.equal('');
    });

    it('extracts multiple fields, defaulting missing ones', () => {
      expect(extractFormFields({ fullName: 'John Smith' }, ['fullName', 'address'])).to.deep.equal({
        fullName: 'John Smith',
        address: ''
      });
    });
  });

  describe('safeApiField()', () => {
    it('returns the raw value when no expectedType is given', () => {
      expect(safeApiField({ age: 42 }, 'age')).to.equal(42);
    });

    it('returns the value when it matches the expectedType', () => {
      expect(safeApiField({ active: true }, 'active', 'boolean')).to.equal(true);
      expect(safeApiField({ tags: ['a'] }, 'tags', 'array')).to.deep.equal(['a']);
    });

    it('falls back to an empty array for array type mismatches', () => {
      expect(safeApiField({ tags: 'not-an-array' }, 'tags', 'array')).to.deep.equal([]);
    });

    it('falls back to an empty string for other type mismatches', () => {
      expect(safeApiField({ age: 'not-a-number' }, 'age', 'number')).to.equal('');
      expect(safeApiField({ name: 123 }, 'name', 'string')).to.equal('');
    });

    it('resolves nested paths via fieldName', () => {
      expect(safeApiField({ thirdParty: { fullName: 'John Smith' } }, 'thirdParty.fullName', 'string')).to.equal('John Smith');
    });
  });

  describe('extractCurrentFields()', () => {
    it('extracts current values using default current<Field> naming', () => {
      const fieldConfigs: FieldConfig[] = [{ field: 'fullName' }];

      expect(extractCurrentFields({ fullName: 'John Smith' }, fieldConfigs)).to.deep.equal({
        currentFullName: 'John Smith'
      });
    });

    it('uses a custom currentName when provided', () => {
      const fieldConfigs: FieldConfig[] = [{ field: 'fullName', currentName: 'name' }];

      expect(extractCurrentFields({ fullName: 'John Smith' }, fieldConfigs)).to.deep.equal({ name: 'John Smith' });
    });

    it('includes an existing<Field> entry when includeExisting is set', () => {
      const fieldConfigs: FieldConfig[] = [{ field: 'fullName', includeExisting: true }];

      expect(extractCurrentFields({ fullName: 'John Smith' }, fieldConfigs)).to.deep.equal({
        currentFullName: 'John Smith',
        existingFullName: 'John Smith'
      });
    });

    it('keeps the original value under the field name when keepOriginal is set', () => {
      const fieldConfigs: FieldConfig[] = [{ field: 'active', keepOriginal: true, type: 'boolean' }];

      expect(extractCurrentFields({ active: true }, fieldConfigs)).to.deep.equal({
        currentActive: true,
        active: true
      });
    });

    it('omits the original field when keepOriginal value is undefined', () => {
      const fieldConfigs: FieldConfig[] = [{ field: 'active', keepOriginal: true }];

      expect(extractCurrentFields({}, fieldConfigs)).to.deep.equal({ currentActive: undefined });
    });

    it('resolves a field using a custom path', () => {
      const fieldConfigs: FieldConfig[] = [{ field: 'name', path: 'thirdParty.fullName' }];

      expect(extractCurrentFields({ thirdParty: { fullName: 'John Smith' } }, fieldConfigs)).to.deep.equal({
        currentName: 'John Smith'
      });
    });
  });

  describe('normaliseSelectedCheckbox()', () => {
    it('filters an array down to string values', () => {
      expect(normaliseSelectedCheckbox(['a', 1, 'b', null])).to.deep.equal(['a', 'b']);
    });

    it('wraps a non-empty string in an array', () => {
      expect(normaliseSelectedCheckbox('email')).to.deep.equal(['email']);
    });

    it('returns an empty array for blank strings or other types', () => {
      expect(normaliseSelectedCheckbox('   ')).to.deep.equal([]);
      expect(normaliseSelectedCheckbox(undefined)).to.deep.equal([]);
      expect(normaliseSelectedCheckbox(123)).to.deep.equal([]);
    });
  });

  describe('isYes()', () => {
    it('returns true for "yes" and "true" (case-insensitive, trimmed)', () => {
      expect(isYes(' Yes ')).to.be.true;
      expect(isYes('TRUE')).to.be.true;
    });

    it('returns false for "no" and "false"', () => {
      expect(isYes('No')).to.be.false;
      expect(isYes('FALSE')).to.be.false;
    });

    it('falls back to truthiness for anything else', () => {
      expect(isYes('maybe')).to.be.true;
      expect(isYes('')).to.be.false;
    });
  });

});

