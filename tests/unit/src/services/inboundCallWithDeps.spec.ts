import { strict as assert } from "assert";
import sinon from "sinon";
import { InboundCallEffectsImplementation } from "#src/journeys/effects.js";
import type { AxiosInstanceWrapper } from "#types/axios-instance-wrapper.js";

describe("InboundCallEffectsImplementation.GetAllCases", () => {
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

  it("sets allCases data when context has authenticatedAxios wrapper", async () => {
    const axiosWrapper = makeAxiosWrapper();
    const expected = { count: 1, results: [{ reference: "FA-1" }] };
    const getAllCases = sinon.stub().resolves(expected);
    const updatePersonalDetails = sinon.stub().resolves({});
    const searchCases = sinon.stub().resolves({ count: 1, results: [{ reference: 'FA-1' }] });
    const createCase = sinon.stub().resolves({ reference: 'FA-1' });

    const effect = InboundCallEffectsImplementation.GetAllCases({
      caseApi: { getAllCases, updatePersonalDetails, searchCases, createCase: createCase },
    });

    const setData = sinon.stub();
    const context = {
      getState: sinon
        .stub()
        .withArgs("authenticatedAxios")
        .returns(axiosWrapper),
      setData,
    };

    await effect(context as any);

    assert.equal(getAllCases.calledOnceWithExactly(axiosWrapper), true);
    assert.equal(setData.calledOnceWithExactly("allCases", expected), true);
  });

  it("throws when authenticatedAxios is missing or invalid", async () => {
    const effect = InboundCallEffectsImplementation.GetAllCases({
      caseApi: {
        getAllCases: sinon.stub(),
        updatePersonalDetails: sinon.stub(), searchCases: sinon.stub(), createCase: sinon.stub(),
      },
    });

    const context = {
      getState: sinon.stub().withArgs("authenticatedAxios").returns(undefined),
      setData: sinon.stub(),
    };

    await assert.rejects(
      () => effect(context as any),
      (error: unknown) => {
        assert(error instanceof Error);
        assert.equal(
          error.message,
          "Axios middleware is not available in the context.",
        );
        return true;
      },
    );
  });
});

describe("InboundCallEffectsImplementation.saveClientDetails", () => {
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

  function makeDeps() {
    return {
      caseApi: {
        getAllCases: sinon.stub().resolves({}),
        updatePersonalDetails: sinon.stub().resolves({}),
      },
    };
  }

  it("sets personalDetails data with SAFE when safeToCall is yes", async () => {
    const axiosWrapper = makeAxiosWrapper();
    const deps = makeDeps();
    const effect = InboundCallEffectsImplementation.saveClientDetails(
      deps as any,
    );

    const setData = sinon.stub();
    const getPostData = sinon.stub();
    getPostData.withArgs("fullName").returns("Jane Doe");
    getPostData.withArgs("dateOfBirth").returns("2001-05-12");
    getPostData.withArgs("phoneNumber").returns("07123456789");
    getPostData.withArgs("safeToCall").returns("yes");
    getPostData.withArgs("email").returns("jane@example.com");

    const context = {
      getState: sinon
        .stub()
        .withArgs("authenticatedAxios")
        .returns(axiosWrapper),
      getPostData,
      setData,
    };

    await effect(context as any);

    assert.equal(
      setData.calledOnceWithExactly("personalDetails", {
        full_name: "Jane Doe",
        date_of_birth: "2001-05-12",
        mobile_phone: "07123456789",
        safe_to_contact: "SAFE",
        email: "jane@example.com",
      }),
      true,
    );

    assert.equal(
      deps.caseApi.updatePersonalDetails.calledOnceWithExactly(
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
    const deps = makeDeps();
    const effect = InboundCallEffectsImplementation.saveClientDetails(
      deps as any,
    );

    const setData = sinon.stub();
    const getPostData = sinon.stub();
    getPostData.withArgs("fullName").returns("Jane Doe");
    getPostData.withArgs("dateOfBirth").returns("2001-05-12");
    getPostData.withArgs("phoneNumber").returns("07123456789");
    getPostData.withArgs("safeToCall").returns("no");
    getPostData.withArgs("email").returns("jane@example.com");

    const context = {
      getState: sinon
        .stub()
        .withArgs("authenticatedAxios")
        .returns(axiosWrapper),
      getPostData,
      setData,
    };

    await effect(context as any);

    assert.equal(
      setData.calledOnceWithExactly("personalDetails", {
        full_name: "Jane Doe",
        date_of_birth: "2001-05-12",
        mobile_phone: "07123456789",
        safe_to_contact: "DONT_CALL",
        email: "jane@example.com",
      }),
      true,
    );

    assert.equal(
      deps.caseApi.updatePersonalDetails.calledOnceWithExactly(
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
    const effect = InboundCallEffectsImplementation.saveClientDetails(
      makeDeps() as any,
    );

    const context = {
      getState: sinon.stub().withArgs("authenticatedAxios").returns(undefined),
      getPostData: sinon.stub(),
      setData: sinon.stub(),
    };

    await assert.rejects(
      () => effect(context as any),
      (error: unknown) => {
        assert(error instanceof Error);
        assert.equal(
          error.message,
          "Axios middleware is not available in the context.",
        );
        return true;
      },
    );
  });
});
