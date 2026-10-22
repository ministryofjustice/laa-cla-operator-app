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
import { stepsFor } from "../domain/navigation.js";
import type { AnswerStore, EligibilityDeps } from "../ports/index.js";
import { createEligibilityPackage } from "./index.js";

const CASE_ID = "case-1";
const BASE = `/cases/${CASE_ID}/eligibility`;
const CHILD_AGE = 10;
const CHILD_DATE_OF_BIRTH = `${new Date().getUTCFullYear() - CHILD_AGE}-01-01`;

// Other income with every question answered "No"
const OTHER_INCOME_NONE = Object.fromEntries(
  [
    "friends_or_family",
    "maintenance",
    "property_or_lodger",
    "pension",
    "student_finance",
    "other",
  ].map((type) => [`${type}_relevant`, "false"]),
);

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

  for (const type of ["immigration_clr", "immigration_legal_help", "asylum"]) {
    it(`saves ${type} and asks about Asylum Support next`, async () => {
      await submit("level-of-help", { level_of_help: "controlled" });
      await submit("immigration-or-asylum", { immigration_or_asylum: "true" });

      const next = await submit("immigration-or-asylum-type", {
        immigration_or_asylum_type: type,
      });

      assert.equal(next, `${BASE}/asylum-support`);
      assert.equal(answerStore.answers.immigration_or_asylum_type, type);
      await assertRenders("asylum-support");

      const afterSupport = await submit("asylum-support", {
        asylum_support: "false",
      });
      assert.equal(afterSupport, `${BASE}/applicant`);
      await assertRenders("applicant");
    });
  }

  it("requires a matter type before continuing to Asylum Support", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("immigration-or-asylum", { immigration_or_asylum: "true" });

    const result = await client.post(`${BASE}/immigration-or-asylum-type`, {
      params,
      body: {},
    });

    assert.equal(result.type, "render");
    assert.ok(
      result.type === "render" &&
        result.getValidationErrorsByFieldCode("immigration_or_asylum_type")
          .length > 0,
    );
    assert.equal(answerStore.answers.immigration_or_asylum_type, undefined);
  });

  it("skips the means test when the client gets Asylum Support", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("immigration-or-asylum", { immigration_or_asylum: "true" });
    await submit("immigration-or-asylum-type", {
      immigration_or_asylum_type: "asylum",
    });

    const next = await submit("asylum-support", { asylum_support: "true" });

    assert.equal(next, `${BASE}/check-your-answers`);
    await assertRenders("check-your-answers");
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
      partner: "false",
      passporting: "false",
    });

    assert.equal(next, `${BASE}/dependant-details`);
    await assertRenders("dependant-details");
  });

  it("routes to partner steps from the applicant's submitted answer", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("immigration-or-asylum", { immigration_or_asylum: "false" });

    const next = await submit("applicant", {
      partner: "true",
      passporting: "false",
    });
    assert.equal(next, `${BASE}/dependant-details`);
    assert.equal(
      stepsFor(answerStore.answers).includes("partner_details"),
      true,
    );
    assert.equal(
      stepsFor(answerStore.answers).includes("partner_employment_status"),
      true,
    );

    await submit("dependant-details", {
      child_dependants: "false",
      adult_dependants: "false",
    });
    await submit("employment-status", { employment_status: "in_work" });
    await submit("income", {
      incomes_0_income_type: "employment",
      incomes_0_income_frequency: "monthly",
      incomes_0_gross_income: "2000",
      incomes_0_income_tax: "300",
      incomes_0_national_insurance: "100",
    });
    await submit("benefits", { receives_benefits: "false" });
    const afterIncome = await submit("other-income", OTHER_INCOME_NONE);
    assert.equal(afterIncome, `${BASE}/partner-details`);

    const afterPartnerDetails = await submit("partner-details", {
      partner_date_of_birth: { day: "1", month: "1", year: "1980" },
    });
    assert.equal(afterPartnerDetails, `${BASE}/partner-employment-status`);
    assert.equal(answerStore.answers.partner_date_of_birth, "1980-01-01");
  });

  it("skips partner steps after the applicant submits no partner", async () => {
    await submit("level-of-help", { level_of_help: "controlled" });
    await submit("immigration-or-asylum", { immigration_or_asylum: "false" });
    await submit("applicant", { partner: "false", passporting: "false" });

    const steps = stepsFor(answerStore.answers);
    assert.equal(steps.includes("partner_details"), false);
    assert.equal(steps.includes("partner_employment_status"), false);
  });

  describe("property and assets", () => {
    async function reachAssets() {
      await submit("property", { property_owned: "outright" });
      await submit("property-entry", {
        house_value: "150000",
        percentage_owned: "100",
      });
      await submit("additional-property", {
        additional_property_owned: "none",
      });
    }

    beforeEach(async () => {
      answerStore.answers = {
        level_of_help: "controlled",
        client_age: "standard",
        immigration_or_asylum: false,
        partner: false,
        passporting: false,
        child_dependants: false,
        adult_dependants: false,
        employment_status: "unemployed",
      };
      // Navigate through income steps to reach property step
      await submit("benefits", { receives_benefits: "false" });
      await submit("other-income", OTHER_INCOME_NONE);
      await submit("outgoings", {
        childcare_payments_relevant: "false",
        maintenance_payments_relevant: "false",
        legal_aid_payments_relevant: "false",
      });
      answerStore.answers.passporting = true;
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

    for (const [label, partner, legend] of [
      [
        "a client with no partner",
        false,
        "Does your client own the home they usually live in?",
      ],
      [
        "a client with a partner",
        true,
        "Does your client or their partner own the home the client usually lives in?",
      ],
    ] as const) {
      it(`asks ${label} the CCQ property legend`, async () => {
        answerStore.answers = {
          ...answerStore.answers,
          partner,
          ...(partner ? { partner_date_of_birth: "1980-01-01" } : {}),
        };

        const result = await client.get(`${BASE}/property`, { params });

        assert.equal(result.type, "render");
        if (result.type !== "render") return;
        assert.ok(JSON.stringify(result.context.blocks).includes(legend));
      });
    }

    it("requires the mortgage amount for a shared-ownership home", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        property_owned: "shared_ownership",
        property_landlord: true,
      };

      const result = await client.post(`${BASE}/property-entry`, {
        params,
        body: {
          house_value: "150000",
          percentage_owned: "50",
        },
      });

      assert.equal(result.type, "render");
      if (result.type !== "render") return;
      assert.ok(result.getValidationErrorsByFieldCode("mortgage").length > 0);
    });

    it("requires the mortgage amount for a home with a mortgage", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        property_owned: "with_mortgage",
      };

      const result = await client.post(`${BASE}/property-entry`, {
        params,
        body: {
          house_value: "150000",
          percentage_owned: "100",
        },
      });

      assert.equal(result.type, "render");
      if (result.type !== "render") return;
      assert.ok(result.getValidationErrorsByFieldCode("mortgage").length > 0);
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

    it("goes to assets when the client has no additional property", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        property_owned: "outright",
        house_value: "150000",
        percentage_owned: "100",
        house_in_dispute: "false",
      };

      const next = await submit("additional-property", {
        additional_property_owned: "none",
      });

      assert.equal(next, `${BASE}/assets`);
      await assertRenders("assets");
    });

    it("routes to additional property details for an owned property", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        property_owned: "none",
      };

      const next = await submit("additional-property", {
        additional_property_owned: "outright",
      });

      assert.equal(next, `${BASE}/additional-property-details`);
      await assertRenders("additional-property-details");
    });

    it("cannot continue with shared-ownership additional property", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        property_owned: "none",
      };
      const next = await submit("additional-property", {
        additional_property_owned: "shared_ownership",
      });

      assert.equal(next, `${BASE}/cannot-use-service`);
      await assertRenders("cannot-use-service");
    });

    it("saves additional-property rows and supports adding another", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        property_owned: "none",
        additional_property_owned: "with_mortgage",
      };

      const next = await submit("additional-property-details", {
        action: "add",
        additional_properties_0_house_value: "80000",
        additional_properties_0_mortgage: "20000",
        additional_properties_0_percentage_owned: "50",
      });

      assert.equal(next, `${BASE}/additional-property-details`);
      assert.deepEqual(answerStore.answers.additional_properties, [
        {
          house_value: 80000,
          mortgage: 20000,
          percentage_owned: 50,
        },
        {},
      ]);
      await assertRenders("additional-property-details");
    });

    it("routes through the partner's additional-property steps", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        partner: true,
        partner_date_of_birth: "1980-01-01",
        property_owned: "none",
        additional_property_owned: "none",
      };

      const next = await submit("partner-additional-property", {
        partner_additional_property_owned: "outright",
      });

      assert.equal(next, `${BASE}/partner-additional-property-details`);
      await assertRenders("partner-additional-property-details");
    });

    it("cannot continue with the partner's shared-ownership additional property", async () => {
      answerStore.answers = {
        ...answerStore.answers,
        partner: true,
        partner_date_of_birth: "1980-01-01",
        property_owned: "none",
        additional_property_owned: "none",
      };

      const next = await submit("partner-additional-property", {
        partner_additional_property_owned: "shared_ownership",
      });

      assert.equal(next, `${BASE}/cannot-use-service`);
      await assertRenders("cannot-use-service");
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
