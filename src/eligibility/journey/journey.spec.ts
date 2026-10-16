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

  it("does not loop back to level of help after the applicant step", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("immigration-or-asylum", { immigration_or_asylum: "false" });
    const next = await submit("applicant", { applicant: "false" });

    assert.equal(next, `${BASE}/dependant-details`);
    await assertRenders("dependant-details");
  });
});
