/**
 * @description Tests for ValidationErrorHelpers
 */

import { expect } from 'chai';
import type { ValidationError, Result, Meta } from 'express-validator';
import {
  TypedValidationError,
  formatValidationError,
  createChangeDetectionValidator,
  formatValidationErrors
} from '#src/helpers/ValidationErrorHelpers.js';

describe('ValidationErrorHelpers', () => {
  describe('TypedValidationError', () => {
    it('sets name, message and errorData from the constructor argument', () => {
      const error = new TypedValidationError({ summaryMessage: 'Summary', inlineMessage: 'Inline' });

      expect(error).to.be.instanceOf(Error);
      expect(error.name).to.equal('TypedValidationError');
      expect(error.message).to.equal('Summary');
      expect(error.errorData).to.deep.equal({ summaryMessage: 'Summary', inlineMessage: 'Inline' });
    });
  });

  describe('formatValidationError', () => {
    it('returns errorData when msg is a TypedValidationError', () => {
      const typedError = new TypedValidationError({ summaryMessage: 'Summary', inlineMessage: 'Inline' });
      const error = { msg: typedError } as unknown as ValidationError;

      expect(formatValidationError(error)).to.deep.equal({ summaryMessage: 'Summary', inlineMessage: 'Inline' });
    });

    it('formats a record msg with string values', () => {
      const error = { msg: { summaryMessage: 'Summary', inlineMessage: 'Inline' } } as unknown as ValidationError;

      expect(formatValidationError(error)).to.deep.equal({ summaryMessage: 'Summary', inlineMessage: 'Inline' });
    });

    it('converts number and boolean values to strings for a record msg', () => {
      const error = { msg: { summaryMessage: 42, inlineMessage: true } } as unknown as ValidationError;

      expect(formatValidationError(error)).to.deep.equal({ summaryMessage: '42', inlineMessage: 'true' });
    });

    it('JSON stringifies a non-empty object value for a record msg', () => {
      const error = { msg: { summaryMessage: { code: 1 }, inlineMessage: {} } } as unknown as ValidationError;

      expect(formatValidationError(error)).to.deep.equal({ summaryMessage: '{"code":1}', inlineMessage: '' });
    });

    it('falls back to "[object Object]" when JSON.stringify throws on a record msg value', () => {
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;
      const error = { msg: { summaryMessage: circular, inlineMessage: 'Inline' } } as unknown as ValidationError;

      expect(formatValidationError(error).summaryMessage).to.equal('[object Object]');
    });

    it('treats a plain string msg as both summary and inline message', () => {
      const error = { msg: 'Something went wrong' } as unknown as ValidationError;

      expect(formatValidationError(error)).to.deep.equal({
        summaryMessage: 'Something went wrong',
        inlineMessage: 'Something went wrong'
      });
    });

    it('falls back to "Invalid value" for an empty string msg', () => {
      const error = { msg: '' } as unknown as ValidationError;

      expect(formatValidationError(error)).to.deep.equal({
        summaryMessage: 'Invalid value',
        inlineMessage: 'Invalid value'
      });
    });

    it('falls back to "Invalid value" for a falsy non-string msg', () => {
      const error = { msg: 0 } as unknown as ValidationError;

      expect(formatValidationError(error)).to.deep.equal({
        summaryMessage: 'Invalid value',
        inlineMessage: 'Invalid value'
      });
    });

    it('falls back to String() conversion for non-object, non-primitive record values', () => {
      const error = { msg: { summaryMessage: Symbol('oops'), inlineMessage: 'Inline' } } as unknown as ValidationError;

      expect(formatValidationError(error).summaryMessage).to.equal('Symbol(oops)');
    });
  });

  describe('createChangeDetectionValidator', () => {
    const fieldMappings = [{ current: 'fullName', original: 'originalFullName' }];

    function createMeta(body: unknown): Meta {
      return { req: { body } } as unknown as Meta;
    }

    it('returns true when req.body is not a record', () => {
      const validator = createChangeDetectionValidator(fieldMappings, {
        summaryMessage: 'No changes made',
        inlineMessage: 'No changes made'
      });

      expect(validator.custom.options('', createMeta(undefined))).to.be.true;
    });

    it('returns false when no mapped fields have changed', () => {
      const validator = createChangeDetectionValidator(fieldMappings, {
        summaryMessage: 'No changes made',
        inlineMessage: 'No changes made'
      });
      const meta = createMeta({ fullName: 'John Smith', originalFullName: 'John Smith' });

      expect(validator.custom.options('', meta)).to.be.false;
    });

    it('returns true when a mapped field has changed', () => {
      const validator = createChangeDetectionValidator(fieldMappings, {
        summaryMessage: 'No changes made',
        inlineMessage: 'No changes made'
      });
      const meta = createMeta({ fullName: 'Jane Smith', originalFullName: 'John Smith' });

      expect(validator.custom.options('', meta)).to.be.true;
    });

    it('defaults missing mapped fields to empty string', () => {
      const validator = createChangeDetectionValidator(fieldMappings, {
        summaryMessage: 'No changes made',
        inlineMessage: 'No changes made'
      });

      expect(validator.custom.options('', createMeta({}))).to.be.false;
    });

    it('normalizes checkbox/boolean-like values before comparing', () => {
      const checkboxMappings = [{ current: 'subscribed', original: 'originalSubscribed' }];
      const validator = createChangeDetectionValidator(checkboxMappings, {
        summaryMessage: 'No changes made',
        inlineMessage: 'No changes made'
      });

      expect(validator.custom.options('', createMeta({ subscribed: 'on', originalSubscribed: 'true' }))).to.be.false;
      expect(validator.custom.options('', createMeta({ subscribed: 'off', originalSubscribed: '' }))).to.be.false;
      expect(validator.custom.options('', createMeta({ subscribed: '1', originalSubscribed: 'false' }))).to.be.true;
      expect(validator.custom.options('', createMeta({ subscribed: 'maybe', originalSubscribed: 'maybe' }))).to.be.false;
    });

    it('resolves string error messages when building the error', () => {
      const validator = createChangeDetectionValidator(fieldMappings, {
        summaryMessage: 'No changes made',
        inlineMessage: 'No changes made inline'
      });

      const error = validator.custom.errorMessage();

      expect(error).to.be.instanceOf(TypedValidationError);
      expect(error.errorData).to.deep.equal({
        summaryMessage: 'No changes made',
        inlineMessage: 'No changes made inline'
      });
    });

    it('resolves function error messages when building the error', () => {
      const validator = createChangeDetectionValidator(fieldMappings, {
        summaryMessage: () => 'Lazy summary',
        inlineMessage: () => 'Lazy inline'
      });

      const error = validator.custom.errorMessage();

      expect(error.errorData).to.deep.equal({ summaryMessage: 'Lazy summary', inlineMessage: 'Lazy inline' });
    });
  });

  describe('formatValidationErrors', () => {
    it('builds inline field errors and a summary list, skipping blank inline messages', () => {
      const errors: ValidationError[] = [
        { path: 'fullName', msg: 'Full name is required' } as unknown as ValidationError,
        { path: 'address', msg: { summaryMessage: 'Address error', inlineMessage: '' } } as unknown as ValidationError,
        { msg: 'Unknown field error' } as unknown as ValidationError
      ];
      const validationResult = { array: () => errors } as unknown as Result;

      const { inputErrors, errorSummaryList } = formatValidationErrors(validationResult);

      expect(inputErrors).to.deep.equal({
        fullName: 'Full name is required',
        unknown: 'Unknown field error'
      });
      expect(errorSummaryList).to.deep.equal([
        { text: 'Full name is required', href: '#fullName' },
        { text: 'Address error', href: '#address' },
        { text: 'Unknown field error', href: '#unknown' }
      ]);
    });
  });
});
