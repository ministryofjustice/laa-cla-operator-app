// Drives the outgoings section (outgoings, partner outgoings and the three
// housing-cost steps) through Forge's test harness, checking routing,
// validation and that amounts are saved as numbers.
import { strict as assert } from "assert";
import { ForgeTestHarness } from "@ministryofjustice/hmpps-forge/core/testing";
import type {
  ForgeTestClient,
  TestResult,
} from "@ministryofjustice/hmpps-forge/core/testing";
import { govukComponents } from "@ministryofjustice/hmpps-forge/govuk-components";
import type { Answers } from "../domain/logic.js";
import { stepsFor, relevantAnswers } from "../domain/navigation.js";
import { buildRegularTransactionsSection } from "../domain/cfe/regular-transactions.js";
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

interface RenderedField {
  code: string;
  value?: unknown;
  items?: { value: string; text: string }[];
}

const NO_OUTGOINGS = {
  childcare_payments_relevant: "false",
  maintenance_payments_relevant: "false",
  legal_aid_payments_relevant: "false",
};

const PARTNER_WITH_NO_INCOME = {
  partner: true,
  partner_date_of_birth: "1980-01-01",
  partner_employment_status: "unemployed",
  partner_receives_benefits: false,
  partner_friends_or_family_relevant: false,
  partner_maintenance_relevant: false,
  partner_property_or_lodger_relevant: false,
  partner_pension_relevant: false,
  partner_student_finance_relevant: false,
  partner_other_relevant: false,
  partner_maintenance_payments_relevant: false,
  partner_legal_aid_payments_relevant: false,
};

const EMPLOYMENT_ROW = {
  income_type: "employment",
  income_frequency: "monthly",
  gross_income: 2000,
  income_tax: 300,
  national_insurance: 100,
};

describe("eligibility journey: outgoings section", () => {
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
      `POST ${step} did not redirect: ${JSON.stringify(
        result.type === "render"
          ? (result.context as { fieldValidationErrors?: unknown })
              .fieldValidationErrors
          : result.type,
      )}`,
    );
    return result.type === "redirect" ? result.url : undefined;
  }

  async function get(step: string) {
    return client.get(`${BASE}/${step}`, { params });
  }

  async function saveChildDependantForm(): Promise<void> {
    await submit("dependant-details", {
      child_dependants: "true",
      child_dependants_count: "1",
      adult_dependants: "false",
    });
    await submit("dependant-income", { dependants_get_income: "false" });
    assert.equal(answerStore.answers.child_dependants, true);
    assert.equal(answerStore.answers.child_dependants_count, 1);
  }

  async function assertRenders(path: string) {
    const result = await client.get(path, { params });
    assert.equal(
      result.type,
      "render",
      `GET ${path} did not render: ${result.type === "redirect" ? result.url : result.type}`,
    );
    return result;
  }

  function fieldsOf(result: TestResult): RenderedField[] {
    assert.equal(
      result.type,
      "render",
      `expected a render: ${result.type === "redirect" ? result.url : result.type}`,
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
        if (block.properties?.visibleWhen === false) return;
        if (
          block.variant !== undefined &&
          block.properties &&
          typeof block.properties.code === "string"
        ) {
          found.push(block.properties);
        }
        Object.values(node).forEach(walk);
      }
    };
    walk(result.type === "render" ? result.context.blocks : []);
    return found;
  }

  function fieldCodesOf(result: TestResult): string[] {
    return [...new Set(fieldsOf(result).map((field) => field.code))];
  }

  function itemValues(result: TestResult, code: string): string[] {
    const field = fieldsOf(result).find((candidate) => candidate.code === code);
    assert.ok(field, `no ${code} field`);
    return (field.items ?? []).map((item) => item.value);
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
      child_dependants: false,
      adult_dependants: false,
      employment_status: "unemployed",
      receives_benefits: false,
      friends_or_family_relevant: false,
      maintenance_relevant: false,
      property_or_lodger_relevant: false,
      pension_relevant: false,
      student_finance_relevant: false,
      other_relevant: false,
    };
  });

  describe("outgoings", () => {
    it("saves no outgoings and goes on to property", async () => {
      const next = await submit("outgoings", NO_OUTGOINGS);

      assert.equal(next, `${BASE}/property`);
      await assertRenders(next ?? "");
      assert.equal(answerStore.answers.maintenance_payments_relevant, false);
    });

    it("saves amounts as numbers with CCQ's frequency values", async () => {
      await submit("outgoings", {
        ...NO_OUTGOINGS,
        maintenance_payments_relevant: "true",
        maintenance_payments_conditional_value: "1250.50",
        maintenance_payments_frequency: "every_four_weeks",
      });

      assert.equal(
        answerStore.answers.maintenance_payments_conditional_value,
        1250.5,
      );
      assert.equal(
        answerStore.answers.maintenance_payments_frequency,
        "every_four_weeks",
      );
    });

    it("feeds the amount it saves to the CFE payload", async () => {
      await submit("outgoings", {
        ...NO_OUTGOINGS,
        legal_aid_payments_relevant: "true",
        legal_aid_payments_conditional_value: "75",
        legal_aid_payments_frequency: "monthly",
      });

      const transactions = buildRegularTransactionsSection(
        relevantAnswers(answerStore.answers),
        new Set(stepsFor(answerStore.answers)),
      );
      assert.deepEqual(transactions, [
        {
          operation: "debit",
          category: "legal_aid",
          frequency: "monthly",
          amount: 75,
        },
      ]);
    });

    it("offers total only for certificated work", async () => {
      assert.deepEqual(
        itemValues(await get("outgoings"), "maintenance_payments_frequency"),
        ["every_week", "every_two_weeks", "every_four_weeks", "monthly", "total"],
      );

      answerStore.answers.level_of_help = "controlled";
      assert.deepEqual(
        itemValues(await get("outgoings"), "maintenance_payments_frequency"),
        ["every_week", "every_two_weeks", "every_four_weeks", "monthly"],
      );
    });

    it("requires each question, with CCQ's messages", async () => {
      const result = await post("outgoings", {});

      assert.deepEqual(errorsFor(result, "maintenance_payments_relevant"), [
        "Select yes if your client pays maintenance to a former partner",
      ]);
      assert.deepEqual(errorsFor(result, "legal_aid_payments_relevant"), [
        "Select yes if your client makes payments toward legal aid for a criminal case",
      ]);
    });

    it("requires an amount over 0 and a frequency when yes", async () => {
      const result = await post("outgoings", {
        ...NO_OUTGOINGS,
        maintenance_payments_relevant: "true",
        maintenance_payments_conditional_value: "0",
      });

      assert.deepEqual(
        errorsFor(result, "maintenance_payments_conditional_value"),
        ["Amount of maintenance paid to a former partner must be more than 0"],
      );
      assert.deepEqual(errorsFor(result, "maintenance_payments_frequency"), [
        "Select frequency of maintenance payments to a former partner",
      ]);
    });

    it("hides childcare when there are no child dependants", async () => {
      const result = await get("outgoings");

      assert.equal(
        fieldCodesOf(result).includes("childcare_payments_relevant"),
        false,
      );
      assert.deepEqual(errorsFor(await post("outgoings", {}), "childcare_payments_relevant"), []);
    });

    describe("with child dependants and a client in work", () => {
      beforeEach(async () => {
        Object.assign(answerStore.answers, {
          employment_status: "in_work",
          incomes: [EMPLOYMENT_ROW],
        });
        await saveChildDependantForm();
      });

      it("asks about childcare", async () => {
        assert.equal(
          fieldCodesOf(await get("outgoings")).includes(
            "childcare_payments_relevant",
          ),
          true,
        );
      });

      it("requires the childcare answer, and an amount over 0", async () => {
        const missing = await post("outgoings", {
          maintenance_payments_relevant: "false",
          legal_aid_payments_relevant: "false",
        });
        assert.deepEqual(errorsFor(missing, "childcare_payments_relevant"), [
          "Select yes if your client pays for childcare",
        ]);

        const zero = await post("outgoings", {
          ...NO_OUTGOINGS,
          childcare_payments_relevant: "true",
          childcare_payments_conditional_value: "0",
          childcare_payments_frequency: "monthly",
        });
        assert.deepEqual(
          errorsFor(zero, "childcare_payments_conditional_value"),
          ["Amount paid for childcare must be more than 0"],
        );
      });

      it("saves childcare as a number", async () => {
        await submit("outgoings", {
          ...NO_OUTGOINGS,
          childcare_payments_relevant: "true",
          childcare_payments_conditional_value: "50",
          childcare_payments_frequency: "every_week",
        });

        assert.equal(answerStore.answers.childcare_payments_conditional_value, 50);
      });

      it("hides childcare when the only income is statutory pay", async () => {
        answerStore.answers.incomes = [
          { ...EMPLOYMENT_ROW, income_type: "statutory_pay" },
        ];

        assert.equal(
          fieldCodesOf(await get("outgoings")).includes(
            "childcare_payments_relevant",
          ),
          false,
        );
      });
    });
  });

  describe("partner outgoings", () => {
    beforeEach(() => {
      Object.assign(answerStore.answers, {
        ...PARTNER_WITH_NO_INCOME,
        partner_maintenance_payments_relevant: undefined,
        partner_legal_aid_payments_relevant: undefined,
        maintenance_payments_relevant: false,
        legal_aid_payments_relevant: false,
      });
    });

    it("follows outgoings and goes on to property", async () => {
      assert.equal(
        await submit("outgoings", NO_OUTGOINGS),
        `${BASE}/partner-outgoings`,
      );
      await assertRenders(`${BASE}/partner-outgoings`);

      const next = await submit("partner-outgoings", {
        partner_maintenance_payments_relevant: "true",
        partner_maintenance_payments_conditional_value: "20",
        partner_maintenance_payments_frequency: "every_two_weeks",
        partner_legal_aid_payments_relevant: "false",
      });

      assert.equal(next, `${BASE}/property`);
      await assertRenders(next ?? "");
      assert.equal(
        answerStore.answers.partner_maintenance_payments_conditional_value,
        20,
      );
    });

    it("uses the partner_ codes and wording", async () => {
      const result = await post("partner-outgoings", {});

      assert.deepEqual(
        errorsFor(result, "partner_maintenance_payments_relevant"),
        ["Select yes if the partner pays maintenance to a former partner"],
      );
      assert.equal(
        fieldCodesOf(result).includes("partner_childcare_payments_relevant"),
        false,
      );
    });

    it("asks about childcare only when both are in work", async () => {
      Object.assign(answerStore.answers, {
        childcare_payments_relevant: false,
        employment_status: "in_work",
        incomes: [EMPLOYMENT_ROW],
      });
      await saveChildDependantForm();
      assert.equal(
        fieldCodesOf(await get("partner-outgoings")).includes(
          "partner_childcare_payments_relevant",
        ),
        false,
      );

      Object.assign(answerStore.answers, {
        partner_employment_status: "in_work",
        partner_incomes: [EMPLOYMENT_ROW],
      });
      assert.equal(
        fieldCodesOf(await get("partner-outgoings")).includes(
          "partner_childcare_payments_relevant",
        ),
        true,
      );
    });
  });

  describe("housing costs", () => {
    beforeEach(() => {
      Object.assign(answerStore.answers, {
        maintenance_payments_relevant: false,
        legal_aid_payments_relevant: false,
      });
    });

    it("follows property when the client does not own their home", async () => {
      const next = await submit("property", { property_owned: "none" });

      assert.equal(next, `${BASE}/housing-costs`);
      await assertRenders(next ?? "");
    });

    it("saves a 0 payment as a number and needs no frequency", async () => {
      answerStore.answers.property_owned = "none";

      const next = await submit("housing-costs", {
        housing_payments: "0",
        housing_benefit_relevant: "false",
      });

      assert.equal(next, `${BASE}/additional-property`);
      await assertRenders(next ?? "");
      assert.equal(answerStore.answers.housing_payments, 0);
    });

    it("requires a frequency when the payment is over 0", async () => {
      answerStore.answers.property_owned = "none";

      const result = await post("housing-costs", {
        housing_payments: "500",
        housing_benefit_relevant: "false",
      });

      assert.deepEqual(errorsFor(result, "housing_payments_frequency"), [
        "Select frequency of housing payments.",
      ]);
    });

    it("validates the payment and the Housing Benefit question", async () => {
      answerStore.answers.property_owned = "none";

      const result = await post("housing-costs", { housing_payments: "-1" });

      assert.deepEqual(errorsFor(result, "housing_payments"), [
        "Housing payments must be 0 or more",
      ]);
      assert.deepEqual(errorsFor(result, "housing_benefit_relevant"), [
        "Select yes if housing benefit is claimed at the home your client lives in",
      ]);
    });

    it("does not allow more Housing Benefit than the housing costs", async () => {
      answerStore.answers.property_owned = "none";

      const result = await post("housing-costs", {
        housing_payments: "500",
        housing_payments_frequency: "monthly",
        housing_benefit_relevant: "true",
        housing_benefit_value: "130",
        housing_benefit_frequency: "every_week",
      });

      assert.deepEqual(errorsFor(result, "housing_benefit_value"), [
        "Housing Benefit cannot be higher than housing costs",
      ]);
    });

    it("saves the housing costs and Housing Benefit for CFE", async () => {
      answerStore.answers.property_owned = "none";

      await submit("housing-costs", {
        housing_payments: "1500",
        housing_payments_frequency: "total",
        housing_benefit_relevant: "true",
        housing_benefit_value: "100",
        housing_benefit_frequency: "every_two_weeks",
      });

      assert.equal(answerStore.answers.housing_payments, 1500);
      assert.equal(answerStore.answers.housing_benefit_value, 100);
      const transactions = buildRegularTransactionsSection(
        relevantAnswers(answerStore.answers),
        new Set(stepsFor(answerStore.answers)),
      );
      assert.deepEqual(transactions, [
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "three_monthly",
          amount: 1500,
        },
        {
          operation: "credit",
          category: "housing_benefit",
          frequency: "two_weekly",
          amount: 100,
        },
      ]);
    });

    it("says so when the client has a partner", async () => {
      Object.assign(answerStore.answers, {
        ...PARTNER_WITH_NO_INCOME,
        property_owned: "none",
      });

      const result = await assertRenders(`${BASE}/housing-costs`);

      assert.match(
        JSON.stringify(result.type === "render" ? result.context.blocks : []),
        /If your client and their partner live separately/u,
      );
    });
  });

  describe("mortgage or loan payment", () => {
    beforeEach(() => {
      Object.assign(answerStore.answers, {
        maintenance_payments_relevant: false,
        legal_aid_payments_relevant: false,
      });
    });

    it("follows property for a mortgage, then goes to property entry", async () => {
      assert.equal(
        await submit("property", { property_owned: "with_mortgage" }),
        `${BASE}/mortgage-or-loan-payment`,
      );
      await assertRenders(`${BASE}/mortgage-or-loan-payment`);

      const next = await submit("mortgage-or-loan-payment", {
        housing_loan_payments: "650",
        housing_payments_loan_frequency: "monthly",
      });

      assert.equal(next, `${BASE}/property-entry`);
      await assertRenders(next ?? "");
      assert.equal(answerStore.answers.housing_loan_payments, 650);
      assert.equal(answerStore.answers.housing_payments_loan_frequency, "monthly");
    });

    it("requires a payment of 0 or more, and a frequency when over 0", async () => {
      answerStore.answers.property_owned = "with_mortgage";

      assert.deepEqual(
        errorsFor(
          await post("mortgage-or-loan-payment", { housing_loan_payments: "" }),
          "housing_loan_payments",
        ),
        ["Enter the mortgage or loan payments amount."],
      );
      assert.deepEqual(
        errorsFor(
          await post("mortgage-or-loan-payment", { housing_loan_payments: "-5" }),
          "housing_loan_payments",
        ),
        ["Mortgage or loan payments must be 0 or more."],
      );
      assert.deepEqual(
        errorsFor(
          await post("mortgage-or-loan-payment", { housing_loan_payments: "5" }),
          "housing_payments_loan_frequency",
        ),
        ["Select frequency of mortgage payments."],
      );
      assert.equal(
        await submit("mortgage-or-loan-payment", { housing_loan_payments: "0" }),
        `${BASE}/property-entry`,
      );
    });
  });

  describe("shared ownership housing costs", () => {
    beforeEach(() => {
      Object.assign(answerStore.answers, {
        maintenance_payments_relevant: false,
        legal_aid_payments_relevant: false,
        property_owned: "shared_ownership",
        property_landlord: true,
      });
    });

    it("follows property landlord, then goes to property entry", async () => {
      assert.equal(
        await submit("property-landlord", { property_landlord: "true" }),
        `${BASE}/shared-ownership-housing-costs`,
      );
      await assertRenders(`${BASE}/shared-ownership-housing-costs`);

      const next = await submit("shared-ownership-housing-costs", {
        combined_frequency: "monthly",
        rent: "400",
        shared_ownership_mortgage: "350.50",
        shared_ownership_housing_benefit_relevant: "false",
      });

      assert.equal(next, `${BASE}/property-entry`);
      await assertRenders(next ?? "");
      assert.equal(answerStore.answers.rent, 400);
      assert.equal(answerStore.answers.shared_ownership_mortgage, 350.5);
      const transactions = buildRegularTransactionsSection(
        relevantAnswers(answerStore.answers),
        new Set(stepsFor(answerStore.answers)),
      );
      assert.deepEqual(transactions, [
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "monthly",
          amount: 750.5,
        },
      ]);
    });

    it("needs a frequency only when rent plus mortgage is over 0", async () => {
      const result = await post("shared-ownership-housing-costs", {
        rent: "0",
        shared_ownership_mortgage: "0.5",
        shared_ownership_housing_benefit_relevant: "false",
      });
      assert.deepEqual(errorsFor(result, "combined_frequency"), [
        "Select frequency of rent payments.",
      ]);

      assert.equal(
        await submit("shared-ownership-housing-costs", {
          rent: "0",
          shared_ownership_mortgage: "0",
          shared_ownership_housing_benefit_relevant: "false",
        }),
        `${BASE}/property-entry`,
      );
    });

    it("validates rent and mortgage", async () => {
      const result = await post("shared-ownership-housing-costs", {
        rent: "-1",
        shared_ownership_mortgage: "abc",
      });

      assert.deepEqual(errorsFor(result, "rent"), ["Rent must be 0 or more."]);
      assert.deepEqual(errorsFor(result, "shared_ownership_mortgage").length, 1);
      assert.deepEqual(errorsFor(result, "shared_ownership_housing_benefit_relevant"), [
        "Select yes if your client gets Housing Benefit for this home.",
      ]);
    });

    it("caps Housing Benefit at the combined rent and mortgage", async () => {
      const over = await post("shared-ownership-housing-costs", {
        combined_frequency: "monthly",
        rent: "400",
        shared_ownership_mortgage: "100",
        shared_ownership_housing_benefit_relevant: "true",
        shared_ownership_housing_benefit_value: "501",
        shared_ownership_housing_benefit_frequency: "monthly",
      });
      assert.deepEqual(errorsFor(over, "shared_ownership_housing_benefit_value"), [
        "Housing Benefit cannot be higher than housing costs.",
      ]);

      assert.equal(
        await submit("shared-ownership-housing-costs", {
          combined_frequency: "monthly",
          rent: "400",
          shared_ownership_mortgage: "100",
          shared_ownership_housing_benefit_relevant: "true",
          shared_ownership_housing_benefit_value: "500",
          shared_ownership_housing_benefit_frequency: "monthly",
        }),
        `${BASE}/property-entry`,
      );
      assert.equal(answerStore.answers.housing_benefit_relevant, true);
      assert.equal(answerStore.answers.housing_benefit_value, 500);
      assert.equal(answerStore.answers.housing_benefit_frequency, "monthly");
      assert.equal(
        Object.keys(answerStore.answers).some((key) =>
          key.startsWith("shared_ownership_housing_benefit"),
        ),
        false,
      );
    });

    it("goes back through property entry when changed from check your answers", async () => {
      Object.assign(answerStore.answers, {
        combined_frequency: "monthly",
        rent: 400,
        shared_ownership_mortgage: 100,
        housing_benefit_relevant: false,
        house_value: 200000,
        mortgage: 50000,
        percentage_owned: 50,
        house_in_dispute: false,
        additional_property_owned: "none",
        bank_accounts: [{ amount: 0 }],
        investments_relevant: false,
        valuables_relevant: false,
        vehicle_owned: false,
      });
      await assertRenders(`${BASE}/check-your-answers`);

      const next = await submit("shared-ownership-housing-costs", {
        combined_frequency: "monthly",
        rent: "450",
        shared_ownership_mortgage: "100",
        shared_ownership_housing_benefit_relevant: "false",
      });

      assert.equal(next, `${BASE}/property-entry`);
      await assertRenders(next ?? "");
    });
  });
});
