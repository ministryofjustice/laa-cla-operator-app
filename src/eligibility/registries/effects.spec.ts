import { strict as assert } from "assert";
import axios from "axios";
import {
  createTestEffectContext,
  FunctionRegistryTestHarness,
} from "@ministryofjustice/hmpps-forge/core/testing";
import type { EligibilityDeps } from "../ports/index.js";
import type { Answers } from "../domain/logic.js";
import { buildProperties } from "../domain/cfe/assets.js";
import { buildRegularTransactionsSection } from "../domain/cfe/regular-transactions.js";
import { buildPartnerSection } from "../domain/cfe/partner.js";
import { buildDependantsSection } from "../domain/cfe/dependants.js";
import { relevantAnswers, stepsFor } from "../domain/navigation.js";
import { ADD_ANOTHER_LISTS } from "../lists/index.js";
import { collapseLists } from "../lists/add-another.js";
import {
  EligibilityEffects,
  EligibilityEffectsRegistry,
  toDomainAnswers,
} from "./effects.js";

describe("eligibility effects", () => {
  describe("loading the case date of birth", () => {
    let answers: Answers;
    let deps: EligibilityDeps;
    let loadedCaseIds: string[];
    const api = axios.create();
    const authenticatedAxios = { axiosInstance: api, get: api.get };

    beforeEach(() => {
      answers = {};
      loadedCaseIds = [];
      deps = {
        answerStore: {
          load: async () => ({ ...answers }),
          save: async (_id, partial) => {
            answers = { ...answers, ...partial };
          },
          clear: async () => {
            answers = {};
          },
        },
        assessor: {
          assess: async () => ({ result: "eligible" }),
          stateBenefitTypes: async () => [],
        },
        resultHandler: { handle: async () => undefined },
        caseApi: {
          loadCase: async (client, id) => {
            assert.equal(client, authenticatedAxios);
            loadedCaseIds.push(id);
            return { date_of_birth: "1990-01-01" };
          },
        },
      };
    });

    async function loadAnswers(
      state: Record<string, unknown> = { authenticatedAxios },
    ) {
      const context = createTestEffectContext({
        params: { caseId: "case-1" },
        state,
      });
      const harness = new FunctionRegistryTestHarness(
        EligibilityEffectsRegistry,
        deps,
      );
      await harness
        .evaluate(EligibilityEffects.LoadAnswers())
        .withContext(context);
      return context;
    }

    it("loads and persists DOB using the authenticated client in request state", async () => {
      const context = await loadAnswers();

      assert.deepEqual(loadedCaseIds, ["case-1"]);
      assert.equal(answers.date_of_birth, "1990-01-01");
      assert.equal(context.getAnswer("date_of_birth"), "1990-01-01");
    });

    it("only preloads DOB when starting a new check", async () => {
      answers = { level_of_help: "controlled", partner: false };
      await loadAnswers();

      assert.deepEqual(loadedCaseIds, []);
      assert.deepEqual(answers, {
        level_of_help: "controlled",
        partner: false,
      });
    });

    it("does not reload a date of birth already saved in the check", async () => {
      answers = { date_of_birth: "1980-01-01" };
      await loadAnswers();

      assert.deepEqual(loadedCaseIds, []);
      assert.equal(answers.date_of_birth, "1980-01-01");
    });

    it("surfaces missing authentication rather than continuing without DOB", async () => {
      await assert.rejects(
        loadAnswers({ authenticatedAxios: undefined }),
        /Axios middleware/u,
      );
      assert.equal(answers.date_of_birth, undefined);
    });

    it("surfaces a failed case lookup without saving incomplete answers", async () => {
      deps.caseApi = {
        loadCase: async () => {
          throw new Error("Case lookup failed");
        },
      };

      await assert.rejects(loadAnswers(), /Case lookup failed/u);
      assert.deepEqual(answers, {});
    });

    it("surfaces a case without a date of birth", async () => {
      deps.caseApi = { loadCase: async () => ({}) };

      await assert.rejects(loadAnswers(), /Case date of birth is required/u);
      assert.deepEqual(answers, {});
    });

    it("includes the preloaded DOB in the assessment submitted from review", async () => {
      await loadAnswers();
      answers = {
        ...answers,
        level_of_help: "controlled",
        immigration_or_asylum: false,
        partner: false,
        passporting: true,
        property_owned: "none",
        additional_property_owned: "none",
        bank_accounts: [{ amount: 0 }],
        vehicle_owned: false,
      };
      let assessmentCalled = false;
      deps.assessor.assess = async (payload) => {
        assert.ok(payload !== null && typeof payload === "object");
        assert.ok("applicant" in payload);
        assert.deepEqual(payload.applicant, {
          date_of_birth: "1990-01-01",
          receives_qualifying_benefit: true,
        });
        assessmentCalled = true;
        return { result: "eligible" };
      };
      const harness = new FunctionRegistryTestHarness(
        EligibilityEffectsRegistry,
        deps,
      );
      await harness
        .evaluate(EligibilityEffects.RunAssessment())
        .withContext(createTestEffectContext({ params: { caseId: "case-1" } }));

      assert.equal(assessmentCalled, true);
      assert.deepEqual(answers, {});
    });
  });

  it("converts dependant counts and list amounts from the saved UI shape", () => {
    const answers = toDomainAnswers(
      collapseLists(ADD_ANOTHER_LISTS, {
        level_of_help: "certificated",
        partner: "false",
        passporting: "false",
        child_dependants: "true",
        child_dependants_count: "2",
        adult_dependants: "true",
        adult_dependants_count: "1",
        dependants_get_income: "true",
        dependant_incomes_0_amount: "10.50",
        dependant_incomes_0_frequency: "monthly",
        dependant_incomes_1_amount: "20",
        dependant_incomes_1_frequency: "every_week",
      }),
    );

    assert.equal(answers.child_dependants_count, 2);
    assert.equal(answers.adult_dependants_count, 1);
    assert.equal(answers.child_dependants, true);
    assert.deepEqual(answers.dependant_incomes, [
      { amount: 10.5, frequency: "monthly" },
      { amount: 20, frequency: "every_week" },
    ]);

    const steps = new Set(stepsFor(answers));
    const dependants = buildDependantsSection(
      relevantAnswers(answers),
      steps,
      new Date(Date.UTC(2024, 5, 1)),
    );
    assert.equal(dependants?.length, 3);
    assert.deepEqual(
      dependants?.map((dependant) => [
        dependant.relationship,
        dependant.income?.amount,
      ]),
      [
        ["adult_relative", 10.5],
        ["child_relative", 20],
        ["child_relative", undefined],
      ],
    );
    assert.equal(dependants?.[0]?.date_of_birth, "2003-06-01");
    assert.equal(dependants?.[1]?.date_of_birth, "2007-06-01");
    assert.equal(dependants?.[2]?.date_of_birth, "2013-06-01");
  });

  it("keeps invalid numeric input typed so the form can report it", () => {
    assert.equal(
      toDomainAnswers({ child_dependants_count: "not a number" })
        .child_dependants_count,
      "not a number",
    );
  });

  it("converts UI-entered property values to numbers for the CFE payload", () => {
    const answers = toDomainAnswers(
      collapseLists(ADD_ANOTHER_LISTS, {
        property_owned: "with_mortgage",
        house_value: "250000",
        mortgage: "50000",
        percentage_owned: "100",
        additional_property_owned: "outright",
        additional_properties_0_house_value: "80000",
        additional_properties_0_percentage_owned: "50",
      }),
    );

    assert.deepEqual(
      buildProperties(
        answers,
        new Set(["property_entry", "additional_property_details"]),
        true,
      ),
      {
        main_home: {
          value: 250000,
          outstanding_mortgage: 50000,
          percentage_owned: 100,
          subject_matter_of_dispute: false,
          shared_with_housing_assoc: false,
        },
        additional_properties: [
          {
            value: 80000,
            outstanding_mortgage: 0,
            percentage_owned: 50,
            subject_matter_of_dispute: false,
            shared_with_housing_assoc: false,
          },
        ],
      },
    );
  });

  describe("outgoings and housing costs, as the forms save them", () => {
    // Answers as Forge holds them: every value a string, as posted.
    const formAnswers = (answers: Answers): Answers =>
      toDomainAnswers(collapseLists(ADD_ANOTHER_LISTS, answers));
    const NOT_PASSPORTED = {
      level_of_help: "certificated",
      client_age: "standard",
      immigration_or_asylum: "false",
      domestic_abuse_applicant: "false",
      immigration_or_asylum_type_upper_tribunal: "no_upper_tribunal",
      passporting: "false",
      child_dependants: "false",
      adult_dependants: "false",
      employment_status: "unemployed",
      receives_benefits: "false",
    };
    const regularTransactions = (answers: Answers) =>
      buildRegularTransactionsSection(
        relevantAnswers(answers),
        new Set(stepsFor(answers)),
      );

    it("sends outgoings, housing payments and Housing Benefit to CFE", () => {
      const answers = formAnswers({
        ...NOT_PASSPORTED,
        partner: "false",
        maintenance_payments_relevant: "true",
        maintenance_payments_conditional_value: "120.50",
        maintenance_payments_frequency: "every_four_weeks",
        legal_aid_payments_relevant: "true",
        legal_aid_payments_conditional_value: "30",
        legal_aid_payments_frequency: "total",
        property_owned: "none",
        housing_payments: "900",
        housing_payments_frequency: "monthly",
        housing_benefit_relevant: "true",
        housing_benefit_value: "50",
        housing_benefit_frequency: "every_week",
      });

      assert.equal(answers.housing_payments, 900);
      assert.deepEqual(regularTransactions(answers), [
        {
          operation: "debit",
          category: "maintenance_out",
          frequency: "four_weekly",
          amount: 120.5,
        },
        {
          operation: "debit",
          category: "legal_aid",
          frequency: "three_monthly",
          amount: 30,
        },
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "monthly",
          amount: 900,
        },
        {
          operation: "credit",
          category: "housing_benefit",
          frequency: "weekly",
          amount: 50,
        },
      ]);
    });

    it("sends the mortgage or loan payment to CFE", () => {
      const answers = formAnswers({
        ...NOT_PASSPORTED,
        partner: "false",
        maintenance_payments_relevant: "false",
        legal_aid_payments_relevant: "false",
        property_owned: "with_mortgage",
        housing_loan_payments: "650.25",
        housing_payments_loan_frequency: "every_two_weeks",
      });

      assert.deepEqual(regularTransactions(answers), [
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "two_weekly",
          amount: 650.25,
        },
      ]);
    });

    it("sends shared ownership rent, mortgage and Housing Benefit to CFE", () => {
      // The shared ownership step's Housing Benefit fields have their own
      // form codes, and Forge has cleared the housing costs step's.
      const answers = formAnswers({
        ...NOT_PASSPORTED,
        partner: "false",
        maintenance_payments_relevant: "false",
        legal_aid_payments_relevant: "false",
        property_owned: "shared_ownership",
        property_landlord: "true",
        combined_frequency: "monthly",
        rent: "400",
        shared_ownership_mortgage: "350.50",
        housing_benefit_relevant: undefined,
        shared_ownership_housing_benefit_relevant: "true",
        shared_ownership_housing_benefit_value: "100",
        shared_ownership_housing_benefit_frequency: "monthly",
      });

      assert.equal(answers.housing_benefit_value, 100);
      assert.equal("shared_ownership_housing_benefit_value" in answers, false);
      assert.deepEqual(regularTransactions(answers), [
        {
          operation: "debit",
          category: "rent_or_mortgage",
          frequency: "monthly",
          amount: 750.5,
        },
        {
          operation: "credit",
          category: "housing_benefit",
          frequency: "monthly",
          amount: 100,
        },
      ]);
    });

    it("sends the partner's outgoings to CFE", () => {
      const answers = formAnswers({
        ...NOT_PASSPORTED,
        partner: "true",
        partner_date_of_birth: "1980-01-01",
        partner_employment_status: "unemployed",
        partner_receives_benefits: "false",
        maintenance_payments_relevant: "false",
        legal_aid_payments_relevant: "false",
        partner_maintenance_payments_relevant: "true",
        partner_maintenance_payments_conditional_value: "25",
        partner_maintenance_payments_frequency: "every_week",
        partner_legal_aid_payments_relevant: "false",
        property_owned: "outright",
      });

      assert.deepEqual(
        buildPartnerSection(
          relevantAnswers(answers),
          new Set(stepsFor(answers)),
        )?.regular_transactions,
        [
          {
            operation: "debit",
            category: "maintenance_out",
            frequency: "weekly",
            amount: 25,
          },
        ],
      );
    });
  });
});
