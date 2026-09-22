import { strict as assert } from 'assert';
import sinon from 'sinon';
import { InboundCallEffectsImplementation } from '#src/journeys/effects.js';
import type { AxiosInstanceWrapper } from '#types/axios-instance-wrapper.js';

describe('InboundCallEffectsImplementation.GetAllCases', () => {
  function makeAxiosWrapper(): AxiosInstanceWrapper {
    const get = sinon.stub();

    return {
      axiosInstance: {
        defaults: {
          headers: { common: {} },
        },
      },
      get,
      delete: sinon.stub(),
      head: sinon.stub(),
      options: sinon.stub(),
      post: sinon.stub(),
      put: sinon.stub(),
      patch: sinon.stub(),
      request: sinon.stub(),
      use: sinon.stub(),
    } as unknown as AxiosInstanceWrapper;
  }

  it('sets allCases data when context has authenticatedAxios wrapper', async () => {
    const axiosWrapper = makeAxiosWrapper();
    const expected = { count: 1, results: [{ reference: 'FA-1' }] };
    const getAllCases = sinon.stub().resolves(expected);
    const updatePersonalDetails = sinon.stub().resolves({});

    const effect = InboundCallEffectsImplementation.GetAllCases({
      caseApi: { getAllCases, updatePersonalDetails },

    });

    const setData = sinon.stub();
    const context = {
      getState: sinon.stub().withArgs('authenticatedAxios').returns(axiosWrapper),
      setData,
    };

    await effect(context as any);

    assert.equal(getAllCases.calledOnceWithExactly(axiosWrapper), true);
    assert.equal(setData.calledOnceWithExactly('allCases', expected), true);
  });

  it('throws when authenticatedAxios is missing or invalid', async () => {
    const effect = InboundCallEffectsImplementation.GetAllCases({
      caseApi: { getAllCases: sinon.stub(), updatePersonalDetails: sinon.stub() },
    });

    const context = {
      getState: sinon.stub().withArgs('authenticatedAxios').returns(undefined),
      setData: sinon.stub(),
    };

    await assert.rejects(
      () => effect(context as any),
      (error: unknown) => {
        assert(error instanceof Error);
        assert.equal(error.message, 'Axios middleware is not available in the context.');
        return true;
      }
    );
  });
});
