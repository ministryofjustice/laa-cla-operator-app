// Drives the real eligibility journey through Forge's test harness, so
// navigation is checked against Forge's own reachability walk rather than
// just `stepsFor`.
import { strict as assert } from "assert";
import { ForgeTestHarness } from "@ministryofjustice/hmpps-forge/core/testing";
import type {
  ForgeTestClient,
  TestResult,
} from "@ministryofjustice/hmpps-forge/core/testing";
import { govukComponents } from "@ministryofjustice/hmpps-forge/govuk-components";
import type { Answers } from "../domain/logic.js";
import type { AnswerStore, EligibilityDeps } from "../ports/index.js";
import { createEligibilityPackage } from "./index.js";

const CASE_ID = "case-1";
const BASE = `/cases/${CASE_ID}/eligibility`;
const CHILD_AGE = 10;
const CHILD_DATE_OF_BIRTH = `${new Date().getUTCFullYear() - CHILD_AGE}-01-01`;

class InMemoryAnswerStore implements AnswerStore {
  answers: Answers = {};

  async load(): Promise<Answers> {
    return { ...this.answers };
  }

  async save(_checkId: unknown, partial: Answers): Promise<void> {
    this.answers = { ...this.answers, ...partial };
  }

  async clear(): Promise<void> {
    this.answers = {};
  }
}

function redirectUrl(result: TestResult): string | undefined {
  return result.type === "redirect" ? result.url : undefined;
}

describe("eligibility journey navigation", () => {
  let client: ForgeTestClient;
  let answerStore: InMemoryAnswerStore;

  const params = { caseId: CASE_ID };

  async function submit(step: string, body: Record<string, unknown>) {
    const result = await client.post(`${BASE}/${step}`, { params, body });
    assert.equal(result.type, "redirect", `POST ${step} did not redirect`);
    return redirectUrl(result);
  }

  async function assertRenders(step: string) {
    const result = await client.get(`${BASE}/${step}`, { params });
    assert.equal(
      result.type,
      "render",
      `GET ${step} redirected to ${redirectUrl(result)}`,
    );
  }

  beforeEach(() => {
    answerStore = new InMemoryAnswerStore();
    const deps: EligibilityDeps = {
      answerStore,
      assessor: {
        assess: async () => ({ result: "eligible" }),
        stateBenefitTypes: async () => [],
      },
      resultHandler: { handle: async () => undefined },
    };
    client = new ForgeTestHarness()
      .registerGlobalComponents(govukComponents)
      .registerPackage(
        createEligibilityPackage({ path: "/cases/:caseId/eligibility" }),
        deps,
      )
      .createClient();
  });

  it("controlled immigration goes on to the immigration type step", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    const next = await submit("immigration-or-asylum", {
      immigration_or_asylum: "true",
    });
    assert.equal(next, `${BASE}/immigration-or-asylum-type`);
    await assertRenders("immigration-or-asylum-type");
  });

  it("saves yes/no answers as booleans, so 'No' is not treated as 'Yes'", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    const next = await submit("immigration-or-asylum", {
      immigration_or_asylum: "false",
    });

    assert.equal(next, `${BASE}/applicant`);
    assert.equal(answerStore.answers.immigration_or_asylum, false);
  });

  it("still rejects an empty submission", async () => {
    const result = await client.post(`${BASE}/level-of-help`, {
      params,
      body: {},
    });

    assert.equal(result.type, "render");
    assert.equal(
      result.type === "render" &&
        result.getValidationErrorsByFieldCode("level_of_help").length > 0,
      true,
    );
    assert.deepEqual(answerStore.answers, {});
  });

  it("re-routes when an earlier answer changes", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("immigration-or-asylum", { immigration_or_asylum: "true" });

    const next = await submit("level-of-help", {
      level_of_help: "certificated",
    });

    assert.equal(next, `${BASE}/domestic-abuse-applicant`);
    await assertRenders("domestic-abuse-applicant");
  });

  it("asks the under-18 questions when the date of birth makes the client a child", async () => {
    answerStore.answers = { date_of_birth: CHILD_DATE_OF_BIRTH };

    const next = await submit("level-of-help", { level_of_help: "controlled" });

    assert.equal(next, `${BASE}/under-18-clr`);
    await assertRenders("under-18-clr");
  });

  it("does not loop back to level of help after the applicant step", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("immigration-or-asylum", { immigration_or_asylum: "false" });
    const next = await submit("applicant", {
      applicant: "false",
      passporting: "false",
    });

    assert.equal(next, `${BASE}/dependant-details`);
    await assertRenders("dependant-details");
  });

  describe("property and assets", () => {
    beforeEach(() => {
      answerStore.answers = {
        level_of_help: "controlled",
        client_age: "standard",
        immigration_or_asylum: false,
        partner: false,
        applicant: false,
        passporting: false,
        dependant_details: false,
        employment_status: ["employed"],
        benefits: "false",
        other_income: "false",
        childcare_payments: "false",
        maintenance_payments: "false",
        legal_aid_payments: "false",
      };
    });

    it("sends an outright owner to property entry", async () => {
      const next = await submit("property", { property_owned: "outright" });

      assert.equal(next, `${BASE}/property-entry`);
      await assertRenders("property-entry");
    });

    it("sends a shared owner to property landlord", async () => {
      const next = await submit("property", {
        property_owned: "shared_ownership",
      });

      assert.equal(next, `${BASE}/property-landlord`);
      await assertRenders("property-landlord");
    });

    it("goes to additional property after property entry", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        property_owned: "outright",
      };

      const next = await submit("property-entry", {
        house_value: "150000",
        percentage_owned: "100",
        house_in_dispute: "false",
      });

      assert.equal(next, `${BASE}/additional-property`);
      await assertRenders("additional-property");
    });

    it("goes to assets after additional property", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        property_owned: "outright",
        house_value: "150000",
        percentage_owned: "100",
        house_in_dispute: "false",
      };

      const next = await submit("additional-property", {
        additional_property: "false",
      });

      assert.equal(next, `${BASE}/assets`);
      await assertRenders("assets");
    });
  });

  it("goes to check your answers after the last relevant step", async () => {
    answerStore.answers = { date_of_birth: CHILD_DATE_OF_BIRTH };
    await submit("level-of-help", { level_of_help: "controlled" });

    const next = await submit("under-18-clr", {
      controlled_legal_representation: "true",
    });

    assert.equal(next, `${BASE}/check-your-answers`);
    await assertRenders("check-your-answers");
  });

  it("redirects a step the answers have not reached yet to the furthest step reached", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });

    const result = await client.get(`${BASE}/partner-details`, { params });

    assert.equal(redirectUrl(result), `${BASE}/immigration-or-asylum`);
  });

  it("redirects a step from a branch the client is no longer on", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("immigration-or-asylum", { immigration_or_asylum: "true" });
    await submit("level-of-help", { level_of_help: "certificated" });

    const result = await client.get(`${BASE}/immigration-or-asylum-type`, {
      params,
    });

    assert.equal(result.type, "redirect");
  });

  it("does not offer check your answers before the questions are answered", async () => {
    const result = await client.get(`${BASE}/check-your-answers`, { params });

    assert.equal(redirectUrl(result), `${BASE}/level-of-help`);
  });
});
