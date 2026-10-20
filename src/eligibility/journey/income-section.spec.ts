// Drives the income section (employment status, employment income, benefits,
// benefit details, other income and their partner equivalents) through
// Forge's test harness, checking routing, validation and what is saved.
import { strict as assert } from "assert";
import { ForgeTestHarness } from "@ministryofjustice/hmpps-forge/core/testing";
import type {
  ForgeTestClient,
  TestResult,
} from "@ministryofjustice/hmpps-forge/core/testing";
import { govukComponents } from "@ministryofjustice/hmpps-forge/govuk-components";
import type { Answers } from "../domain/logic.js";
import { stepsFor, relevantAnswers } from "../domain/navigation.js";
import { buildEmploymentIncomeSections } from "../domain/cfe/employment-income.js";
import { buildIrregularIncomeSection } from "../domain/cfe/irregular-income.js";
import type {
  AnswerStore,
  EligibilityDeps,
  StateBenefitType,
} from "../ports/index.js";
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

const carers: StateBenefitType = {
  name: "Carer's Allowance",
  label: "carers_allowance",
  exclude_from_gross_income: false,
};
const childBenefit: StateBenefitType = {
  name: "Child Benefit",
  label: "child_benefit",
  exclude_from_gross_income: false,
};

interface RenderedField {
  code: string;
  value?: unknown;
  items?: { value: string; text: string }[];
  label?: { text?: string };
  fieldset?: { legend?: { text?: string } };
}

const OTHER_INCOME_TYPES = [
  "friends_or_family",
  "maintenance",
  "property_or_lodger",
  "pension",
  "student_finance",
  "other",
];
const NO_OTHER_INCOME = Object.fromEntries(
  OTHER_INCOME_TYPES.map((type) => [`${type}_relevant`, "false"]),
);

const incomeRow = (index: number, overrides: Record<string, string> = {}) => ({
  [`incomes_${index}_income_type`]: "employment",
  [`incomes_${index}_income_frequency`]: "monthly",
  [`incomes_${index}_gross_income`]: "2000",
  [`incomes_${index}_income_tax`]: "300",
  [`incomes_${index}_national_insurance`]: "100",
  ...overrides,
});

describe("eligibility journey: income section", () => {
  let client: ForgeTestClient;
  let answerStore: InMemoryAnswerStore;
  let benefitTypes: () => Promise<StateBenefitType[]>;
  let benefitTypeCalls: number;

  const params = { caseId: CASE_ID };

  async function post(step: string, body: Record<string, unknown>) {
    return client.post(`${BASE}/${step}`, { params, body });
  }

  async function submit(step: string, body: Record<string, unknown>) {
    const result = await post(step, body);
    assert.equal(
      result.type,
      "render" === result.type ? "redirect" : result.type,
      `POST ${step} did not redirect: ${result.type}`,
    );
    return result.type === "redirect" ? result.url : undefined;
  }

  async function get(step: string) {
    return client.get(`${BASE}/${step}`, { params });
  }

  function fieldsOf(result: TestResult, variant: string): RenderedField[] {
    assert.equal(result.type, "render", `expected a render: ${result.type}`);
    const found: RenderedField[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
      } else if (node !== null && typeof node === "object") {
        const block = node as { variant?: string; properties?: RenderedField };
        if (block.variant === variant && block.properties) {
          found.push(block.properties);
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

  beforeEach(() => {
    answerStore = new InMemoryAnswerStore();
    benefitTypeCalls = 0;
    benefitTypes = async () => [carers, childBenefit];
    const deps: EligibilityDeps = {
      answerStore,
      assessor: {
        assess: async () => ({ result: "eligible" }),
        stateBenefitTypes: async () => {
          benefitTypeCalls += 1;
          return benefitTypes();
        },
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
      child_dependants: false,
      adult_dependants: false,
      employment_status: "unemployed",
      receives_benefits: false,
    };
  });

  describe("employment status", () => {
    it("saves in_work and goes on to income", async () => {
      const next = await submit("employment-status", {
        employment_status: "in_work",
      });

      assert.equal(next, `${BASE}/income`);
      assert.equal(answerStore.answers.employment_status, "in_work");
      assert.equal(stepsFor(answerStore.answers).includes("income"), true);
    });

    it("saves unemployed and skips income", async () => {
      const next = await submit("employment-status", {
        employment_status: "unemployed",
      });

      assert.equal(next, `${BASE}/benefits`);
      assert.equal(stepsFor(answerStore.answers).includes("income"), false);
    });

    it("offers only CCQ's two options", async () => {
      const [field] = fieldsOf(
        await get("employment-status"),
        "govukRadioInput",
      );

      assert.deepEqual(
        field.items?.map((item) => item.value),
        ["in_work", "unemployed"],
      );
    });

    it("requires an answer", async () => {
      const result = await post("employment-status", {});

      assert.deepEqual(errorsFor(result, "employment_status"), [
        "Select an employment status",
      ]);
    });
  });

  describe("employment income", () => {
    beforeEach(() => {
      answerStore.answers.employment_status = "in_work";
    });

    it("saves each row as CCQ's incomes list, with amounts as numbers", async () => {
      const next = await submit("income", incomeRow(0));

      assert.equal(next, `${BASE}/benefits`);
      assert.deepEqual(answerStore.answers.incomes, [
        {
          income_type: "employment",
          income_frequency: "monthly",
          gross_income: 2000,
          income_tax: 300,
          national_insurance: 100,
        },
      ]);
    });

    it("builds the CFE employment sections from what was entered", async () => {
      await submit("income", { action: "add", ...incomeRow(0) });
      await submit("income", {
        ...incomeRow(0),
        ...incomeRow(1, {
          incomes_1_income_type: "self_employment",
          incomes_1_income_frequency: "every_week",
        }),
      });

      const sections = buildEmploymentIncomeSections(
        relevantAnswers(answerStore.answers),
        new Set(stepsFor(answerStore.answers)),
      );

      assert.equal(sections.employment_details?.length, 1);
      assert.equal(sections.employment_details?.[0].income.gross, 2000);
      assert.equal(sections.self_employment_details?.length, 1);
      assert.equal(
        sections.self_employment_details?.[0].income.frequency,
        "weekly",
      );
    });

    it("keeps the saved rows through relevantAnswers", async () => {
      await submit("income", incomeRow(0));

      assert.equal(
        Array.isArray(relevantAnswers(answerStore.answers).incomes),
        true,
      );
    });

    it("reports a missing field once, with CCQ's message", async () => {
      const result = await post(
        "income",
        incomeRow(0, { incomes_0_gross_income: "" }),
      );

      assert.deepEqual(errorsFor(result, "incomes_0_gross_income"), [
        "Enter the income before any deductions",
      ]);
      assert.deepEqual(answerStore.answers.incomes, undefined);
    });

    it("rejects an income that is not more than 0, or not a number", async () => {
      assert.deepEqual(
        errorsFor(
          await post("income", incomeRow(0, { incomes_0_gross_income: "0" })),
          "incomes_0_gross_income",
        ),
        ["Income before any deductions must be more than 0"],
      );
      assert.deepEqual(
        errorsFor(
          await post(
            "income",
            incomeRow(0, { incomes_0_gross_income: "lots" }),
          ),
          "incomes_0_gross_income",
        ),
        ["Income before any deductions must be a number"],
      );
    });

    it("rejects deductions that leave no net income", async () => {
      const result = await post(
        "income",
        incomeRow(0, {
          incomes_0_gross_income: "400",
          incomes_0_income_tax: "300",
          incomes_0_national_insurance: "100",
        }),
      );

      assert.deepEqual(errorsFor(result, "incomes_0_gross_income"), [
        "Income before any deductions must be more than income tax and National Insurance combined",
      ]);
    });

    it("accepts 0 tax and National Insurance, but not negative amounts", async () => {
      assert.equal(
        await submit(
          "income",
          incomeRow(0, {
            incomes_0_income_tax: "0",
            incomes_0_national_insurance: "0",
          }),
        ),
        `${BASE}/benefits`,
      );
      assert.deepEqual(
        errorsFor(
          await post("income", incomeRow(0, { incomes_0_income_tax: "-1" })),
          "incomes_0_income_tax",
        ),
        ["Income tax amount must be 0 or more"],
      );
    });

    it("names the row in its errors once there are several", async () => {
      await submit("income", { action: "add", ...incomeRow(0) });
      const result = await post("income", {
        ...incomeRow(0),
        ...incomeRow(1, { incomes_1_income_tax: "" }),
      });

      assert.deepEqual(errorsFor(result, "incomes_1_income_tax"), [
        "Enter the income tax amount for employment income 2",
      ]);
    });

    it("offers the year frequency only for certificated work", async () => {
      const incomePage = await get("income");
      const certificated = fieldsOf(incomePage, "govukRadioInput");
      const frequency = certificated.find(
        (field) => field.code === "incomes_0_income_frequency",
      );
      const grossIncome = fieldsOf(incomePage, "govukTextInput").find(
        (field) => field.code === "incomes_0_gross_income",
      );
      assert.equal(
        frequency?.fieldset?.legend?.text,
        "When does your client normally get this income?",
      );
      assert.equal(
        frequency?.items?.some((item) => item.value === "year"),
        true,
      );
      assert.equal(
        frequency?.items?.find((item) => item.value === "year")?.text,
        "Total in the last year",
      );
      assert.equal(grossIncome?.label?.text, "Income before any deductions");

      answerStore.answers.level_of_help = "controlled";
      const controlled = fieldsOf(await get("income"), "govukRadioInput");
      assert.equal(
        controlled
          .find((field) => field.code === "incomes_0_income_frequency")
          ?.items?.some((item) => item.value === "year"),
        false,
      );
    });

    it("adds a row without validating, keeping what was typed", async () => {
      const next = await submit("income", {
        action: "add",
        incomes_0_gross_income: "1500",
      });

      assert.equal(next, `${BASE}/income`);
      assert.equal(Array.isArray(answerStore.answers.incomes), true);
      assert.equal((answerStore.answers.incomes as unknown[]).length, 2);

      const codes = fieldsOf(await get("income"), "govukTextInput").map(
        (field) => field.code,
      );
      assert.equal(codes.includes("incomes_1_gross_income"), true);
      assert.equal(
        fieldsOf(await get("income"), "govukTextInput").find(
          (field) => field.code === "incomes_0_gross_income",
        )?.value,
        "1500",
      );
    });

    it("removes a row, but never the first", async () => {
      await submit("income", { action: "add", ...incomeRow(0) });
      await submit("income", { remove: "1", ...incomeRow(0) });
      assert.equal((answerStore.answers.incomes as unknown[]).length, 1);

      await submit("income", { remove: "0", ...incomeRow(0) });
      assert.equal((answerStore.answers.incomes as unknown[]).length, 1);
    });
  });

  describe("benefits", () => {
    it("saves receives_benefits as a boolean and routes to benefit details", async () => {
      const next = await submit("benefits", { receives_benefits: "true" });

      assert.equal(next, `${BASE}/benefit-details`);
      assert.equal(answerStore.answers.receives_benefits, true);
    });

    it("skips benefit details for no", async () => {
      const next = await submit("benefits", { receives_benefits: "false" });

      assert.equal(next, `${BASE}/other-income`);
    });

    it("requires an answer", async () => {
      assert.deepEqual(
        errorsFor(await post("benefits", {}), "receives_benefits"),
        ["Select yes if your client gets any benefits"],
      );
    });
  });

  describe("benefit details", () => {
    beforeEach(() => {
      answerStore.answers.receives_benefits = true;
    });

    const benefitRow = (index: number, overrides = {}) => ({
      [`benefits_${index}_benefit_type`]: "Carer's Allowance",
      [`benefits_${index}_benefit_amount`]: "81.90",
      [`benefits_${index}_benefit_frequency`]: "every_four_weeks",
      ...overrides,
    });

    it("offers CFE's benefit types", async () => {
      const [select] = fieldsOf(
        await get("benefit-details"),
        "govukSelectInput",
      );

      assert.deepEqual(
        select.items?.map((item) => item.value),
        ["", "Carer's Allowance", "Child Benefit"],
      );
    });

    it("saves each row as CCQ's benefits list", async () => {
      const next = await submit("benefit-details", benefitRow(0));

      assert.equal(next, `${BASE}/other-income`);
      assert.deepEqual(answerStore.answers.benefits, [
        {
          benefit_type: "Carer's Allowance",
          benefit_amount: 81.9,
          benefit_frequency: "every_four_weeks",
        },
      ]);
    });

    it("validates the row", async () => {
      const result = await post(
        "benefit-details",
        benefitRow(0, {
          benefits_0_benefit_type: "",
          benefits_0_benefit_amount: "0",
        }),
      );

      assert.deepEqual(errorsFor(result, "benefits_0_benefit_type"), [
        "Select the benefit name",
      ]);
      assert.deepEqual(errorsFor(result, "benefits_0_benefit_amount"), [
        "Benefit amount must be more than 0",
      ]);
    });

    it("sends the operator to an error page when CFE fails", async () => {
      benefitTypes = async () => {
        throw new Error("Failed to fetch benefit types: status code 502");
      };
      const errors: string[] = [];
      const original = console.error;
      console.error = (message: unknown) => errors.push(String(message));

      try {
        const result = await get("benefit-details");

        assert.equal(
          result.type === "redirect" && result.url,
          `${BASE}/benefit-types-unavailable?from=benefit_details`,
        );
        assert.match(errors.join("\n"), /case-1.*status code 502/u);
      } finally {
        console.error = original;
      }
    });

    it("explains the failure, with what is needed to report it", async () => {
      benefitTypes = async () => [];
      const original = console.error;
      console.error = () => undefined;

      try {
        const result = await get(
          "benefit-types-unavailable?from=benefit_details",
        );
        assert.equal(
          result.type,
          "render",
          result.type === "redirect" ? result.url : "",
        );
        const rows = JSON.stringify(fieldsOf(result, "govukSummaryList"));

        assert.match(rows, /Benefit details/u);
        assert.match(rows, /case-1/u);
        assert.match(rows, /no state benefit types/u);
      } finally {
        console.error = original;
      }
    });

    it("returns to the benefit step once CFE answers again", async () => {
      const result = await get(
        "benefit-types-unavailable?from=benefit_details",
      );

      assert.equal(
        result.type === "redirect" && result.url,
        `${BASE}/benefit-details`,
      );
    });

    it("does not follow an unknown step name from the query string", async () => {
      const result = await get("benefit-types-unavailable?from=//evil.example");

      assert.equal(
        result.type === "redirect" && result.url,
        `${BASE}/benefit-details`,
      );
    });

    it("fetches benefit types once for repeated visits", async () => {
      await get("benefit-details");
      await get("benefit-details");

      assert.equal(benefitTypeCalls, 1);
    });
  });

  describe("other income", () => {
    it("saves answers under CCQ's keys, with amounts as numbers", async () => {
      const next = await submit("other-income", {
        ...NO_OTHER_INCOME,
        friends_or_family_relevant: "true",
        friends_or_family_conditional_value: "50.5",
        friends_or_family_frequency: "monthly",
        other_relevant: "true",
        other_conditional_value: "120",
      });

      assert.equal(next, `${BASE}/outgoings`);
      assert.equal(answerStore.answers.friends_or_family_relevant, true);
      assert.equal(
        answerStore.answers.friends_or_family_conditional_value,
        50.5,
      );
      assert.equal(answerStore.answers.friends_or_family_frequency, "monthly");
      assert.equal(answerStore.answers.other_relevant, true);
      assert.equal(answerStore.answers.other_conditional_value, 120);
    });

    it("builds the CFE irregular income payments from what was entered", async () => {
      await submit("other-income", {
        ...NO_OTHER_INCOME,
        student_finance_relevant: "true",
        student_finance_conditional_value: "3000",
      });

      const section = buildIrregularIncomeSection(
        relevantAnswers(answerStore.answers),
        new Set(stepsFor(answerStore.answers)),
      );

      assert.deepEqual(section?.payments, [
        { income_type: "student_loan", frequency: "annual", amount: 3000 },
      ]);
    });

    it("requires every yes/no question", async () => {
      const result = await post("other-income", {});

      assert.deepEqual(errorsFor(result, "pension_relevant"), [
        "Select yes if your client gets income from pensions",
      ]);
    });

    it("requires an amount and frequency when the answer is yes", async () => {
      const result = await post("other-income", {
        ...NO_OTHER_INCOME,
        pension_relevant: "true",
      });

      assert.deepEqual(errorsFor(result, "pension_conditional_value"), [
        "Enter amount of income your client gets from pensions",
      ]);
      assert.deepEqual(errorsFor(result, "pension_frequency"), [
        "Select frequency of income your client gets from pensions",
      ]);
    });

    it("does not validate, or keep, an amount when the answer is no", async () => {
      const next = await submit("other-income", {
        ...NO_OTHER_INCOME,
        pension_conditional_value: "not a number",
        pension_frequency: "monthly",
      });

      assert.equal(next, `${BASE}/outgoings`);
      assert.equal(answerStore.answers.pension_conditional_value, undefined);
      assert.equal(answerStore.answers.pension_frequency, undefined);
    });

    it("clears an amount saved earlier when the answer changes to no", async () => {
      await submit("other-income", {
        ...NO_OTHER_INCOME,
        pension_relevant: "true",
        pension_conditional_value: "75",
        pension_frequency: "monthly",
      });
      assert.equal(answerStore.answers.pension_conditional_value, 75);

      await submit("other-income", { ...NO_OTHER_INCOME });

      assert.equal(answerStore.answers.pension_relevant, false);
      assert.equal(answerStore.answers.pension_conditional_value, undefined);
      assert.equal(answerStore.answers.pension_frequency, undefined);
    });

    it("words the other income amount error by level of help", async () => {
      const body = { ...NO_OTHER_INCOME, other_relevant: "true" };

      assert.deepEqual(
        errorsFor(await post("other-income", body), "other_conditional_value"),
        [
          "Enter amount of income from other sources received in the last 3 months",
        ],
      );

      answerStore.answers.level_of_help = "controlled";
      assert.deepEqual(
        errorsFor(await post("other-income", body), "other_conditional_value"),
        [
          "Enter amount of income from other sources received in the last month",
        ],
      );
    });

    it("offers the 3-month total only for certificated work", async () => {
      const frequencyValues = async () =>
        fieldsOf(await get("other-income"), "govukRadioInput")
          .find((field) => field.code === "pension_frequency")
          ?.items?.map((item) => item.value);

      assert.equal((await frequencyValues())?.includes("total"), true);
      answerStore.answers.level_of_help = "controlled";
      assert.equal((await frequencyValues())?.includes("total"), false);
    });
  });

  describe("partner", () => {
    beforeEach(() => {
      answerStore.answers = {
        ...answerStore.answers,
        partner: true,
        partner_date_of_birth: "1980-01-01",
        partner_employment_status: "unemployed",
        ...Object.fromEntries(
          Object.keys(NO_OTHER_INCOME).map((key) => [key, false]),
        ),
      };
    });

    it("routes partner employment, benefits and other income as the client's", async () => {
      assert.equal(
        await submit("partner-employment-status", {
          partner_employment_status: "in_work",
        }),
        `${BASE}/partner-income`,
      );
      assert.equal(
        await submit("partner-income", {
          partner_incomes_0_income_type: "statutory_pay",
          partner_incomes_0_income_frequency: "every_week",
          partner_incomes_0_gross_income: "200",
          partner_incomes_0_income_tax: "0",
          partner_incomes_0_national_insurance: "0",
        }),
        `${BASE}/partner-benefits`,
      );
      assert.equal(
        await submit("partner-benefits", { partner_receives_benefits: "true" }),
        `${BASE}/partner-benefit-details`,
      );
      assert.equal(
        await submit("partner-benefit-details", {
          partner_benefits_0_benefit_type: "Child Benefit",
          partner_benefits_0_benefit_amount: "25",
          partner_benefits_0_benefit_frequency: "every_week",
        }),
        `${BASE}/partner-other-income`,
      );
      assert.equal(
        await submit("partner-other-income", {
          ...Object.fromEntries(
            Object.keys(NO_OTHER_INCOME).map((key) => [
              `partner_${key}`,
              "false",
            ]),
          ),
        }),
        `${BASE}/outgoings`,
      );

      assert.equal(answerStore.answers.partner_receives_benefits, true);
      assert.equal(
        (answerStore.answers.partner_incomes as unknown[]).length,
        1,
      );
      assert.equal(
        (answerStore.answers.partner_benefits as unknown[]).length,
        1,
      );
    });

    it("skips partner income for an unemployed partner", async () => {
      assert.equal(
        await submit("partner-employment-status", {
          partner_employment_status: "unemployed",
        }),
        `${BASE}/partner-benefits`,
      );
    });

    it("words partner errors about the partner", async () => {
      assert.deepEqual(
        errorsFor(
          await post("partner-benefits", {}),
          "partner_receives_benefits",
        ),
        ["Select yes if the partner gets any benefits"],
      );
    });
  });

  describe("skipped section", () => {
    it("skips the whole section for a passported client", () => {
      const steps = stepsFor({
        ...answerStore.answers,
        passporting: true,
        employment_status: "in_work",
        receives_benefits: true,
      });

      for (const step of [
        "employment_status",
        "income",
        "benefits",
        "benefit_details",
        "other_income",
      ]) {
        assert.equal(steps.includes(step), false, step);
      }
    });
  });
});
