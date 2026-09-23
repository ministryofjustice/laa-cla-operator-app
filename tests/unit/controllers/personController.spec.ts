import { expect } from 'chai';
import type { NextFunction, Request } from 'express';
import { validationResult } from 'express-validator';
import { before, describe, it } from 'mocha';
import sinon from 'sinon';

import { getPerson, postPerson } from '#src/controllers/personController.js';
import { formatValidationError } from '#src/helpers/ValidationErrorHelpers.js';
import { validatePerson } from '#src/middlewares/personSchema.js';
import { initializeI18nextSync } from '#src/scripts/helpers/i18nLoader.js';

function createRequest(overrides: Record<string, unknown> = {}): Request {
  return {
    body: {},
    session: {},
    ...overrides
  } as Request;
}

function createResponse() {
  const res = {
    render: sinon.stub(),
    status: sinon.stub()
  };

  res.status.returns(res);

  return res;
}

function createNext(): sinon.SinonStub<[unknown?], void> & NextFunction {
  return sinon.stub() as sinon.SinonStub<[unknown?], void> & NextFunction;
}

async function runPersonValidation(req: Request): Promise<void> {
  const schema = validatePerson();
  await Promise.all(schema.map(async validation => validation.run(req)));
}

describe('personController', () => {
  before(() => {
    initializeI18nextSync();
  });

  describe('getPerson', () => {
    it('delegates render errors to next', () => {
      const renderError = new Error('render failed');
      const req = createRequest();
      const res = createResponse();
      const next = createNext();
      res.render.throws(renderError);

      getPerson(req, res as any, next);

      expect(next.calledOnceWith(renderError)).to.be.true;
    });
  });

  describe('postPerson', () => {
    it('renders validation errors and preserves submitted form data', async () => {
      const req = createRequest({
        body: {
          fullName: '',
          address: '',
          contactPreference: '',
          priority: '',
          'dateOfBirth-day': '1',
          'dateOfBirth-month': '',
          'dateOfBirth-year': ''
        },
        csrfToken: () => 'csrf-token'
      });
      const res = createResponse();

      await runPersonValidation(req);
      postPerson(req as Request & { csrfToken: () => string }, res as any, createNext());

      const formattedErrors = validationResult(req).formatWith(formatValidationError);

      expect(formattedErrors.isEmpty()).to.be.false;
      expect(res.status.calledOnceWith(400)).to.be.true;
      expect(res.render.calledOnceWith('change-person.njk', sinon.match({
        csrfToken: 'csrf-token',
        formData: sinon.match({
          fullName: '',
          address: '',
          contactPreference: '',
          priority: '',
          'dateOfBirth-day': '1',
          'dateOfBirth-month': '',
          'dateOfBirth-year': ''
        }),
        error: sinon.match({
          inputErrors: sinon.match.object,
          errorSummaryList: sinon.match.array
        })
      }))).to.be.true;
    });

    it('stores submitted person data and renders a success state', () => {
      const req = createRequest({
        body: {
          fullName: 'Updated Name',
          address: 'Updated Address',
          contactPreference: 'phone',
          priority: 'high',
          'dateOfBirth-day': '05',
          'dateOfBirth-month': '06',
          'dateOfBirth-year': '1991'
        }
      });
      const res = createResponse();

      postPerson(req, res as any, createNext());

      expect(req.session.currentPerson).to.deep.equal({
        fullName: 'Updated Name',
        address: 'Updated Address',
        contactPreference: 'phone',
        'dateOfBirth-day': '05',
        'dateOfBirth-month': '06',
        'dateOfBirth-year': '1991'
      });
      expect(res.render.calledOnceWith('change-person.njk', sinon.match({
        currentName: 'Updated Name',
        currentAddress: 'Updated Address',
        currentContactPreference: 'phone',
        error: null,
        successMessage: 'Person details updated successfully'
      }))).to.be.true;
    });

    it('delegates unexpected errors to next', () => {
      const renderError = new Error('render failed');
      const req = createRequest({
        body: {
          fullName: 'Updated Name',
          address: 'Updated Address',
          contactPreference: 'phone',
          priority: 'high',
          'dateOfBirth-day': '05',
          'dateOfBirth-month': '06',
          'dateOfBirth-year': '1991'
        }
      });
      const res = createResponse();
      const next = createNext();
      res.render.throws(renderError);

      postPerson(req, res as any, next);

      expect(next.calledOnceWith(renderError)).to.be.true;
    });
  });
});