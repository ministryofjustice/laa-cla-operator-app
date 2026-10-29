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
import { DEPENDANT_INCOMES_LIST } from "../lists/index.js";
import { describeRows, rowCountFor } from "../lists/add-another.js";
import { createEligibilityPackage } from "./index.js";

const CASE_ID = "dependants-case";
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

interface RenderedField {
  code: string;
  items?: { value: string; text: string }[];
  fieldset?: { legend?: { text?: string } };
}

describe("eligibility journey: dependants section", () => {
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
        result.type === "error"
          ? JSON.stringify(result.error)
          : result.type === "render"
            ? JSON.stringify(
                [
                  "dependant_incomes_0_frequency",
                  "dependant_incomes_0_amount",
                ].map((code) => [
                  code,
                  result
                    .getValidationErrorsByFieldCode(code)
                    .map((error) => error.message),
                ]),
              )
            : result.type
      }`,
    );
    return result.type === "redirect" ? result.url : undefined;
  }

  async function get(step: string) {
    return client.get(`${BASE}/${step}`, { params });
  }

  async function assertRenders(url: string): Promise<void> {
    const path = url.startsWith(BASE) ? url : `${BASE}/${url}`;
    const result = await client.get(path, { params });
    assert.equal(
      result.type,
      "render",
      `GET ${path} did not render: ${result.type === "redirect" ? result.url : result.type}`,
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
          properties?: RenderedField;
        };
        if (
          block.variant === "govukRadioInput" ||
          block.variant === "govukTextInput"
        ) {
          if (block.properties) found.push(block.properties);
        }
        Object.values(node).forEach(walk);
      }
    };
    walk(result.type === "render" ? result.context.blocks : []);
    return found;
  }

  function errorsFor(result: TestResult, code: string): string[] {
    return result.type === "render"
      ? result
          .getValidationErrorsByFieldCode(code)
          .map((error) => String(error.message))
      : [];
  }

  function seedDependants(income = true): void {
    Object.assign(answerStore.answers, {
      child_dependants: true,
      child_dependants_count: 2,
      adult_dependants: true,
      adult_dependants_count: 1,
      dependants_get_income: income,
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
    answerStore.answers = {
      level_of_help: "certificated",
      client_age: "standard",
      immigration_or_asylum: false,
      domestic_abuse_applicant: false,
      immigration_or_asylum_type_upper_tribunal: "no_upper_tribunal",
      partner: false,
      passporting: false,
      employment_status: "unemployed",
      receives_benefits: false,
    };
  });

  describe("dependant details", () => {
    it("requires both yes/no answers with CCQ's messages", async () => {
      const result = await post("dependant-details", {});

      assert.deepEqual(errorsFor(result, "child_dependants"), [
        "Select yes if your client has child dependants",
      ]);
      assert.deepEqual(errorsFor(result, "adult_dependants"), [
        "Select yes if your client has adult dependants",
      ]);
    });

    it("requires a positive whole-number count only for each yes answer", async () => {
      const missing = await post("dependant-details", {
        child_dependants: "true",
        adult_dependants: "false",
      });
      assert.deepEqual(errorsFor(missing, "child_dependants_count"), [
        "Enter the number of child dependants",
      ]);
      assert.deepEqual(errorsFor(missing, "adult_dependants_count"), []);

      const invalid = await post("dependant-details", {
        child_dependants: "true",
        child_dependants_count: "1.5",
        adult_dependants: "false",
      });
      assert.deepEqual(errorsFor(invalid, "child_dependants_count"), [
        "Child dependants must be a whole number",
      ]);

      const zero = await post("dependant-details", {
        child_dependants: "true",
        child_dependants_count: "0",
        adult_dependants: "false",
      });
      assert.deepEqual(errorsFor(zero, "child_dependants_count"), [
        "The number of child dependants must be greater than zero",
      ]);
    });

    it("renders the partner-specific legend and CCQ wording", async () => {
      answerStore.answers.partner = true;
      const result = await get("dependant-details");
      const child = fieldsOf(result).find(
        (field) => field.code === "child_dependants",
      );
      assert.equal(
        child?.fieldset?.legend?.text,
        "Does your client or their partner have any child dependants?",
      );
      assert.equal(result.type, "render");
      const rendered = JSON.stringify(
        result.type === "render" ? result.context.blocks : [],
      );
      assert.match(rendered, /client and their partner's dependants/u);
      assert.match(rendered, /381\.86/u);
    });

    it("saves boolean answers and counts as numbers, then renders the next step", async () => {
      const next = await submit("dependant-details", {
        child_dependants: "true",
        child_dependants_count: "2",
        adult_dependants: "false",
      });

      assert.equal(next, `${BASE}/dependant-income`);
      assert.equal(answerStore.answers.child_dependants, true);
      assert.equal(answerStore.answers.child_dependants_count, 2);
      assert.equal(answerStore.answers.adult_dependants, false);
      assert.equal(answerStore.answers.adult_dependants_count, undefined);
      await assertRenders(next ?? "");
    });

    it("clears a previously saved count when its answer changes to no", async () => {
      answerStore.answers.child_dependants = true;
      answerStore.answers.child_dependants_count = 3;
      answerStore.answers.adult_dependants = true;
      answerStore.answers.adult_dependants_count = 2;

      const next = await submit("dependant-details", {
        child_dependants: "false",
        adult_dependants: "false",
      });

      assert.equal(answerStore.answers.child_dependants, false);
      assert.equal(answerStore.answers.adult_dependants, false);
      assert.equal(answerStore.answers.child_dependants_count, undefined);
      assert.equal(answerStore.answers.adult_dependants_count, undefined);
      assert.deepEqual(
        stepsFor(answerStore.answers).filter((step) =>
          step.startsWith("dependant_"),
        ),
        ["dependant_details"],
      );
      await assertRenders(next ?? "");
    });
  });

  describe("dependant income", () => {
    beforeEach(() => seedDependants());

    it("requires a yes/no answer and shows CCQ's examples", async () => {
      const missing = await post("dependant-income", {});
      assert.deepEqual(errorsFor(missing, "dependants_get_income"), [
        "Select yes if any dependants aged 16 or over get income",
      ]);

      const result = await get("dependant-income");
      assert.equal(result.type, "render");
      assert.match(
        JSON.stringify(result.type === "render" ? result.context.blocks : []),
        /grant received by a child dependant over 16/u,
      );
    });

    it("saves a boolean and redirects to dependant income details when yes", async () => {
      const next = await submit("dependant-income", {
        dependants_get_income: "true",
      });

      assert.equal(next, `${BASE}/dependant-income-details`);
      assert.equal(answerStore.answers.dependants_get_income, true);
      await assertRenders(next ?? "");
    });
  });

  describe("dependant income details", () => {
    beforeEach(() => seedDependants());

    it("uses CCQ's frequencies and validates both row fields", async () => {
      const result = await get("dependant-income-details");
      const frequency = fieldsOf(result).find(
        (field) => field.code === "dependant_incomes_0_frequency",
      );
      assert.deepEqual(
        frequency?.items?.map((item) => item.value),
        [
          "every_week",
          "every_two_weeks",
          "every_four_weeks",
          "monthly",
          "three_months",
        ],
      );

      const missing = await post("dependant-income-details", {});
      assert.deepEqual(
        errorsFor(missing, "dependant_incomes_0_frequency"),
        ["Select when the dependant normally gets this income"],
      );
      assert.deepEqual(errorsFor(missing, "dependant_incomes_0_amount"), [
        "Enter income the dependant gets",
      ]);

      const zero = await post("dependant-income-details", {
        dependant_incomes_0_frequency: "monthly",
        dependant_incomes_0_amount: "0",
      });
      assert.deepEqual(
        errorsFor(zero, "dependant_incomes_0_amount"),
        ["Income for the dependant must be more than 0"],
      );
    });

    it("enforces the monthly and non-monthly equivalent ceiling", async () => {
      const monthly = await post("dependant-income-details", {
        dependant_incomes_0_frequency: "monthly",
        dependant_incomes_0_amount: "381.86",
      });
      assert.deepEqual(
        errorsFor(monthly, "dependant_incomes_0_amount"),
        [
          "If this dependant gets income equivalent to £381.86 or more per month, go back and remove them as a dependant to continue with this check.",
        ],
      );

      const weekly = await post("dependant-income-details", {
        dependant_incomes_0_frequency: "every_week",
        dependant_incomes_0_amount: "88.12",
      });
      assert.deepEqual(
        errorsFor(weekly, "dependant_incomes_0_amount"),
        [
          "If this dependant gets income equivalent to £381.86 or more per month, go back and remove them as a dependant to continue with this check.",
        ],
      );
    });

    it("caps added rows at the combined adult and child counts", async () => {
      await submit("dependant-income-details", {
        action: "add",
        dependant_incomes_0_frequency: "monthly",
        dependant_incomes_0_amount: "20",
      });
      assert.equal(
        rowCountFor(DEPENDANT_INCOMES_LIST, answerStore.answers),
        2,
      );

      await submit("dependant-income-details", {
        action: "add",
        dependant_incomes_0_frequency: "monthly",
        dependant_incomes_0_amount: "20",
        dependant_incomes_1_frequency: "monthly",
        dependant_incomes_1_amount: "30",
      });
      assert.equal(
        rowCountFor(DEPENDANT_INCOMES_LIST, answerStore.answers),
        3,
      );

      await submit("dependant-income-details", {
        action: "add",
        dependant_incomes_0_frequency: "monthly",
        dependant_incomes_0_amount: "20",
        dependant_incomes_1_frequency: "monthly",
        dependant_incomes_1_amount: "30",
        dependant_incomes_2_frequency: "monthly",
        dependant_incomes_2_amount: "40",
      });
      assert.equal(
        rowCountFor(DEPENDANT_INCOMES_LIST, answerStore.answers),
        3,
      );
      assert.equal(describeRows(DEPENDANT_INCOMES_LIST, answerStore.answers).length, 3);
    });

    it("saves amounts as numbers and redirects onward", async () => {
      const next = await submit("dependant-income-details", {
        dependant_incomes_0_frequency: "monthly",
        dependant_incomes_0_amount: "50.25",
      });

      const savedIncomes = answerStore.answers.dependant_incomes;
      assert.ok(Array.isArray(savedIncomes));
      assert.equal(savedIncomes.length, 1);
      assert.deepEqual(savedIncomes, [
        { amount: 50.25, frequency: "monthly" },
      ]);
      assert.ok(typeof next === "string" && next !== `${BASE}/dependant-income-details`);
      await assertRenders(next ?? "");
    });
  });
});
