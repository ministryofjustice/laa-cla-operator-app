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
  let assessmentPayloads: unknown[];

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
      `GET ${step} did not render: ${result.type === "error" ? result.error.message : redirectUrl(result)}`,
    );
  }

  beforeEach(() => {
    answerStore = new InMemoryAnswerStore();
    assessmentPayloads = [];
    const deps: EligibilityDeps = {
      answerStore,
      assessor: {
        assess: async (payload) => {
          assessmentPayloads.push(payload);
          return { result: "eligible" };
        },
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
    async function reachAssets() {
      await submit("property", { property_owned: "outright" });
      await submit("property-entry", {
        house_value: "150000",
        percentage_owned: "100",
      });
      await submit("additional-property", { additional_property: "false" });
    }

    beforeEach(async () => {
      answerStore.answers = {
        level_of_help: "controlled",
        client_age: "standard",
        immigration_or_asylum: false,
        partner: false,
        applicant: false,
        passporting: false,
        dependant_details: false,
        employment_status: ["employed"],
      };
      // Navigate through income steps to reach property step
      await submit("benefits", { receives_benefits: "false" });
      await submit("other-income", { other_income: "false" });
      await submit("outgoings", {
        childcare_payments_relevant: "false",
        maintenance_payments_relevant: "false",
        legal_aid_payments_relevant: "false",
      });
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

    for (const checked of [false, true]) {
      it(`accepts ${checked ? "checked" : "unchecked"} property SMOD`, async () => {
        await submit("property", { property_owned: "outright" });

        const next = await submit("property-entry", {
          house_value: "150000",
          percentage_owned: "100",
          ...(checked ? { house_in_dispute: ["true"] } : {}),
        });

        assert.equal(next, `${BASE}/additional-property`);
        await assertRenders("additional-property");
      });

      it(`accepts ${checked ? "checked" : "unchecked"} investment and valuable SMOD`, async () => {
        await reachAssets();

        const next = await submit("assets", {
          currentStep: `${BASE}/assets`,
          bank_accounts_0_amount: "0",
          investments_relevant: "true",
          investments: "1000",
          valuables_relevant: "true",
          valuables: "500",
          ...(checked
            ? {
                investments_in_dispute: ["true"],
                valuables_in_dispute: ["true"],
              }
            : {}),
        });

        assert.equal(next, `${BASE}/check-your-answers`);
        await assertRenders("check-your-answers");
      });
    }

    it("still requires valid property amounts when SMOD is unchecked", async () => {
      await submit("property", { property_owned: "outright" });

      const result = await client.post(`${BASE}/property-entry`, {
        params,
        body: { house_value: "0", percentage_owned: "101" },
      });

      assert.equal(result.type, "render");
      if (result.type !== "render") return;
      for (const code of ["house_value", "percentage_owned"]) {
        assert.ok(result.getValidationErrorsByFieldCode(code).length > 0);
      }
      assert.equal(
        result.getValidationErrorsByFieldCode("house_in_dispute").length,
        0,
      );
    });

    it("still requires valid asset amounts when SMOD is unchecked", async () => {
      await reachAssets();

      const result = await client.post(`${BASE}/assets`, {
        params,
        body: {
          currentStep: `${BASE}/assets`,
          bank_accounts_0_amount: "0",
          investments_relevant: "true",
          investments: "0",
          valuables_relevant: "true",
          valuables: "499",
        },
      });

      assert.equal(result.type, "render");
      if (result.type !== "render") return;
      for (const code of ["investments", "valuables"]) {
        assert.ok(result.getValidationErrorsByFieldCode(code).length > 0);
      }
      for (const code of ["investments_in_dispute", "valuables_in_dispute"]) {
        assert.equal(result.getValidationErrorsByFieldCode(code).length, 0);
      }
    });

    it("adds bank accounts and saves them as capital entries", async () => {
      await reachAssets();

      const next = await submit("assets", {
        action: "add",
        currentStep: `${BASE}/assets`,
        bank_accounts_0_amount: "125.50",
        bank_accounts_0_account_in_dispute: ["true"],
      });

      assert.equal(next, `${BASE}/assets`);
      assert.deepEqual(answerStore.answers.bank_accounts, [
        { amount: 125.5, account_in_dispute: true },
        { amount: "" },
      ]);

      await assertRenders("assets");
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

  it("loads the answered questions on review without calling CFE", async () => {
    answerStore.answers = { date_of_birth: CHILD_DATE_OF_BIRTH };
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("under-18-clr", { controlled_legal_representation: "true" });

    const result = await client.get(`${BASE}/check-your-answers`, { params });
    assert.equal(result.type, "render");
    if (result.type !== "render") return;
    assert.deepEqual(result.context.data.answerSummary, [
      {
        key: { text: "What type of legal aid is needed?" },
        value: { text: "Controlled work (advice only)" },
        actions: {
          items: [
            {
              href: "level-of-help#level_of_help",
              text: "Change",
              visuallyHiddenText: "What type of legal aid is needed?",
            },
          ],
        },
      },
      {
        key: { text: "Controlled legal representation" },
        value: { text: "Yes" },
        actions: {
          items: [
            {
              href: "under-18-clr#controlled_legal_representation",
              text: "Change",
              visuallyHiddenText: "Controlled legal representation",
            },
          ],
        },
      },
    ]);
    assert.equal(result.getBlocksByVariant("govukSummaryList").length, 1);
    assert.equal(assessmentPayloads.length, 0);
  });

  it("prefills a change form and follows newly required questions before submitting", async () => {
    answerStore.answers = { date_of_birth: CHILD_DATE_OF_BIRTH };
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("under-18-clr", { controlled_legal_representation: "true" });
    await assertRenders("check-your-answers");

    const edit = await client.get(`${BASE}/under-18-clr`, { params });
    assert.equal(edit.type, "render");
    if (edit.type !== "render") return;
    const saved = edit.context.answers.controlled_legal_representation;
    assert.ok(
      saved !== null && typeof saved === "object" && "current" in saved,
    );
    assert.equal(saved.current, "true");

    assert.equal(
      await submit("under-18-clr", {
        controlled_legal_representation: "false",
      }),
      `${BASE}/aggregated-means`,
    );
    const incomplete = await client.get(`${BASE}/check-your-answers`, {
      params,
    });
    assert.equal(redirectUrl(incomplete), `${BASE}/aggregated-means`);
    assert.equal(assessmentPayloads.length, 0);

    await submit("aggregated-means", { aggregated_means: "false" });
    await submit("regular-income", { regular_income: "false" });
    await submit("under-eighteen-assets", { under_eighteen_assets: "false" });
    const review = await client.get(`${BASE}/check-your-answers`, { params });
    assert.equal(review.type, "render");
    if (review.type !== "render") return;
    assert.equal(
      JSON.stringify(review.context.data.answerSummary).includes('"text":"No"'),
      true,
    );
    assert.equal(assessmentPayloads.length, 0);
    const submitted = await client.post(`${BASE}/check-your-answers`, {
      params,
      body: {},
    });
    assert.notEqual(submitted.type, "error");
    assert.equal(assessmentPayloads.length, 1);
    assert.partialDeepStrictEqual(assessmentPayloads[0], {
      assessment: {
        level_of_help: "controlled",
        controlled_legal_representation: false,
        not_aggregated_no_income_low_capital: true,
      },
    });
    assert.deepEqual(answerStore.answers, {});
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
