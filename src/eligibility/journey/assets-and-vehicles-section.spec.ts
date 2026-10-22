import { strict as assert } from "assert";
import { ForgeTestHarness } from "@ministryofjustice/hmpps-forge/core/testing";
import type {
  ForgeTestClient,
  TestResult,
} from "@ministryofjustice/hmpps-forge/core/testing";
import { govukComponents } from "@ministryofjustice/hmpps-forge/govuk-components";
import type { Answers } from "../domain/logic.js";
import { buildAssessment } from "../domain/cfe/payload.js";
import type { AnswerStore, EligibilityDeps } from "../ports/index.js";
import { createEligibilityPackage } from "./index.js";

const CASE_ID = "assets-case";
const BASE = `/cases/${CASE_ID}/eligibility`;
const TODAY = new Date(Date.UTC(2024, 5, 1));

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

interface RenderedField {
  code: string;
  value?: unknown;
  hint?: unknown;
  items?: { value: string; text: string; checked?: boolean }[];
  fieldset?: { legend?: { text?: string } };
}

const CLIENT_ASSETS = {
  bank_accounts_0_amount: "0",
  investments_relevant: "false",
  valuables_relevant: "false",
};

const VEHICLE_ROW = {
  vehicles_0_vehicle_value: "5000",
  vehicles_0_vehicle_pcp: "false",
  vehicles_0_vehicle_over_3_years_ago: "true",
  vehicles_0_vehicle_in_regular_use: "true",
};

describe("eligibility journey: assets and vehicles section", () => {
  let client: ForgeTestClient;
  let answerStore: InMemoryAnswerStore;

  const params = { caseId: CASE_ID };

  async function post(step: string, body: Record<string, unknown>) {
    return client.post(`${BASE}/${step}`, { params, body });
  }

  async function submit(step: string, body: Record<string, unknown>) {
    const result = await post(step, body);
    assert.equal(
      result.type,
      "redirect",
      `POST ${step} did not redirect: ${
        result.type === "render"
          ? JSON.stringify(
              Object.keys(body).map((code) => [code, errorsFor(result, code)]),
            )
          : result.type === "error"
            ? JSON.stringify(result.error)
            : result.type
      }`,
    );
    return result.type === "redirect" ? result.url : undefined;
  }

  async function get(step: string) {
    return client.get(`${BASE}/${step}`, { params });
  }

  async function assertRenders(url: string): Promise<TestResult> {
    const path = url.startsWith(BASE) ? url : `${BASE}/${url}`;
    const result = await client.get(path, { params });
    assert.equal(
      result.type,
      "render",
      `GET ${path} did not render: ${result.type === "redirect" ? result.url : result.type}`,
    );
    return result;
  }

  function rendered(result: TestResult): string {
    assert.equal(result.type, "render");
    return JSON.stringify(
      result.type === "render" ? result.context.blocks : [],
    );
  }

  function fieldsOf(result: TestResult): RenderedField[] {
    assert.equal(
      result.type,
      "render",
      `expected render, got ${result.type === "error" ? JSON.stringify(result.error) : result.type}`,
    );
    const found: RenderedField[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
      } else if (node !== null && typeof node === "object") {
        const block = node as {
          variant?: string;
          properties?: RenderedField & { visibleWhen?: unknown };
        };
        // Forge leaves hidden blocks in the context, but does not render them.
        if (block.properties?.visibleWhen === false) return;
        if (
          ["govukRadioInput", "govukTextInput", "govukCheckboxInput"].includes(
            block.variant ?? "",
          ) &&
          block.properties
        ) {
          found.push(block.properties);
        }
        Object.values(node).forEach(walk);
      }
    };
    walk(result.type === "render" ? result.context.blocks : []);
    return found;
  }

  function codesOf(result: TestResult): string[] {
    return fieldsOf(result).map((field) => field.code);
  }

  function field(result: TestResult, code: string): RenderedField | undefined {
    return fieldsOf(result).find((candidate) => candidate.code === code);
  }

  function errorsFor(result: TestResult, code: string): string[] {
    return result.type === "render"
      ? result
          .getValidationErrorsByFieldCode(code)
          .map((error) => String(error.message))
      : [];
  }

  function withPartner(): void {
    Object.assign(answerStore.answers, {
      partner: true,
      partner_date_of_birth: "1980-01-01",
      partner_additional_property_owned: "none",
    });
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
    // Passported certificated work: the shortest route that asks every step
    // in the section.
    answerStore.answers = {
      level_of_help: "certificated",
      client_age: "standard",
      date_of_birth: "1980-01-01",
      domestic_abuse_applicant: false,
      immigration_or_asylum_type_upper_tribunal: "no_upper_tribunal",
      partner: false,
      passporting: true,
      property_owned: "none",
      additional_property_owned: "none",
    };
  });

  describe("client assets", () => {
    it("requires the yes/no answers and a bank account total, with CCQ's messages", async () => {
      const result = await post("assets", {});

      assert.deepEqual(errorsFor(result, "investments_relevant"), [
        "Select yes if client has any investments",
      ]);
      assert.deepEqual(errorsFor(result, "valuables_relevant"), [
        "Select yes if client has any valuables worth more than £500",
      ]);
      assert.deepEqual(errorsFor(result, "bank_accounts_0_amount"), [
        "Enter total money in bank account. Enter 0 if this does not apply.",
      ]);

      const negative = await post("assets", {
        ...CLIENT_ASSETS,
        bank_accounts_0_amount: "-1",
      });
      assert.deepEqual(errorsFor(negative, "bank_accounts_0_amount"), [
        "Total money in bank account must be 0 or more. Enter 0 if this does not apply.",
      ]);
    });

    it("numbers each bank account's messages once there are several", async () => {
      answerStore.answers.bank_accounts = [{ amount: 1 }, { amount: 2 }];
      const result = await post("assets", {
        ...CLIENT_ASSETS,
        bank_accounts_1_amount: "abc",
      });

      assert.deepEqual(errorsFor(result, "bank_accounts_1_amount"), [
        "Total money in bank account 2 must be a number. Enter 0 if this does not apply.",
      ]);
    });

    it("requires investments greater than zero only when the client has investments", async () => {
      const cases: [string, string][] = [
        ["", "Enter the total value of investments."],
        ["lots", "The total value of all investments must be a number."],
        ["0", "The total value of all investments must be greater than 0."],
      ];
      for (const [investments, message] of cases) {
        const result = await post("assets", {
          ...CLIENT_ASSETS,
          investments_relevant: "true",
          investments,
        });
        assert.deepEqual(errorsFor(result, "investments"), [message]);
      }

      const notRelevant = await post("assets", {
        ...CLIENT_ASSETS,
        investments: "lots",
      });
      assert.deepEqual(errorsFor(notRelevant, "investments"), []);
    });

    it("requires valuables of at least £500 only when the client has valuables", async () => {
      const cases: [string, string][] = [
        ["", "Enter the total value of items worth £500 or more."],
        ["a ring", "Value of items worth £500 or more must be a number."],
        ["499.99", "Valuable items must be £500 or more."],
      ];
      for (const [valuables, message] of cases) {
        const result = await post("assets", {
          ...CLIENT_ASSETS,
          valuables_relevant: "true",
          valuables,
        });
        assert.deepEqual(errorsFor(result, "valuables"), [message]);
      }

      const atThreshold = await post("assets", {
        ...CLIENT_ASSETS,
        valuables_relevant: "true",
        valuables: "500",
      });
      assert.equal(atThreshold.type, "redirect");
    });

    it("saves amounts as numbers and dispute flags as booleans, then goes to the vehicle question", async () => {
      answerStore.answers.bank_accounts = [{ amount: "" }, { amount: "" }];
      const next = await submit("assets", {
        bank_accounts_0_amount: "125.50",
        bank_accounts_0_account_in_dispute: ["true"],
        bank_accounts_1_amount: "0",
        investments_relevant: "true",
        investments: "1000",
        investments_in_dispute: ["true"],
        valuables_relevant: "true",
        valuables: "750",
      });

      assert.equal(next, `${BASE}/vehicle`);
      assert.deepEqual(answerStore.answers.bank_accounts, [
        { amount: 125.5, account_in_dispute: true },
        { amount: 0 },
      ]);
      assert.equal(answerStore.answers.investments_relevant, true);
      assert.equal(answerStore.answers.investments, 1000);
      assert.equal(answerStore.answers.investments_in_dispute, true);
      assert.equal(answerStore.answers.valuables_relevant, true);
      assert.equal(answerStore.answers.valuables, 750);
      assert.equal(answerStore.answers.valuables_in_dispute, false);
      await assertRenders(next ?? "");
    });

    it("loads saved answers back into the form as strings", async () => {
      Object.assign(answerStore.answers, {
        bank_accounts: [{ amount: 125.5, account_in_dispute: true }],
        investments_relevant: true,
        investments: 1000,
        investments_in_dispute: true,
        valuables_relevant: false,
      });

      const result = await assertRenders("assets");

      assert.equal(field(result, "bank_accounts_0_amount")?.value, "125.5");
      assert.equal(field(result, "investments")?.value, "1000");
      assert.equal(field(result, "investments_relevant")?.value, "true");
      assert.equal(field(result, "valuables_relevant")?.value, "false");
      assert.deepEqual(field(result, "investments_in_dispute")?.value, [
        "true",
      ]);
      assert.deepEqual(
        field(result, "bank_accounts_0_account_in_dispute")?.value,
        ["true"],
      );
    });

    it("clears a saved total and dispute flag when the answer changes to no", async () => {
      Object.assign(answerStore.answers, {
        bank_accounts: [{ amount: 10 }],
        investments_relevant: true,
        investments: 1000,
        investments_in_dispute: true,
        valuables_relevant: true,
        valuables: 600,
        valuables_in_dispute: true,
      });

      await submit("assets", {
        ...CLIENT_ASSETS,
        investments: "1000",
        investments_in_dispute: ["true"],
        valuables: "600",
        valuables_in_dispute: ["true"],
      });

      for (const key of [
        "investments",
        "investments_in_dispute",
        "valuables",
        "valuables_in_dispute",
      ]) {
        assert.equal(answerStore.answers[key], undefined, key);
      }
      assert.deepEqual(
        buildAssessment(answerStore.answers, TODAY).capitals,
        undefined,
      );
    });

    it("adds and removes bank accounts without validating", async () => {
      const added = await submit("assets", {
        action: "add",
        bank_accounts_0_amount: "",
      });
      assert.equal(added, `${BASE}/assets`);
      assert.deepEqual(answerStore.answers.bank_accounts, [
        { amount: "" },
        { amount: "" },
      ]);

      const page = await assertRenders("assets");
      assert.deepEqual(
        codesOf(page).filter((code) => code.startsWith("bank_accounts_")),
        [
          "bank_accounts_0_amount",
          "bank_accounts_0_account_in_dispute",
          "bank_accounts_1_amount",
          "bank_accounts_1_account_in_dispute",
        ],
      );

      const removed = await submit("assets", {
        remove: "1",
        bank_accounts_0_amount: "10",
        bank_accounts_1_amount: "20",
      });
      assert.equal(removed, `${BASE}/assets`);
      assert.deepEqual(answerStore.answers.bank_accounts, [{ amount: 10 }]);
    });

    it("hides and drops dispute flags when SMOD does not apply", async () => {
      answerStore.answers.immigration_or_asylum_type_upper_tribunal =
        "immigration_upper";
      answerStore.answers.asylum_support = false;

      const page = await assertRenders("assets");
      const codes = codesOf(page);
      assert.ok(!codes.includes("investments_in_dispute"));
      assert.ok(!codes.includes("valuables_in_dispute"));
      assert.ok(!codes.includes("bank_accounts_0_account_in_dispute"));

      await submit("assets", {
        bank_accounts_0_amount: "100",
        bank_accounts_0_account_in_dispute: ["true"],
        investments_relevant: "true",
        investments: "1000",
        investments_in_dispute: ["true"],
        valuables_relevant: "false",
      });

      assert.deepEqual(answerStore.answers.bank_accounts, [{ amount: 100 }]);
      assert.equal(answerStore.answers.investments_in_dispute, undefined);
    });

    it("shows business capital guidance only to a self-employed client outside controlled work", async () => {
      answerStore.answers.incomes = [{ income_type: "self_employment" }];
      const certificated = rendered(await assertRenders("assets"));
      assert.match(certificated, /Business capital/u);
      assert.match(certificated, /Help with trusts/u);

      answerStore.answers.incomes = [{ income_type: "employment" }];
      assert.doesNotMatch(
        rendered(await assertRenders("assets")),
        /Business capital/u,
      );

      Object.assign(answerStore.answers, {
        level_of_help: "controlled",
        immigration_or_asylum: false,
        incomes: [{ income_type: "self_employment" }],
      });
      const controlled = rendered(await assertRenders("assets"));
      assert.doesNotMatch(controlled, /Business capital/u);
      assert.doesNotMatch(controlled, /Help with trusts/u);
    });

    it("builds the CFE capitals from the saved answers", async () => {
      answerStore.answers.bank_accounts = [{ amount: "" }, { amount: "" }];
      await submit("assets", {
        bank_accounts_0_amount: "125.50",
        bank_accounts_0_account_in_dispute: ["true"],
        bank_accounts_1_amount: "0",
        investments_relevant: "true",
        investments: "1000",
        investments_in_dispute: ["true"],
        valuables_relevant: "true",
        valuables: "750",
      });

      assert.deepEqual(buildAssessment(answerStore.answers, TODAY).capitals, {
        bank_accounts: [
          {
            value: 125.5,
            description: "Liquid Asset",
            subject_matter_of_dispute: true,
          },
        ],
        non_liquid_capital: [
          {
            value: 1000,
            description: "Non Liquid Asset",
            subject_matter_of_dispute: true,
          },
          {
            value: 750,
            description: "Non Liquid Asset",
            subject_matter_of_dispute: false,
          },
        ],
      });
    });
  });

  describe("partner assets", () => {
    beforeEach(withPartner);

    it("goes from the client's assets to the partner's", async () => {
      assert.equal(
        await submit("assets", CLIENT_ASSETS),
        `${BASE}/partner-assets`,
      );
      assert.match(
        rendered(await assertRenders("assets")),
        /Do not enter them again on the partner questions/u,
      );
    });

    it("asks with partner field codes and wording, and no dispute fields", async () => {
      await submit("assets", CLIENT_ASSETS);
      const page = await assertRenders("partner-assets");

      assert.deepEqual(codesOf(page), [
        "partner_bank_accounts_0_amount",
        "partner_investments_relevant",
        "partner_investments",
        "partner_valuables_relevant",
        "partner_valuables",
      ]);
      assert.equal(
        field(page, "partner_investments_relevant")?.fieldset?.legend?.text,
        "Does the partner have any investments?",
      );

      const result = await post("partner-assets", {
        partner_investments_relevant: "true",
        partner_investments: "0",
        partner_valuables_relevant: "true",
        partner_valuables: "100",
      });
      assert.deepEqual(errorsFor(result, "partner_investments_relevant"), []);
      assert.deepEqual(errorsFor(result, "partner_investments"), [
        "The total value of all investments must be greater than 0.",
      ]);
      assert.deepEqual(errorsFor(result, "partner_valuables"), [
        "Valuable items must be £500 or more.",
      ]);
      assert.deepEqual(errorsFor(result, "partner_bank_accounts_0_amount"), [
        "Enter total money in bank account. Enter 0 if this does not apply.",
      ]);

      const missing = await post("partner-assets", {
        partner_bank_accounts_0_amount: "0",
      });
      assert.deepEqual(errorsFor(missing, "partner_investments_relevant"), [
        "Select yes if the partner has any investments",
      ]);
      assert.deepEqual(errorsFor(missing, "partner_valuables_relevant"), [
        "Select yes if the partner has any valuables worth more than £500",
      ]);
    });

    it("saves the partner's amounts as numbers and builds their CFE capitals", async () => {
      await submit("assets", CLIENT_ASSETS);
      answerStore.answers.partner_bank_accounts = [
        { amount: "" },
        { amount: "" },
      ];
      const next = await submit("partner-assets", {
        partner_bank_accounts_0_amount: "300",
        partner_bank_accounts_1_amount: "40.10",
        partner_investments_relevant: "true",
        partner_investments: "2000",
        partner_valuables_relevant: "false",
      });

      assert.equal(next, `${BASE}/vehicle`);
      assert.deepEqual(answerStore.answers.partner_bank_accounts, [
        { amount: 300 },
        { amount: 40.1 },
      ]);
      assert.equal(answerStore.answers.partner_investments, 2000);
      assert.equal(answerStore.answers.partner_valuables, undefined);
      assert.deepEqual(
        buildAssessment(answerStore.answers, TODAY).partner?.capitals,
        {
          bank_accounts: [
            {
              value: 300,
              description: "Liquid Asset",
              subject_matter_of_dispute: false,
            },
            {
              value: 40.1,
              description: "Liquid Asset",
              subject_matter_of_dispute: false,
            },
          ],
          non_liquid_capital: [
            {
              value: 2000,
              description: "Non Liquid Asset",
              subject_matter_of_dispute: false,
            },
          ],
        },
      );
      await assertRenders(next ?? "");
    });

    it("adds and removes the partner's bank accounts", async () => {
      await submit("assets", CLIENT_ASSETS);
      assert.equal(
        await submit("partner-assets", {
          action: "add",
          partner_bank_accounts_0_amount: "5",
        }),
        `${BASE}/partner-assets`,
      );
      assert.deepEqual(answerStore.answers.partner_bank_accounts, [
        { amount: 5 },
        { amount: "" },
      ]);

      await submit("partner-assets", {
        remove: "1",
        partner_bank_accounts_0_amount: "5",
        partner_bank_accounts_1_amount: "",
      });
      assert.deepEqual(answerStore.answers.partner_bank_accounts, [
        { amount: 5 },
      ]);
    });
  });

  describe("vehicle", () => {
    beforeEach(async () => {
      await submit("assets", CLIENT_ASSETS);
    });

    it("requires an answer, saved as vehicle_owned", async () => {
      const result = await post("vehicle", {});
      assert.deepEqual(errorsFor(result, "vehicle_owned"), [
        "Select yes if your client owns a vehicle",
      ]);

      const next = await submit("vehicle", { vehicle_owned: "false" });
      assert.equal(answerStore.answers.vehicle_owned, false);
      assert.equal(answerStore.answers.vehicles, undefined);
      assert.equal(next, `${BASE}/check-your-answers`);
      await assertRenders(next ?? "");
    });

    it("goes to the vehicle details when the client owns a vehicle", async () => {
      const next = await submit("vehicle", { vehicle_owned: "true" });
      assert.equal(answerStore.answers.vehicle_owned, true);
      assert.equal(next, `${BASE}/vehicles-details`);
      await assertRenders(next ?? "");
    });

    it("words the question for the client alone, with the hint", async () => {
      const page = await assertRenders("vehicle");
      const question = field(page, "vehicle_owned");
      assert.equal(
        question?.fieldset?.legend?.text,
        "Does your client own a vehicle?",
      );
      assert.match(
        JSON.stringify(question?.hint),
        /cars, vans and motorcycles/u,
      );
    });

    it("words the question for the client and partner, without the hint", async () => {
      withPartner();
      await submit("partner-assets", {
        partner_bank_accounts_0_amount: "0",
        partner_investments_relevant: "false",
        partner_valuables_relevant: "false",
      });

      const page = await assertRenders("vehicle");
      const question = field(page, "vehicle_owned");
      assert.equal(
        question?.fieldset?.legend?.text,
        "Does your client or their partner own a vehicle?",
      );
      // An empty hint is not rendered.
      assert.equal(question?.hint, "");
      assert.doesNotMatch(rendered(page), /cars, vans and motorcycles/u);
    });
  });

  describe("vehicle details", () => {
    beforeEach(async () => {
      await submit("assets", CLIENT_ASSETS);
      await submit("vehicle", { vehicle_owned: "true" });
    });

    it("requires every answer with CCQ's messages", async () => {
      const result = await post("vehicles-details", {});

      assert.deepEqual(errorsFor(result, "vehicles_0_vehicle_value"), [
        "Enter the estimated value of the vehicle",
      ]);
      assert.deepEqual(errorsFor(result, "vehicles_0_vehicle_pcp"), [
        "Select yes if there are payments left on the vehicle",
      ]);
      assert.deepEqual(errorsFor(result, "vehicles_0_vehicle_finance"), []);
      assert.deepEqual(
        errorsFor(result, "vehicles_0_vehicle_over_3_years_ago"),
        ["Select yes if the vehicle was bought over 3 years ago"],
      );
      assert.deepEqual(errorsFor(result, "vehicles_0_vehicle_in_regular_use"), [
        "Select yes if the vehicle is in regular use",
      ]);
    });

    it("requires a value greater than zero", async () => {
      const cases: [string, string][] = [
        ["car", "The estimated value of the vehicle must be a number"],
        ["0", "The estimated value of the vehicle must be more than 0"],
      ];
      for (const [value, message] of cases) {
        const result = await post("vehicles-details", {
          ...VEHICLE_ROW,
          vehicles_0_vehicle_value: value,
        });
        assert.deepEqual(errorsFor(result, "vehicles_0_vehicle_value"), [
          message,
        ]);
      }
    });

    it("requires payments left greater than zero only when there are payments left", async () => {
      const cases: [string, string][] = [
        ["", "Enter the value of payments left on the vehicle"],
        ["some", "The value of payments left on the vehicle must be a number"],
        ["0", "The value of payments left on the vehicle must be more than 0"],
      ];
      for (const [finance, message] of cases) {
        const result = await post("vehicles-details", {
          ...VEHICLE_ROW,
          vehicles_0_vehicle_pcp: "true",
          vehicles_0_vehicle_finance: finance,
        });
        assert.deepEqual(errorsFor(result, "vehicles_0_vehicle_finance"), [
          message,
        ]);
      }

      const noPayments = await post("vehicles-details", {
        ...VEHICLE_ROW,
        vehicles_0_vehicle_finance: "some",
      });
      assert.equal(noPayments.type, "redirect");
      assert.equal(
        (answerStore.answers.vehicles as Answers[])[0].vehicle_finance,
        undefined,
      );
    });

    it("numbers each vehicle's messages once there are several", async () => {
      answerStore.answers.vehicles = [{}, {}];
      const result = await post("vehicles-details", {
        ...VEHICLE_ROW,
        vehicles_1_vehicle_value: "0",
        vehicles_1_vehicle_pcp: "true",
      });

      assert.deepEqual(errorsFor(result, "vehicles_1_vehicle_value"), [
        "The estimated value of vehicle 2 must be more than 0",
      ]);
      assert.deepEqual(errorsFor(result, "vehicles_1_vehicle_finance"), [
        "Enter the value of payments left on vehicle 2",
      ]);
      assert.deepEqual(
        errorsFor(result, "vehicles_1_vehicle_over_3_years_ago"),
        ["Select yes if vehicle 2 was bought over 3 years ago"],
      );
    });

    it("saves rows with numbers and booleans, then builds the CFE vehicles", async () => {
      answerStore.answers.vehicles = [{}, {}];
      const next = await submit("vehicles-details", {
        ...VEHICLE_ROW,
        vehicles_0_vehicle_in_dispute: ["true"],
        vehicles_1_vehicle_value: "8000.50",
        vehicles_1_vehicle_pcp: "true",
        vehicles_1_vehicle_finance: "1200",
        vehicles_1_vehicle_over_3_years_ago: "false",
        vehicles_1_vehicle_in_regular_use: "false",
      });

      assert.equal(next, `${BASE}/check-your-answers`);
      assert.deepEqual(answerStore.answers.vehicles, [
        {
          vehicle_value: 5000,
          vehicle_pcp: false,
          vehicle_over_3_years_ago: true,
          vehicle_in_regular_use: true,
          vehicle_in_dispute: true,
        },
        {
          vehicle_value: 8000.5,
          vehicle_pcp: true,
          vehicle_finance: 1200,
          vehicle_over_3_years_ago: false,
          vehicle_in_regular_use: false,
        },
      ]);
      assert.deepEqual(buildAssessment(answerStore.answers, TODAY).vehicles, [
        {
          value: 5000,
          loan_amount_outstanding: 0,
          date_of_purchase: "2020-06-01",
          in_regular_use: true,
          subject_matter_of_dispute: true,
        },
        {
          value: 8000.5,
          loan_amount_outstanding: 1200,
          date_of_purchase: "2022-06-01",
          in_regular_use: false,
          subject_matter_of_dispute: false,
        },
      ]);
      await assertRenders(next ?? "");
    });

    it("loads saved rows back into the form as strings", async () => {
      answerStore.answers.vehicles = [
        {
          vehicle_value: 5000,
          vehicle_pcp: true,
          vehicle_finance: 100,
          vehicle_over_3_years_ago: false,
          vehicle_in_regular_use: true,
        },
      ];

      const page = await assertRenders("vehicles-details");
      assert.equal(field(page, "vehicles_0_vehicle_value")?.value, "5000");
      assert.equal(field(page, "vehicles_0_vehicle_pcp")?.value, "true");
      assert.equal(field(page, "vehicles_0_vehicle_finance")?.value, "100");
      assert.equal(
        field(page, "vehicles_0_vehicle_over_3_years_ago")?.value,
        "false",
      );
    });

    it("clears the payments left when the answer changes to no", async () => {
      await submit("vehicles-details", {
        ...VEHICLE_ROW,
        vehicles_0_vehicle_pcp: "true",
        vehicles_0_vehicle_finance: "500",
      });
      assert.equal(
        (answerStore.answers.vehicles as Answers[])[0].vehicle_finance,
        500,
      );

      await submit("vehicles-details", {
        ...VEHICLE_ROW,
        vehicles_0_vehicle_finance: "500",
      });
      assert.equal(
        (answerStore.answers.vehicles as Answers[])[0].vehicle_finance,
        undefined,
      );
      assert.equal(
        buildAssessment(answerStore.answers, TODAY).vehicles?.[0]
          ?.loan_amount_outstanding,
        0,
      );
    });

    it("adds and removes vehicles without validating", async () => {
      assert.equal(
        await submit("vehicles-details", { action: "add", ...VEHICLE_ROW }),
        `${BASE}/vehicles-details`,
      );
      const page = await assertRenders("vehicles-details");
      assert.match(rendered(page), /Vehicle 2/u);
      assert.ok(codesOf(page).includes("vehicles_1_vehicle_value"));

      await submit("vehicles-details", {
        remove: "1",
        ...VEHICLE_ROW,
        vehicles_1_vehicle_value: "700",
      });
      assert.deepEqual(answerStore.answers.vehicles, [
        {
          vehicle_value: 5000,
          vehicle_pcp: false,
          vehicle_over_3_years_ago: true,
          vehicle_in_regular_use: true,
        },
      ]);
    });

    it("hides and drops the dispute flag when SMOD does not apply", async () => {
      answerStore.answers.immigration_or_asylum_type_upper_tribunal =
        "immigration_upper";
      answerStore.answers.asylum_support = false;

      const page = await assertRenders("vehicles-details");
      assert.ok(!codesOf(page).includes("vehicles_0_vehicle_in_dispute"));

      await submit("vehicles-details", {
        ...VEHICLE_ROW,
        vehicles_0_vehicle_in_dispute: ["true"],
      });
      assert.equal(
        (answerStore.answers.vehicles as Answers[])[0].vehicle_in_dispute,
        undefined,
      );
    });

    it("drops the vehicles from the CFE payload when the vehicle answer changes to no", async () => {
      await submit("vehicles-details", VEHICLE_ROW);
      await submit("vehicle", { vehicle_owned: "false" });

      assert.equal(
        buildAssessment(answerStore.answers, TODAY).vehicles,
        undefined,
      );
    });
  });
});
