import { strict as assert } from "assert";
import sinon from "sinon";
import { InboundCallEffectsImplementation } from "#src/journeys/effects.js";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";

const AXIOS_MISSING_MESSAGE = "Axios middleware is not available in the context.";

function makeAxiosWrapper(): AxiosInstanceWrapper {
  return {
    axiosInstance: {
      defaults: {
        headers: { common: {} },
      },
    },
    get: sinon.stub(),
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

/**
 * Builds a caseApi mock with every method CaseApiService requires.
 * Pass overrides to control the stubs a test cares about.
 */
function makeCaseApi(overrides: Record<string, sinon.SinonStub> = {}) {
  return {
    getAllCases: sinon.stub().resolves({}),
    updatePersonalDetails: sinon.stub().resolves({}),
    searchCases: sinon.stub().resolves({ count: 0, results: [] }),
    createCase: sinon.stub().resolves({ reference: "FA-1" }),
    loadCase: sinon.stub().resolves({ reference: "FA-1" }),
    adoptionDetails: sinon.stub().resolves(undefined),
    ...overrides,
  };
}

function makeContextWithAxios(
  axios: AxiosInstanceWrapper | undefined,
  extra: Record<string, unknown> = {},
) {
  return {
    getState: sinon.stub().withArgs("authenticatedAxios").returns(axios),
    setData: sinon.stub(),
    ...extra,
  };
}

async function assertRejectsWithAxiosError(run: () => Promise<void>) {
  await assert.rejects(run, (error: unknown) => {
    assert(error instanceof Error);
    assert.equal(error.message, AXIOS_MISSING_MESSAGE);
    return true;
  });
}

describe("InboundCallEffectsImplementation.GetAllCases", () => {
  it("sets allCases data when context has authenticatedAxios wrapper", async () => {
    const axiosWrapper = makeAxiosWrapper();
    const expected = { count: 1, results: [{ reference: "FA-1" }] };
    const getAllCases = sinon.stub().resolves(expected);

    const effect = InboundCallEffectsImplementation.GetAllCases({
      caseApi: makeCaseApi({ getAllCases }),
    } as any);

    const context = makeContextWithAxios(axiosWrapper);

    await effect(context as any);

    assert.equal(getAllCases.calledOnceWithExactly(axiosWrapper), true);
    assert.equal(
      context.setData.calledOnceWithExactly("allCases", expected),
      true,
    );
  });

  it("throws when authenticatedAxios is missing or invalid", async () => {
    const getAllCases = sinon.stub();
    const effect = InboundCallEffectsImplementation.GetAllCases({
      caseApi: makeCaseApi({ getAllCases }),
    } as any);

    const context = makeContextWithAxios(undefined);

    await assertRejectsWithAxiosError(() => effect(context as any));
    assert.equal(getAllCases.notCalled, true);
    assert.equal(context.setData.notCalled, true);
  });
});

describe("InboundCallEffectsImplementation.saveClientDetails", () => {
  function makeContext(
    axios: AxiosInstanceWrapper | undefined,
    postData: Record<string, string>,
  ) {
    const getPostData = sinon.stub();
    for (const [key, value] of Object.entries(postData)) {
      getPostData.withArgs(key).returns(value);
    }
    const getData = sinon.stub();
    getData.withArgs("case").returns({ reference: "ED-0001-0002" });

    return makeContextWithAxios(axios, { getPostData, getData });
  }

  const baseAnswers = {
    fullName: "Jane Doe",
    dateOfBirth: "2001-05-12",
    phoneNumber: "07123456789",
    email: "jane@example.com",
  };

  it("sets personalDetails data with SAFE when safeToCall is yes", async () => {
    const axiosWrapper = makeAxiosWrapper();
    const caseApi = makeCaseApi();
    const effect = InboundCallEffectsImplementation.saveClientDetails({
      caseApi,
    } as any);

    const context = makeContext(axiosWrapper, {
      ...baseAnswers,
      safeToCall: "yes",
    });

    await effect(context as any);

    assert.equal(
      context.setData.calledOnceWithExactly("personalDetails", {
        full_name: "Jane Doe",
        date_of_birth: "2001-05-12",
        mobile_phone: "07123456789",
        safe_to_contact: "SAFE",
        email: "jane@example.com",
      }),
      true,
    );

    assert.equal(
      caseApi.updatePersonalDetails.calledOnceWithExactly(
        axiosWrapper,
        "ED-0001-0002",
        {
          full_name: "Jane Doe",
          dob: "2001-05-12",
          mobile_phone: "07123456789",
          safe_to_contact: "SAFE",
          email: "jane@example.com",
        },
      ),
      true,
    );
  });

  it("sets personalDetails data with DONT_CALL when safeToCall is not yes", async () => {
    const axiosWrapper = makeAxiosWrapper();
    const caseApi = makeCaseApi();
    const effect = InboundCallEffectsImplementation.saveClientDetails({
      caseApi,
    } as any);

    const context = makeContext(axiosWrapper, {
      ...baseAnswers,
      safeToCall: "no",
    });

    await effect(context as any);

    assert.equal(
      context.setData.calledOnceWithExactly("personalDetails", {
        full_name: "Jane Doe",
        date_of_birth: "2001-05-12",
        mobile_phone: "07123456789",
        safe_to_contact: "DONT_CALL",
        email: "jane@example.com",
      }),
      true,
    );

    assert.equal(
      caseApi.updatePersonalDetails.calledOnceWithExactly(
        axiosWrapper,
        "ED-0001-0002",
        {
          full_name: "Jane Doe",
          dob: "2001-05-12",
          mobile_phone: "07123456789",
          safe_to_contact: "DONT_CALL",
          email: "jane@example.com",
        },
      ),
      true,
    );
  });

  it("throws when authenticatedAxios is missing or invalid", async () => {
    const caseApi = makeCaseApi();
    const effect = InboundCallEffectsImplementation.saveClientDetails({
      caseApi,
    } as any);

    const context = makeContext(undefined, {});

    await assertRejectsWithAxiosError(() => effect(context as any));
    assert.equal(caseApi.updatePersonalDetails.notCalled, true);
  });
});