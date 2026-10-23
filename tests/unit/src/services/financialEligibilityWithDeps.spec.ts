/**
 * Unit tests for financialEligibilityWithDeps - mapAnswersToApiPayload function and
 * the FinancialEligibilityEffectsWithDepsImpl class
 */

import { expect } from "chai";
import sinon from "sinon";
import { createTestEffectContext } from "@ministryofjustice/hmpps-forge/core/testing";
import type { Deps } from "#packages/financial-eligibility-journey/src/api.js";
import type { FinancialEligibilitySession } from "#packages/financial-eligibility-journey/src/context.type.js";
import {
  mapAnswersToApiPayload,
  applyNonRequiredSectionDefaults,
  mapFinancialEligibilityApiDataToAnswerCodes,
  FinancialEligibilityEffectsWithDepsImpl,
} from "#src/services/financialEligibilityWithDeps.js";
import { transformFinancialEligibilityItem } from "#src/services/api/transforms/transformFinancialEligibility.js";

// Shape produced by applyNonRequiredSectionDefaults when zeroing a `you`/`partner` income, deductions or savings section
const zeroedSavings = {
  bank_balance: 0,
  investment_balance: 0,
  asset_balance: 0,
  credit_balance: 0,
};
const zeroedIncome = {
  earnings: { per_interval_value: 0, interval_period: "per_month" },
  self_employment_drawings: {
    per_interval_value: 0,
    interval_period: "per_month",
  },
  benefits: { per_interval_value: 0, interval_period: "per_month" },
  child_benefits: { per_interval_value: 0, interval_period: "per_month" },
  tax_credits: { per_interval_value: 0, interval_period: "per_month" },
  maintenance_received: { per_interval_value: 0, interval_period: "per_month" },
  pension: { per_interval_value: 0, interval_period: "per_month" },
  other_income: { per_interval_value: 0, interval_period: "per_month" },
  self_employed: false,
};
const zeroedDeductions = {
  income_tax: { per_interval_value: 0, interval_period: "per_month" },
  national_insurance: { per_interval_value: 0, interval_period: "per_month" },
  mortgage: { per_interval_value: 0, interval_period: "per_month" },
  rent: { per_interval_value: 0, interval_period: "per_month" },
  maintenance: { per_interval_value: 0, interval_period: "per_month" },
  childcare: { per_interval_value: 0, interval_period: "per_month" },
  criminal_legalaid_contributions: 0,
};

describe("mapAnswersToApiPayload", () => {
  describe("Basic mapping", () => {
    it("should map under-18 step code to `is_you_under_18 field`", () => {
      const answers = { "under-18": "yes" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal(true);
    });

    it("should map under-18-receives-regular-payment step code to `under_18_receive_regular_payment` field", () => {
      const answers = { "under-18-receives-regular-payment": "no" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.under_18_receive_regular_payment).to.equal(false);
    });

    it("should map under-18-has-valuables step code to `under_18_has_valuables` field", () => {
      const answers = { "under-18-has-valuables": "yes" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.under_18_has_valuables).to.equal(true);
    });

    it("should map has-partner step code to `has_partner` field", () => {
      const answers = { "has-partner": "yes" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.has_partner).to.equal(true);
    });

    it("should map 60-or-over step code to `is_you_or_your_partner_over_60` field", () => {
      const answers = { "60-or-over": "no" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_or_your_partner_over_60).to.equal(false);
    });

    it("should map 60-or-over-with-partner step code to `is_you_or_your_partner_over_60` field", () => {
      const answers = { "60-or-over-with-partner": "yes" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_or_your_partner_over_60).to.equal(true);
    });
  });

  describe("String to boolean conversion", () => {
    it('should convert "yes" string to true', () => {
      const answers = { "under-18": "yes" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal(true);
    });

    it('should convert "no" string to false', () => {
      const answers = { "under-18": "no" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal(false);
    });

    it('should convert "Yes" (uppercase) string to true', () => {
      const answers = { "under-18": "Yes" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal(true);
    });

    it('should convert "NO" (uppercase) string to false', () => {
      const answers = { "under-18": "NO" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal(false);
    });

    it('should convert "YeS" (mixed case) string to true', () => {
      const answers = { "under-18": "YeS" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal(true);
    });

    it("should keep non-yes/no string values as-is", () => {
      const answers = { "under-18": "maybe" };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal("maybe");
    });

    it("should keep boolean values as-is", () => {
      const answers = { "under-18": true };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal(true);
    });
  });

  describe("Benefits field grouping", () => {
    it("should group universal-credit into `specific_benefits`", () => {
      const answers = { "universal-credit": "yes" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.specific_benefits).to.exist;
      expect(
        (result.specific_benefits as Record<string, unknown>).universal_credit,
      ).to.equal(true);
      expect(result.universal_credit).to.be.undefined;
    });

    it("should group income-support into `specific_benefits`", () => {
      const answers = { "income-support": "yes" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.specific_benefits).to.exist;
      expect(
        (result.specific_benefits as Record<string, unknown>).income_support,
      ).to.equal(true);
    });

    it("should group income-based-jsa into `specific_benefits` as `job_seekers_allowance`", () => {
      const answers = { "income-based-jsa": "yes" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.specific_benefits).to.exist;
      expect(
        (result.specific_benefits as Record<string, unknown>)
          .job_seekers_allowance,
      ).to.equal(true);
    });

    it("should group pension-credit into `specific_benefits`", () => {
      const answers = { "pension-credit": "no" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.specific_benefits).to.exist;
      expect(
        (result.specific_benefits as Record<string, unknown>).pension_credit,
      ).to.equal(false);
    });

    it("should group employment-support into `specific_benefits`", () => {
      const answers = { "employment-support": "yes" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.specific_benefits).to.exist;
      expect(
        (result.specific_benefits as Record<string, unknown>)
          .employment_support,
      ).to.equal(true);
    });

    it("should group multiple benefit fields into specific_benefits", () => {
      const answers = {
        "universal-credit": "yes",
        "income-support": "no",
        "pension-credit": "yes",
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.specific_benefits).to.exist;
      const benefits = result.specific_benefits as Record<string, unknown>;
      expect(benefits.universal_credit).to.equal(true);
      expect(benefits.income_support).to.equal(false);
      expect(benefits.pension_credit).to.equal(true);
    });

    it("should not create specific_benefits when no benefit fields are present", () => {
      const answers = {
        "under-18": "yes",
        partner: "no",
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.specific_benefits).to.be.undefined;
    });
  });

  describe("`under_18_passported` calculation", () => {
    it("should set `under_18_passported` to `true` when under 18, no regular payment, and no valuables", () => {
      const answers = {
        "under-18": "yes",
        "under-18-receives-regular-payment": "no",
        "under-18-has-valuables": "no",
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.under_18_passported).to.equal(true);
    });

    it("should set under_18_passported to false when under 18 but has regular payment", () => {
      const answers = {
        "under-18": "yes",
        "under-18-receives-regular-payment": "yes",
        "under-18-has-valuables": "no",
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.under_18_passported).to.equal(false);
    });

    it("should set under_18_passported to false when under 18 but has valuables", () => {
      const answers = {
        "under-18": "yes",
        "under-18-receives-regular-payment": "no",
        "under-18-has-valuables": "yes",
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.under_18_passported).to.equal(false);
    });

    it("should set under_18_passported to false when under 18 but has both regular payment and valuables", () => {
      const answers = {
        "under-18": "yes",
        "under-18-receives-regular-payment": "yes",
        "under-18-has-valuables": "yes",
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.under_18_passported).to.equal(false);
    });

    it("should set under_18_passported to false when not under 18", () => {
      const answers = {
        "under-18": "no",
        "under-18-receives-regular-payment": "no",
        "under-18-has-valuables": "no",
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.under_18_passported).to.equal(false);
    });

    it("should set under_18_passported to false when under_18 is not answered", () => {
      const answers = {
        "under-18-receives-regular-payment": "no",
        "under-18-has-valuables": "no",
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.under_18_passported).to.equal(false);
    });
  });

  describe("Complete payload mapping", () => {
    it("should map a complete set of answers correctly", () => {
      const answers = {
        "under-18": "yes",
        "under-18-receives-regular-payment": "no",
        "under-18-has-valuables": "no",
        "has-partner": "yes",
        "60-or-over": "no",
        "universal-credit": "yes",
        "income-support": "no",
        "income-based-jsa": "no",
        "pension-credit": "no",
        "employment-support": "yes",
        "bank-balance": "56",
        "investment-balance": "66",
        "asset-balance": "44",
        "credit-balance": "56",
        "bank-balance-partner": "10",
        "investment-balance-partner": "20",
        "asset-balance-partner": "30",
        "credit-balance-partner": "40",
        disregards: ["grenfell_tower", "love_manchester"],
        propertySet: [
          {
            value: 45,
            "mortgage-left": 5,
            share: 6,
            disputed: "no",
            main: "yes",
            id: 1377,
          },
        ],
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.is_you_under_18).to.equal(true);
      expect(result.under_18_receive_regular_payment).to.equal(false);
      expect(result.under_18_has_valuables).to.equal(false);
      expect(result.has_partner).to.equal(true);
      expect(result.under_18_passported).to.equal(true);
      expect(result.on_passported_benefits).to.equal(true);

      // is_you_or_your_partner_over_60, specific_benefits and disregards are nulled because
      // under_18_passported is true, overriding the drafted answers above
      expect(result.is_you_or_your_partner_over_60).to.equal(null);
      expect(result.specific_benefits).to.equal(null);
      expect(result.disregards).to.equal(null);

      // under_18_passported and on_passported_benefits are both true here, so `you`'s income/deductions/savings
      // are zeroed by the non-required-section defaults, overriding the drafted bank-balance answers above
      expect(result.you).to.deep.equal({
        savings: zeroedSavings,
        income: zeroedIncome,
        deductions: zeroedDeductions,
      });

      // under_18_passported is true, so `partner`'s finances are zeroed regardless of has_partner,
      // overriding the drafted partner bank-balance answers above
      expect(result.partner).to.deep.equal({
        savings: zeroedSavings,
        income: zeroedIncome,
        deductions: zeroedDeductions,
      });

      // property_set is reset to [] because under_18_passported is true, overriding the drafted property answer
      expect(result.property_set).to.deep.equal([]);

      // dependants are zeroed because on_passported_benefits is true
      expect(result.dependants_old).to.equal(0);
      expect(result.dependants_young).to.equal(0);
    });
  });

  // Full edge-case coverage of the zeroing/nulling rules lives in the dedicated `applyNonRequiredSectionDefaults`
  // suite below - these tests just prove mapAnswersToApiPayload computes the three gates and wires them through.
  describe("Non-required section defaults (wiring)", () => {
    it("computes `under_18_passported` and applies AC1 zeroing to the built `you` section", () => {
      const answers = {
        "under-18": "yes",
        "under-18-receives-regular-payment": "no",
        "under-18-has-valuables": "no",
        "bank-balance": "100",
      };
      const result = mapAnswersToApiPayload(answers);
      const you = result.you as Record<string, Record<string, unknown>>;

      expect(result.under_18_passported).to.equal(true);
      expect(you.savings).to.deep.equal(zeroedSavings);
    });

    it("computes `on_passported_benefits` and applies AC2 zeroing to the built `you` section", () => {
      const answers = { "universal-credit": "yes", earnings: "200" };
      const result = mapAnswersToApiPayload(answers);
      const you = result.you as Record<string, Record<string, unknown>>;

      expect(result.on_passported_benefits).to.equal(true);
      expect(you.income).to.deep.equal(zeroedIncome);
    });

    it("computes `has_partner` and applies AC3 zeroing to the built `partner` section", () => {
      const answers = { "has-partner": "no", "earnings-partner": "200" };
      const result = mapAnswersToApiPayload(answers);
      const partner = result.partner as Record<string, Record<string, unknown>>;

      expect(result.has_partner).to.equal(false);
      expect(partner.income).to.deep.equal(zeroedIncome);
    });

    it("leaves the built `you`/`partner` sections untouched when none of the gates are true", () => {
      const answers = {
        "bank-balance": "100",
        "earnings-partner": "200",
        "universal-credit": "no",
      };
      const result = mapAnswersToApiPayload(answers);
      const you = result.you as Record<string, Record<string, unknown>>;

      expect(result.under_18_passported).to.equal(false);
      expect(result.on_passported_benefits).to.equal(false);
      expect(you.savings.bank_balance).to.equal(10000);
    });
  });

  describe("Savings field mapping", () => {
    describe("Client savings (you.savings)", () => {
      it("should nest savings fields under `you.savings`", () => {
        const answers = { "bank-balance": "56" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.you).to.exist;
        expect((result.you as Record<string, unknown>).savings).to.exist;
      });

      it("should convert bank-balance pounds to pence under `you.savings`", () => {
        const answers = { "bank-balance": "56" };
        const result = mapAnswersToApiPayload(answers);

        const savings = (result.you as Record<string, Record<string, unknown>>)
          .savings;
        expect(savings.bank_balance).to.equal(5600);
      });

      it("should convert investment-balance pounds to pence under `you.savings`", () => {
        const answers = { "investment-balance": "66" };
        const result = mapAnswersToApiPayload(answers);

        const savings = (result.you as Record<string, Record<string, unknown>>)
          .savings;
        expect(savings.investment_balance).to.equal(6600);
      });

      it("should convert asset-balance pounds to pence under `you.savings`", () => {
        const answers = { "asset-balance": "44" };
        const result = mapAnswersToApiPayload(answers);

        const savings = (result.you as Record<string, Record<string, unknown>>)
          .savings;
        expect(savings.asset_balance).to.equal(4400);
      });

      it("should convert credit-balance pounds to pence under `you.savings`", () => {
        const answers = { "credit-balance": "56" };
        const result = mapAnswersToApiPayload(answers);

        const savings = (result.you as Record<string, Record<string, unknown>>)
          .savings;
        expect(savings.credit_balance).to.equal(5600);
      });

      it("should round fractional pence correctly", () => {
        const answers = { "bank-balance": "12.505" };
        const result = mapAnswersToApiPayload(answers);

        const savings = (result.you as Record<string, Record<string, unknown>>)
          .savings;
        expect(savings.bank_balance).to.equal(1251);
      });

      it("should not create `you.savings` when no savings fields are present", () => {
        const answers = { "under-18": "yes" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.you).to.be.undefined;
      });

      it("should group all four savings fields together under `you.savings`", () => {
        const answers = {
          "bank-balance": "56",
          "investment-balance": "66",
          "asset-balance": "44",
          "credit-balance": "56",
        };
        const result = mapAnswersToApiPayload(answers);

        const savings = (result.you as Record<string, Record<string, unknown>>)
          .savings;
        expect(savings).to.deep.equal({
          bank_balance: 5600,
          investment_balance: 6600,
          asset_balance: 4400,
          credit_balance: 5600,
        });
      });
    });

    describe("Partner savings (partner.savings)", () => {
      it("should nest partner savings fields under `partner.savings`", () => {
        const answers = { "bank-balance-partner": "100" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.partner).to.exist;
        expect((result.partner as Record<string, unknown>).savings).to.exist;
      });

      it("should convert bank-balance-partner pounds to pence under `partner.savings`", () => {
        const answers = { "bank-balance-partner": "100" };
        const result = mapAnswersToApiPayload(answers);

        const savings = (
          result.partner as Record<string, Record<string, unknown>>
        ).savings;
        expect(savings.bank_balance).to.equal(10000);
      });

      it("should convert all partner savings fields to pence under `partner.savings`", () => {
        const answers = {
          "bank-balance-partner": "10",
          "investment-balance-partner": "20",
          "asset-balance-partner": "30",
          "credit-balance-partner": "40",
        };
        const result = mapAnswersToApiPayload(answers);

        const savings = (
          result.partner as Record<string, Record<string, unknown>>
        ).savings;
        expect(savings).to.deep.equal({
          bank_balance: 1000,
          investment_balance: 2000,
          asset_balance: 3000,
          credit_balance: 4000,
        });
      });

      it("should not create partner when no partner savings fields are present", () => {
        const answers = { "bank-balance": "100" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.partner).to.be.undefined;
      });

      it("should not mix partner savings into `you.savings`", () => {
        const answers = { "bank-balance": "10", "bank-balance-partner": "20" };
        const result = mapAnswersToApiPayload(answers);

        const clientSavings = (
          result.you as Record<string, Record<string, unknown>>
        ).savings;
        const partnerSavings = (
          result.partner as Record<string, Record<string, unknown>>
        ).savings;
        expect(clientSavings.bank_balance).to.equal(1000);
        expect(partnerSavings.bank_balance).to.equal(2000);
      });
    });

    describe("Disputed savings (disputed_savings)", () => {
      it("should nest disputed savings fields under disputed_savings", () => {
        const answers = { "bank-balance-disputed": "75" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.disputed_savings).to.exist;
      });

      it("should convert bank-balance-disputed pounds to pence under disputed_savings", () => {
        const answers = { "bank-balance-disputed": "75" };
        const result = mapAnswersToApiPayload(answers);

        const savings = result.disputed_savings as Record<string, unknown>;
        expect(savings.bank_balance).to.equal(7500);
      });

      it("should convert all disputed savings fields to pence under disputed_savings", () => {
        const answers = {
          "bank-balance-disputed": "10",
          "investment-balance-disputed": "20",
          "asset-balance-disputed": "30",
          "credit-balance-disputed": "40",
        };
        const result = mapAnswersToApiPayload(answers);

        expect(result.disputed_savings).to.deep.equal({
          bank_balance: 1000,
          investment_balance: 2000,
          asset_balance: 3000,
          credit_balance: 4000,
        });
      });

      it("should not create disputed_savings when no disputed savings fields are present", () => {
        const answers = { "bank-balance": "100" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.disputed_savings).to.be.undefined;
      });

      it("should keep client, partner and disputed savings independent", () => {
        const answers = {
          "bank-balance": "10",
          "bank-balance-partner": "20",
          "bank-balance-disputed": "30",
        };
        const result = mapAnswersToApiPayload(answers);

        const clientSavings = (
          result.you as Record<string, Record<string, unknown>>
        ).savings;
        const partnerSavings = (
          result.partner as Record<string, Record<string, unknown>>
        ).savings;
        const disputedSavings = result.disputed_savings as Record<
          string,
          unknown
        >;
        expect(clientSavings.bank_balance).to.equal(1000);
        expect(partnerSavings.bank_balance).to.equal(2000);
        expect(disputedSavings.bank_balance).to.equal(3000);
      });

      it("should map non-numeric savings values to 0 pence for client, partner and disputed savings", () => {
        const answers = {
          "bank-balance": "not-a-number",
          "bank-balance-partner": "not-a-number",
          "bank-balance-disputed": "not-a-number",
        };
        const result = mapAnswersToApiPayload(answers);

        const clientSavings = (
          result.you as Record<string, Record<string, unknown>>
        ).savings;
        const partnerSavings = (
          result.partner as Record<string, Record<string, unknown>>
        ).savings;
        const disputedSavings = result.disputed_savings as Record<
          string,
          unknown
        >;

        expect(clientSavings.bank_balance).to.equal(0);
        expect(partnerSavings.bank_balance).to.equal(0);
        expect(disputedSavings.bank_balance).to.equal(0);
      });
    });
  });

  describe("Property set mapping", () => {
    it("should map indexed property fields to property_set in pence", () => {
      const answers = {
        value_0: 350000,
        "mortgage-left_0": 125000,
        disputed_0: "yes",
        main_0: "no",
        share_0: 50,
      };

      const result = mapAnswersToApiPayload(answers);
      expect(result.property_set).to.deep.equal([
        {
          value: 35000000,
          mortgage_left: 12500000,
          disputed: true,
          main: false,
          share: 50,
        },
      ]);
    });

    it("should map multiple indexed properties in index order", () => {
      const answers = {
        value_0: 350000,
        "mortgage-left_0": 125000,
        disputed_0: "yes",
        main_0: "no",
        share_0: 50,
        value_1: 200000,
        "mortgage-left_1": 100000,
        disputed_1: "no",
        main_1: "yes",
        share_1: 100,
      };

      const result = mapAnswersToApiPayload(answers);
      expect(result.property_set).to.deep.equal([
        {
          value: 35000000,
          mortgage_left: 12500000,
          disputed: true,
          main: false,
          share: 50,
        },
        {
          value: 20000000,
          mortgage_left: 10000000,
          disputed: false,
          main: true,
          share: 100,
        },
      ]);
    });

    it("should map propertySet collection and omit id", () => {
      const answers = {
        propertySet: [
          {
            value: 45,
            "mortgage-left": 45,
            disputed: "no",
            main: "yes",
            share: 45,
            id: 1377,
          },
        ],
      };

      const result = mapAnswersToApiPayload(answers);
      expect(result.property_set).to.deep.equal([
        {
          value: 4500,
          mortgage_left: 4500,
          disputed: false,
          main: true,
          share: 45,
        },
      ]);
    });

    it("should preserve propertySet collection order when both collection and indexed keys exist", () => {
      const answers = {
        // stale indexed values should not override canonical collection order
        value_0: "666",
        "mortgage-left_0": "666",
        share_0: "6",
        disputed_0: "no",
        main_0: "no",
        value_1: "455",
        "mortgage-left_1": "45",
        share_1: "4",
        disputed_1: "no",
        main_1: "no",
        value_2: "56",
        "mortgage-left_2": "56",
        share_2: "55",
        disputed_2: "no",
        main_2: "no",
        propertySet: [
          {
            value: "56",
            "mortgage-left": "56",
            share: "55",
            disputed: "no",
            main: "no",
            id: 1384,
          },
          {
            value: "455",
            "mortgage-left": "45",
            share: "4",
            disputed: "no",
            main: "no",
            id: 1385,
          },
          {
            value: "666",
            "mortgage-left": "666",
            share: "6",
            disputed: "no",
            main: "no",
            id: 1386,
          },
        ],
      };

      const result = mapAnswersToApiPayload(answers);
      expect(result.property_set).to.deep.equal([
        {
          value: 5600,
          mortgage_left: 5600,
          disputed: false,
          main: false,
          share: 55,
        },
        {
          value: 45500,
          mortgage_left: 4500,
          disputed: false,
          main: false,
          share: 4,
        },
        {
          value: 66600,
          mortgage_left: 66600,
          disputed: false,
          main: false,
          share: 6,
        },
      ]);
    });

    it("should map explicit empty propertySet to an empty property_set array", () => {
      const answers = {
        propertySet: [],
      };

      const result = mapAnswersToApiPayload(answers);
      expect(result.property_set).to.deep.equal([]);
    });
  });

  describe("Disregards mapping", () => {
    it("should map single string disregard value to a boolean object", () => {
      const answers = { disregards: "grenfell_tower" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.disregards).to.deep.equal({ grenfell_tower: true });
    });

    it("should map disregards array values to a boolean object", () => {
      const answers = { disregards: ["grenfell_tower", "love_manchester"] };
      const result = mapAnswersToApiPayload(answers);

      expect(result.disregards).to.deep.equal({
        grenfell_tower: true,
        love_manchester: true,
      });
    });

    it('should map none disregard selection to an empty object, since the API does not recognise "none" as a field', () => {
      const answers = { disregards: ["none"] };
      const result = mapAnswersToApiPayload(answers);

      expect(result.disregards).to.deep.equal({});
    });
  });

  describe("Income and deductions field mapping", () => {
    describe("Client income (you.income)", () => {
      it("should nest income fields under `you.income`", () => {
        const answers = { earnings: "1200", "earnings-frequency": "per_month" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.you).to.exist;
        expect((result.you as Record<string, unknown>).income).to.exist;
      });

      it("should convert an amount to pence and keep the chosen frequency", () => {
        const answers = { earnings: "1200", "earnings-frequency": "per_week" };
        const result = mapAnswersToApiPayload(answers);

        const income = (result.you as Record<string, Record<string, unknown>>)
          .income;
        expect(income.earnings).to.deep.equal({
          per_interval_value: 120000,
          interval_period: "per_week",
        });
      });

      it("should default the frequency to `per_month` when no frequency answer is present", () => {
        const answers = { earnings: "1200" };
        const result = mapAnswersToApiPayload(answers);

        const income = (result.you as Record<string, Record<string, unknown>>)
          .income;
        expect(income.earnings).to.deep.equal({
          per_interval_value: 120000,
          interval_period: "per_month",
        });
      });

      it("should map all seven income fields under `you.income`", () => {
        const answers = {
          earnings: "100",
          "self-employment-drawings": "200",
          "income-benefits": "300",
          "tax-credits": "400",
          "maintenance-received": "500",
          "pension-income": "600",
          "other-income": "700",
        };
        const result = mapAnswersToApiPayload(answers);

        const income = (result.you as Record<string, Record<string, unknown>>)
          .income;
        expect(income).to.deep.equal({
          earnings: { per_interval_value: 10000, interval_period: "per_month" },
          self_employment_drawings: {
            per_interval_value: 20000,
            interval_period: "per_month",
          },
          benefits: { per_interval_value: 30000, interval_period: "per_month" },
          tax_credits: {
            per_interval_value: 40000,
            interval_period: "per_month",
          },
          maintenance_received: {
            per_interval_value: 50000,
            interval_period: "per_month",
          },
          pension: { per_interval_value: 60000, interval_period: "per_month" },
          other_income: {
            per_interval_value: 70000,
            interval_period: "per_month",
          },
        });
      });

      it("should map `self-employed` yes/no answer to a boolean on `you.income`", () => {
        const yesResult = mapAnswersToApiPayload({ "self-employed": "yes" });
        const noResult = mapAnswersToApiPayload({ "self-employed": "no" });

        expect(
          (yesResult.you as Record<string, Record<string, unknown>>).income
            .self_employed,
        ).to.equal(true);
        expect(
          (noResult.you as Record<string, Record<string, unknown>>).income
            .self_employed,
        ).to.equal(false);
      });

      it("should not create `you.income` when no income fields are present", () => {
        const answers = { "under-18": "yes" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.you).to.be.undefined;
      });

      it("should nest deduction fields under `you.deductions`, independently of `you.income`", () => {
        const answers = {
          "income-tax": "200",
          "income-tax-frequency": "per_year",
          "national-insurance": "100",
        };
        const result = mapAnswersToApiPayload(answers);

        const youPayload = result.you as Record<
          string,
          Record<string, unknown>
        >;
        expect(youPayload.deductions).to.deep.equal({
          income_tax: {
            per_interval_value: 20000,
            interval_period: "per_year",
          },
          national_insurance: {
            per_interval_value: 10000,
            interval_period: "per_month",
          },
        });
        expect(youPayload.income).to.be.undefined;
      });
    });

    describe("Partner income (partner.income)", () => {
      it("should nest partner income fields under `partner.income`, independently of the client", () => {
        const answers = {
          "earnings-partner": "900",
          "earnings-partner-frequency": "per_4week",
          earnings: "100",
        };
        const result = mapAnswersToApiPayload(answers);

        const partnerIncome = (
          result.partner as Record<string, Record<string, unknown>>
        ).income;
        const clientIncome = (
          result.you as Record<string, Record<string, unknown>>
        ).income;
        expect(partnerIncome.earnings).to.deep.equal({
          per_interval_value: 90000,
          interval_period: "per_4week",
        });
        expect(clientIncome.earnings).to.deep.equal({
          per_interval_value: 10000,
          interval_period: "per_month",
        });
      });

      it("should map `self-employed-partner` yes/no answer to a boolean on `partner.income`", () => {
        const result = mapAnswersToApiPayload({
          "self-employed-partner": "yes",
        });

        expect(
          (result.partner as Record<string, Record<string, unknown>>).income
            .self_employed,
        ).to.equal(true);
      });

      it("should nest partner deduction fields under `partner.deductions`", () => {
        const answers = {
          "income-tax-partner": "50",
          "national-insurance-partner": "25",
        };
        const result = mapAnswersToApiPayload(answers);

        const partnerPayload = result.partner as Record<
          string,
          Record<string, unknown>
        >;
        expect(partnerPayload.deductions).to.deep.equal({
          income_tax: {
            per_interval_value: 5000,
            interval_period: "per_month",
          },
          national_insurance: {
            per_interval_value: 2500,
            interval_period: "per_month",
          },
        });
      });

      it("should not create `partner` when no partner income or deduction fields are present", () => {
        const answers = { earnings: "100" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.partner).to.be.undefined;
      });
    });
  });

  describe("Dependants field mapping", () => {
    it("should map dependants aged 16 and over to `dependants_old` as a plain integer", () => {
      const answers = { "dependants-16-over": "2" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.dependants_old).to.equal(2);
    });

    it("should map dependants aged 15 and under to `dependants_young` as a plain integer", () => {
      const answers = { "dependants-15-under": "3" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.dependants_young).to.equal(3);
    });

    it("should map '0' to 0 for both dependants fields", () => {
      const answers = { "dependants-16-over": "0", "dependants-15-under": "0" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.dependants_old).to.equal(0);
      expect(result.dependants_young).to.equal(0);
    });

    it("should not apply pence-style multiplication to dependants counts", () => {
      const answers = { "dependants-16-over": "5" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.dependants_old).to.equal(5);
      expect(result.dependants_old).to.not.equal(500);
    });

    it("should round a fractional dependants value to the nearest whole number", () => {
      const answers = { "dependants-16-over": "2.6" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.dependants_old).to.equal(3);
    });

    it("should not nest dependants fields under `you` or `partner`", () => {
      const answers = { "dependants-16-over": "2", "dependants-15-under": "1" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.you).to.be.undefined;
      expect(result.partner).to.be.undefined;
    });

    it("should keep the two dependants fields independent of each other", () => {
      const answers = { "dependants-16-over": "4" };
      const result = mapAnswersToApiPayload(answers);

      expect(result.dependants_old).to.equal(4);
      expect(result.dependants_young).to.be.undefined;
    });
  });

  describe("Expenses field mapping", () => {
    describe("Client expenses (you.deductions)", () => {
      it("should nest expense fields under `you.deductions`, converted to pence, alongside income-tax/national-insurance", () => {
        const answers = {
          mortgage: "500",
          "mortgage-frequency": "per_month",
          rent: "300",
          "maintenance-paid": "100",
          "maintenance-paid-frequency": "per_week",
          "childcare-costs": "50",
          "income-tax": "200",
        };
        const result = mapAnswersToApiPayload(answers);

        const deductions = (
          result.you as Record<string, Record<string, unknown>>
        ).deductions;
        expect(deductions).to.deep.equal({
          mortgage: { per_interval_value: 50000, interval_period: "per_month" },
          rent: { per_interval_value: 30000, interval_period: "per_month" },
          maintenance: {
            per_interval_value: 10000,
            interval_period: "per_week",
          },
          childcare: { per_interval_value: 5000, interval_period: "per_month" },
          income_tax: {
            per_interval_value: 20000,
            interval_period: "per_month",
          },
        });
      });

      it("should map legal aid contributions to `criminal_legalaid_contributions` as a flat pence number", () => {
        const answers = { "legal-aid-contributions": "75" };
        const result = mapAnswersToApiPayload(answers);

        const deductions = (
          result.you as Record<string, Record<string, unknown>>
        ).deductions;
        expect(deductions.criminal_legalaid_contributions).to.equal(7500);
      });

      it("should not create `you.deductions` when no expense or deduction fields are present", () => {
        const answers = { "under-18": "yes" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.you).to.be.undefined;
      });
    });

    describe("Partner expenses (partner.deductions)", () => {
      it("should nest partner expense fields under `partner.deductions`, independently of the client", () => {
        const answers = {
          "mortgage-partner": "900",
          "mortgage-partner-frequency": "per_4week",
          mortgage: "100",
        };
        const result = mapAnswersToApiPayload(answers);

        const partnerDeductions = (
          result.partner as Record<string, Record<string, unknown>>
        ).deductions;
        const clientDeductions = (
          result.you as Record<string, Record<string, unknown>>
        ).deductions;
        expect(partnerDeductions.mortgage).to.deep.equal({
          per_interval_value: 90000,
          interval_period: "per_4week",
        });
        expect(clientDeductions.mortgage).to.deep.equal({
          per_interval_value: 10000,
          interval_period: "per_month",
        });
      });

      it("should map the partner's legal aid contributions to `criminal_legalaid_contributions` as a flat pence number", () => {
        const answers = { "legal-aid-contributions-partner": "40" };
        const result = mapAnswersToApiPayload(answers);

        const partnerDeductions = (
          result.partner as Record<string, Record<string, unknown>>
        ).deductions;
        expect(partnerDeductions.criminal_legalaid_contributions).to.equal(
          4000,
        );
      });

      it("should not create `partner` when no partner expense fields are present", () => {
        const answers = { mortgage: "100" };
        const result = mapAnswersToApiPayload(answers);

        expect(result.partner).to.be.undefined;
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty answers object", () => {
      const answers = {};
      const result = mapAnswersToApiPayload(answers);

      expect(result.under_18_passported).to.equal(false);
      expect(result.specific_benefits).to.be.undefined;
    });

    it("should ignore unmapped step codes", () => {
      const answers = {
        "unknown-field": "value",
        "another-unknown": "test",
      };
      const result = mapAnswersToApiPayload(answers);

      expect(result.unknown_field).to.be.undefined;
      expect(result.another_unknown).to.be.undefined;
      expect(result.under_18_passported).to.equal(false);
    });

    it("should handle null values", () => {
      const answers = { "under-18": null };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal(null);
    });

    it("should handle undefined values", () => {
      const answers = { "under-18": undefined };
      const result = mapAnswersToApiPayload(answers);
      expect(result.is_you_under_18).to.equal(undefined);
    });
  });
});

describe("applyNonRequiredSectionDefaults", () => {
  const under18PassportedGates = {
    under18Passported: true,
    onPassportedBenefits: false,
    hasPartner: undefined,
  };

  describe("AC1: under-18 passported", () => {
    it("should zero all of `you.income`, `you.deductions` and `you.savings`", () => {
      const payload: Record<string, unknown> = {
        you: { savings: { bank_balance: 10000 } },
      };
      applyNonRequiredSectionDefaults(payload, under18PassportedGates);
      const you = payload.you as Record<string, Record<string, unknown>>;

      expect(you.savings).to.deep.equal(zeroedSavings);
      expect(you.income).to.deep.equal(zeroedIncome);
      expect(you.deductions).to.deep.equal(zeroedDeductions);
    });

    it("should reset `property_set` to an empty array and zero `disputed_savings`", () => {
      const payload: Record<string, unknown> = {
        property_set: [{ value: 4500 }],
        disputed_savings: { bank_balance: 2000 },
      };
      applyNonRequiredSectionDefaults(payload, under18PassportedGates);

      expect(payload.property_set).to.deep.equal([]);
      expect(payload.disputed_savings).to.deep.equal(zeroedSavings);
    });

    it("should build a fully-zeroed `you` even when no money fields were present on the payload", () => {
      const payload: Record<string, unknown> = {};
      applyNonRequiredSectionDefaults(payload, under18PassportedGates);
      const you = payload.you as Record<string, Record<string, unknown>>;

      expect(you.savings).to.deep.equal(zeroedSavings);
      expect(you.income).to.deep.equal(zeroedIncome);
      expect(you.deductions).to.deep.equal(zeroedDeductions);
    });

    it("should not zero `you` when under18Passported is false", () => {
      const payload: Record<string, unknown> = {
        you: { savings: { bank_balance: 10000 } },
      };
      applyNonRequiredSectionDefaults(payload, {
        under18Passported: false,
        onPassportedBenefits: false,
        hasPartner: undefined,
      });
      const you = payload.you as Record<string, Record<string, unknown>>;

      expect(you.savings.bank_balance).to.equal(10000);
    });

    it("should zero `partner.income`, `partner.deductions` and `partner.savings` regardless of has_partner", () => {
      const payload: Record<string, unknown> = {
        partner: { savings: { bank_balance: 10000 } },
      };
      applyNonRequiredSectionDefaults(payload, {
        under18Passported: true,
        onPassportedBenefits: false,
        hasPartner: true,
      });
      const partner = payload.partner as Record<
        string,
        Record<string, unknown>
      >;

      expect(partner.savings).to.deep.equal(zeroedSavings);
      expect(partner.income).to.deep.equal(zeroedIncome);
      expect(partner.deductions).to.deep.equal(zeroedDeductions);
    });

    it("should default `has_partner` to null when the partner question was never answered", () => {
      const payload: Record<string, unknown> = {};
      applyNonRequiredSectionDefaults(payload, under18PassportedGates);

      expect(payload.has_partner).to.equal(null);
    });

    it("should leave a genuinely stale `has_partner` answer untouched", () => {
      const payload: Record<string, unknown> = { has_partner: true };
      applyNonRequiredSectionDefaults(payload, {
        under18Passported: true,
        onPassportedBenefits: false,
        hasPartner: true,
      });

      expect(payload.has_partner).to.equal(true);
    });

    it("should zero both dependants fields, since the dependants step is hidden but still directly reachable", () => {
      const payload: Record<string, unknown> = {
        dependants_old: 2,
        dependants_young: 3,
      };
      applyNonRequiredSectionDefaults(payload, under18PassportedGates);

      expect(payload.dependants_old).to.equal(0);
      expect(payload.dependants_young).to.equal(0);
    });

    it("should null `specific_benefits`, `disregards` and `is_you_or_your_partner_over_60`, since those questions are hidden but still directly reachable", () => {
      const payload: Record<string, unknown> = {
        specific_benefits: { universal_credit: true },
        disregards: { grenfell_tower: true },
        is_you_or_your_partner_over_60: false,
      };
      applyNonRequiredSectionDefaults(payload, under18PassportedGates);

      expect(payload.specific_benefits).to.equal(null);
      expect(payload.disregards).to.equal(null);
      expect(payload.is_you_or_your_partner_over_60).to.equal(null);
    });

    it("should not null `specific_benefits`, `disregards` or `is_you_or_your_partner_over_60` when under18Passported is false", () => {
      const payload: Record<string, unknown> = {
        specific_benefits: { universal_credit: true },
        disregards: { grenfell_tower: true },
        is_you_or_your_partner_over_60: false,
      };
      applyNonRequiredSectionDefaults(payload, {
        under18Passported: false,
        onPassportedBenefits: false,
        hasPartner: undefined,
      });

      expect(payload.specific_benefits).to.not.equal(null);
      expect(payload.disregards).to.not.equal(null);
      expect(payload.is_you_or_your_partner_over_60).to.equal(false);
    });

    it("should still fully wipe everything when stale `has_partner`/`on_passported_benefits` are left over from an earlier path", () => {
      const payload: Record<string, unknown> = {
        partner: { savings: { bank_balance: 10000 } },
      };
      applyNonRequiredSectionDefaults(payload, {
        under18Passported: true,
        onPassportedBenefits: true,
        hasPartner: true,
      });
      const partner = payload.partner as Record<
        string,
        Record<string, unknown>
      >;

      expect(partner.savings).to.deep.equal(zeroedSavings);
      expect(partner.income).to.deep.equal(zeroedIncome);
      expect(partner.deductions).to.deep.equal(zeroedDeductions);
      expect(payload.specific_benefits).to.equal(null);
      expect(payload.disregards).to.equal(null);
      expect(payload.is_you_or_your_partner_over_60).to.equal(null);
      expect(payload.dependants_old).to.equal(0);
      expect(payload.dependants_young).to.equal(0);
    });
  });

  describe("AC2: on passported benefits", () => {
    const onPassportedBenefitsGates = {
      under18Passported: false,
      onPassportedBenefits: true,
      hasPartner: undefined,
    };

    it("should zero `you.income` and `you.deductions`, and zero both dependants fields", () => {
      const payload: Record<string, unknown> = {
        dependants_old: 2,
        dependants_young: 3,
      };
      applyNonRequiredSectionDefaults(payload, onPassportedBenefitsGates);
      const you = payload.you as Record<string, Record<string, unknown>>;

      expect(you.income).to.deep.equal(zeroedIncome);
      expect(you.deductions).to.deep.equal(zeroedDeductions);
      expect(payload.dependants_old).to.equal(0);
      expect(payload.dependants_young).to.equal(0);
    });

    it("should zero `partner.income` and `partner.deductions` (not `partner.savings`) regardless of has_partner", () => {
      const payload: Record<string, unknown> = {
        partner: { savings: { bank_balance: 10000 } },
      };
      applyNonRequiredSectionDefaults(payload, {
        under18Passported: false,
        onPassportedBenefits: true,
        hasPartner: true,
      });
      const partner = payload.partner as Record<
        string,
        Record<string, unknown>
      >;

      expect(partner.income).to.deep.equal(zeroedIncome);
      expect(partner.deductions).to.deep.equal(zeroedDeductions);
      expect(partner.savings.bank_balance).to.equal(10000);
    });

    it("should not zero `you` or dependants when onPassportedBenefits is false", () => {
      const payload: Record<string, unknown> = {
        you: {
          income: {
            earnings: {
              per_interval_value: 20000,
              interval_period: "per_month",
            },
          },
        },
        dependants_old: 2,
      };
      applyNonRequiredSectionDefaults(payload, {
        under18Passported: false,
        onPassportedBenefits: false,
        hasPartner: undefined,
      });
      const you = payload.you as Record<string, Record<string, unknown>>;

      expect(
        (you.income.earnings as Record<string, unknown>).per_interval_value,
      ).to.equal(20000);
      expect(payload.dependants_old).to.equal(2);
    });
  });

  describe("AC3: no partner", () => {
    it("should zero `partner.income`, `partner.deductions` and `partner.savings`", () => {
      const payload: Record<string, unknown> = {
        partner: { savings: { bank_balance: 10000 } },
      };
      applyNonRequiredSectionDefaults(payload, {
        under18Passported: false,
        onPassportedBenefits: false,
        hasPartner: false,
      });
      const partner = payload.partner as Record<
        string,
        Record<string, unknown>
      >;

      expect(partner.savings).to.deep.equal(zeroedSavings);
      expect(partner.income).to.deep.equal(zeroedIncome);
      expect(partner.deductions).to.deep.equal(zeroedDeductions);
    });

    it("should not zero `partner` when hasPartner is true", () => {
      const payload: Record<string, unknown> = {
        partner: {
          income: {
            earnings: {
              per_interval_value: 20000,
              interval_period: "per_month",
            },
          },
        },
      };
      applyNonRequiredSectionDefaults(payload, {
        under18Passported: false,
        onPassportedBenefits: false,
        hasPartner: true,
      });
      const partner = payload.partner as Record<
        string,
        Record<string, unknown>
      >;

      expect(
        (partner.income.earnings as Record<string, unknown>).per_interval_value,
      ).to.equal(20000);
    });
  });
});

// getSession() is typed to allow undefined, but the seed helper always defaults session to {}, so force it directly
function withNoSession(
  context: ReturnType<typeof createTestEffectContext>,
): void {
  sinon.stub(context, "getSession").returns(undefined);
}

describe("FinancialEligibilityEffectsWithDepsImpl", () => {
  const deps = {} as Deps;
  let getFinancialEligibilityStub: sinon.SinonStub;
  let updateFinancialEligibilityStub: sinon.SinonStub;
  let loadCaseStub: sinon.SinonStub;
  let effects: FinancialEligibilityEffectsWithDepsImpl;

  beforeEach(() => {
    getFinancialEligibilityStub = sinon.stub();
    updateFinancialEligibilityStub = sinon.stub();
    loadCaseStub = sinon.stub();
    effects = new FinancialEligibilityEffectsWithDepsImpl({
      getFinancialEligibility: getFinancialEligibilityStub,
      updateFinancialEligibility: updateFinancialEligibilityStub,
      loadCase: loadCaseStub,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("LoadCaseDetails", () => {
    it("does not store case details when no caseId is present in the request params", async () => {
      const context = createTestEffectContext({ params: {} });

      await effects.LoadCaseDetails(deps, context);

      expect(loadCaseStub.called).to.be.false;
      expect(context.getData("caseDetails")).to.be.undefined;
    });

    it("loads the case from the API and stores it under `case` and `caseDetails`", async () => {
      const authenticatedAxios = { axiosInstance: {} };
      const caseData = {
        reference: "CASE123",
        full_name: "Jane Doe",
        date_of_birth: "1990-01-01",
      };
      loadCaseStub.resolves(caseData);
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        state: { authenticatedAxios },
      });

      await effects.LoadCaseDetails(deps, context);

      expect(loadCaseStub.calledOnceWithExactly(authenticatedAxios, "CASE123"))
        .to.be.true;
      expect(context.getData("case")).to.deep.equal(caseData);
      expect(context.getData("caseDetails")).to.deep.equal({
        status: "success",
        data: caseData,
      });
    });

    it("propagates API errors when the case cannot be loaded", async () => {
      loadCaseStub.rejects(new Error("Error loading case"));
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
      });

      let caughtError: Error | undefined;
      try {
        await effects.LoadCaseDetails(deps, context);
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError?.message).to.equal("Error loading case");
      expect(context.getData("caseDetails")).to.be.undefined;
    });
  });

  describe("LoadCaseFinancialEligibility", () => {
    const financialEligibilityData = {
      hasPartner: true,
      isUnder17: true,
      isOver60: false,
      specificBenefits: {
        universalCredit: true,
        incomeSupport: false,
        jobSeekers: true,
        pensionCredit: false,
        employmentSupport: true,
      },
      under18RegularPayment: false,
      under18HasValuables: false,
      propertySet: [],
      clientData: { savings: null },
      partnerData: { partnerSavings: null },
      disputedSavings: null,
      disregards: [],
    };

    it("does not call the API when no caseId is present in the request params", async () => {
      const context = createTestEffectContext({ params: {} });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(getFinancialEligibilityStub.called).to.be.false;
      expect(context.getAllAnswers()).to.deep.equal({});
    });

    it("does not set any answers when getSession returns no session for the request", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
      });
      withNoSession(context);
      getFinancialEligibilityStub.resolves({ data: financialEligibilityData });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(getFinancialEligibilityStub.calledOnce).to.be.true;
      expect(context.getAllAnswers()).to.deep.equal({});
    });

    it("starts from an empty eligibility check when the case does not have one yet", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });
      getFinancialEligibilityStub.resolves({ data: null, status: "success" });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("under-18")).to.equal("");
      expect(context.getAnswer("has-partner")).to.equal("");
      expect(context.getAnswer("universal-credit")).to.equal("");
      expect(context.getAnswer("dependants-16-over")).to.equal(0);
      expect(context.getAnswer("earnings-frequency")).to.equal("per_month");
      expect(context.getAnswer("propertySet")).to.deep.equal([]);
      expect(
        (context.getSession() as FinancialEligibilitySession)
          .financialEligibilityDrafts,
      ).to.deep.equal({ CASE123: {} });
    });

    it("keeps draft answers when the case does not have an eligibility check yet", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: { CASE123: { "has-partner": "yes" } },
        },
      });
      getFinancialEligibilityStub.resolves({ data: null, status: "success" });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("has-partner")).to.equal("yes");
      expect(context.getAnswer("under-18")).to.equal("");
    });

    it("throws when the eligibility check cannot be loaded", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });
      getFinancialEligibilityStub.resolves({
        data: null,
        status: "error",
        message: "Server error",
      });

      let caughtError: Error | undefined;
      try {
        await effects.LoadCaseFinancialEligibility(deps, context);
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError?.message).to.equal(
        "Failed to load financial eligibility for case CASE123: Server error",
      );
      expect(context.getAllAnswers()).to.deep.equal({});
    });

    it("uses a default message when a failed load has no error message", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });
      getFinancialEligibilityStub.resolves({ data: null, status: "error" });

      let caughtError: Error | undefined;
      try {
        await effects.LoadCaseFinancialEligibility(deps, context);
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError?.message).to.equal(
        "Failed to load financial eligibility for case CASE123: unknown error",
      );
    });

    it("sets Forge answers from the mapped API data when no draft answers exist", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });
      getFinancialEligibilityStub.resolves({ data: financialEligibilityData });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("under-18")).to.equal("yes");
      expect(context.getAnswer("under-18-receives-regular-payment")).to.equal(
        "no",
      );
      expect(context.getAnswer("under-18-has-valuables")).to.equal("no");
      expect(context.getAnswer("has-partner")).to.equal("yes");
      expect(context.getAnswer("60-or-over")).to.equal("no");
      expect(context.getAnswer("60-or-over-with-partner")).to.equal("no");
      expect(context.getAnswer("universal-credit")).to.equal("yes");
      expect(context.getAnswer("income-support")).to.equal("no");
      expect(context.getAnswer("income-based-jsa")).to.equal("yes");
      expect(context.getAnswer("pension-credit")).to.equal("no");
      expect(context.getAnswer("employment-support")).to.equal("yes");

      const session = context.getSession() as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts).to.deep.equal({ CASE123: {} });
    });

    it("uses the previously saved draft answer instead of the mapped API value when a draft exists", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: { CASE123: { "under-18": "no" } },
        },
      });
      getFinancialEligibilityStub.resolves({ data: financialEligibilityData });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("under-18")).to.equal("no");
    });

    it("maps income, deductions and dependants data from the API onto their Forge answers", async () => {
      const dataWithIncomeAndDependants = {
        ...financialEligibilityData,
        clientData: {
          ...financialEligibilityData.clientData,
          income: {
            earnings: { amount: 1200, time: "per_week" },
            selfEmploymentDrawings: { amount: 0, time: "per_month" },
            benefits: { amount: 0, time: "per_month" },
            taxCredits: { amount: 0, time: "per_month" },
            maintenanceReceived: { amount: 0, time: "per_month" },
            pension: { amount: 0, time: "per_month" },
            otherIncome: { amount: 0, time: "per_month" },
            selfEmployed: true,
          },
          deductions: {
            incomeTax: { amount: 200, time: "per_month" },
            nationalInsurance: { amount: 100, time: "per_month" },
            mortgage: { amount: 500, time: "per_month" },
            rent: { amount: 300, time: "per_week" },
            maintenance: { amount: 150, time: "per_month" },
            childcare: { amount: 80, time: "per_month" },
            criminalContributions: { amount: 20, time: "per_month" },
          },
        },
        partnerData: {
          ...financialEligibilityData.partnerData,
          partnerIncome: {
            earnings: { amount: 900, time: "per_4week" },
            selfEmploymentDrawings: { amount: 0, time: "per_month" },
            benefits: { amount: 0, time: "per_month" },
            taxCredits: { amount: 0, time: "per_month" },
            maintenanceReceived: { amount: 0, time: "per_month" },
            pension: { amount: 0, time: "per_month" },
            otherIncome: { amount: 0, time: "per_month" },
            selfEmployed: false,
          },
          partnerDeductions: {
            incomeTax: { amount: 50, time: "per_month" },
            nationalInsurance: { amount: 25, time: "per_month" },
            mortgage: { amount: 400, time: "per_month" },
            rent: { amount: 0, time: "per_month" },
            maintenance: { amount: 0, time: "per_month" },
            childcare: { amount: 0, time: "per_month" },
            criminalContributions: { amount: 10, time: "per_month" },
          },
        },
        dependantsOld: 2,
        dependantsYoung: 0,
      };
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });
      getFinancialEligibilityStub.resolves({
        data: dataWithIncomeAndDependants,
      });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("earnings")).to.equal(1200);
      expect(context.getAnswer("earnings-frequency")).to.equal("per_week");
      expect(context.getAnswer("self-employed")).to.equal("yes");
      expect(context.getAnswer("income-tax")).to.equal(200);
      expect(context.getAnswer("national-insurance")).to.equal(100);

      expect(context.getAnswer("earnings-partner")).to.equal(900);
      expect(context.getAnswer("earnings-partner-frequency")).to.equal(
        "per_4week",
      );
      expect(context.getAnswer("self-employed-partner")).to.equal("no");
      expect(context.getAnswer("income-tax-partner")).to.equal(50);
      expect(context.getAnswer("national-insurance-partner")).to.equal(25);

      expect(context.getAnswer("dependants-16-over")).to.equal(2);
      expect(context.getAnswer("dependants-15-under")).to.equal(0);

      expect(context.getAnswer("mortgage")).to.equal(500);
      expect(context.getAnswer("rent")).to.equal(300);
      expect(context.getAnswer("rent-frequency")).to.equal("per_week");
      expect(context.getAnswer("maintenance-paid")).to.equal(150);
      expect(context.getAnswer("childcare-costs")).to.equal(80);
      expect(context.getAnswer("legal-aid-contributions")).to.equal(20);

      expect(context.getAnswer("mortgage-partner")).to.equal(400);
      expect(context.getAnswer("legal-aid-contributions-partner")).to.equal(10);
    });

    it("defaults a money field's frequency answer to `per_month` when no income/deductions data exists yet", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });
      getFinancialEligibilityStub.resolves({ data: financialEligibilityData });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("earnings")).to.equal(null);
      expect(context.getAnswer("earnings-frequency")).to.equal("per_month");
    });

    it("normalises `cla_backend` monetary values before displaying into Forge journey", async () => {
      const dataWithSavings = {
        ...financialEligibilityData,
        clientData: {
          ...financialEligibilityData.clientData,
          savings: {
            bankBalance: 0,
            investmentBalance: 12.5,
            assetBalance: 12,
            creditBalance: 0.0,
          },
        },
      };

      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });

      getFinancialEligibilityStub.resolves({ data: dataWithSavings });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("bank-balance")).to.equal("0");
      expect(context.getAnswer("investment-balance")).to.equal("12.50");
      expect(context.getAnswer("asset-balance")).to.equal("12");
      expect(context.getAnswer("credit-balance")).to.equal("0");
    });
  });

  describe("LoadCaseFinancialEligibility (drafts and property collections)", () => {
    it("normalises a single draft disregard into an array", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: {
            CASE123: { disregards: "grenfell_tower" },
          },
        },
      });
      getFinancialEligibilityStub.resolves({ data: null, status: "success" });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("disregards")).to.deep.equal(["grenfell_tower"]);
      const session = context.getSession() as FinancialEligibilitySession;
      expect(
        session.financialEligibilityDrafts.CASE123.disregards,
      ).to.deep.equal(["grenfell_tower"]);
    });

    it("rebuilds the property collection from indexed draft answers when none is stored yet", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: {
            CASE123: { value_0: "2000", main_0: "yes" },
          },
        },
      });
      getFinancialEligibilityStub.resolves({ data: null, status: "success" });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("propertySet")).to.deep.equal([
        {
          value: "2000",
          "mortgage-left": undefined,
          share: undefined,
          disputed: "",
          main: "yes",
        },
      ]);
    });

    it("uses the property collection already stored in the session", async () => {
      const storedProperties = [
        {
          value: "1000",
          "mortgage-left": "0",
          share: "100",
          disputed: "no",
          main: "yes",
        },
      ];
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: { CASE123: {} },
          casePatternDrafts: {
            CASE123: { properties: { propertySet: storedProperties } },
          },
        },
      });
      getFinancialEligibilityStub.resolves({ data: null, status: "success" });

      await effects.LoadCaseFinancialEligibility(deps, context);

      expect(context.getAnswer("propertySet")).to.deep.equal(storedProperties);
    });

    it("stores the API property collection in the session when none is stored yet", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });
      getFinancialEligibilityStub.resolves({
        status: "success",
        data: {
          specificBenefits: {},
          clientData: {},
          partnerData: {},
          propertySet: [
            {
              value: 150000,
              mortgageLeft: 50000.5,
              share: 100,
              disputed: false,
              main: true,
            },
          ],
        },
      });

      await effects.LoadCaseFinancialEligibility(deps, context);

      const expected = [
        {
          value: 150000,
          "mortgage-left": "50000.50",
          share: 100,
          disputed: "no",
          main: "yes",
        },
      ];
      expect(context.getAnswer("propertySet")).to.deep.equal(expected);
      const session = context.getSession() as FinancialEligibilitySession;
      expect(
        session.casePatternDrafts?.CASE123.properties.propertySet,
      ).to.deep.equal(expected);
    });
  });

  describe("PersistSavedAnswers", () => {
    it("does not call the API when getSession returns no session for the request", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
      });
      withNoSession(context);

      await effects.PersistSavedAnswers(deps, context);

      expect(updateFinancialEligibilityStub.called).to.be.false;
    });

    it("throws a TypeError when the session has not been initialised with a financialEligibilityDrafts object", async () => {
      // Unlike LoadCaseFinancialEligibility, this method does not guard against a missing drafts object
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });
      let thrown: unknown;

      try {
        await effects.PersistSavedAnswers(deps, context);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).to.be.instanceOf(TypeError);
      expect(updateFinancialEligibilityStub.called).to.be.false;
    });

    it("does not call the API when there is no caseId", async () => {
      const context = createTestEffectContext({
        params: {},
        session: { financialEligibilityDrafts: {} },
      });

      await effects.PersistSavedAnswers(deps, context);

      expect(updateFinancialEligibilityStub.called).to.be.false;
    });

    it("submits the saved draft answers for the current case to the API", async () => {
      const axiosMiddleware = { get: sinon.stub() };
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: { CASE123: { "under-18": "yes" } },
        },
        state: { authenticatedAxios: axiosMiddleware },
      });
      updateFinancialEligibilityStub.resolves({});

      await effects.PersistSavedAnswers(deps, context);

      expect(updateFinancialEligibilityStub.calledOnce).to.be.true;
      const [axiosArg, caseIdArg, payloadArg] = updateFinancialEligibilityStub
        .firstCall.args as [unknown, unknown, Record<string, unknown>];
      expect(axiosArg).to.equal(axiosMiddleware);
      expect(caseIdArg).to.equal("CASE123");
      expect(payloadArg.is_you_under_18).to.equal(true);
    });

    it("initialises an empty draft and submits the default payload when no answers have been saved yet", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: { financialEligibilityDrafts: {} },
      });
      updateFinancialEligibilityStub.resolves({});

      await effects.PersistSavedAnswers(deps, context);

      expect(updateFinancialEligibilityStub.calledOnce).to.be.true;
      const [, caseIdArg, payloadArg] = updateFinancialEligibilityStub.firstCall
        .args as [unknown, unknown, Record<string, unknown>];
      expect(caseIdArg).to.equal("CASE123");
      expect(payloadArg.under_18_passported).to.equal(false);
      const session = context.getSession() as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts.CASE123).to.deep.equal({});
    });
  });

  describe("PersistSavedAnswers (property collections and errors)", () => {
    it("submits the property collection stored in the session", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: { CASE123: {} },
          casePatternDrafts: {
            CASE123: {
              properties: {
                propertySet: [
                  {
                    value: "1000",
                    "mortgage-left": "250.5",
                    share: "50",
                    disputed: "no",
                    main: "yes",
                  },
                ],
              },
            },
          },
        },
      });
      updateFinancialEligibilityStub.resolves({ status: "success" });

      await effects.PersistSavedAnswers(deps, context);

      const [, , payloadArg] = updateFinancialEligibilityStub.firstCall
        .args as [unknown, unknown, Record<string, unknown>];
      expect(payloadArg.property_set).to.deep.equal([
        {
          value: 100000,
          mortgage_left: 25050,
          share: 50,
          disputed: false,
          main: true,
        },
      ]);
    });

    it("throws when the API fails to save the answers", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: { CASE123: { "under-18": "yes" } },
        },
      });
      updateFinancialEligibilityStub.resolves({
        status: "error",
        message: "Bad request",
      });

      let caughtError: Error | undefined;
      try {
        await effects.PersistSavedAnswers(deps, context);
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError?.message).to.equal(
        "Failed to update financial eligibility for case CASE123: Bad request",
      );
    });

    it("uses a default message when a failed save has no error message", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: { financialEligibilityDrafts: { CASE123: {} } },
      });
      updateFinancialEligibilityStub.resolves({ status: "error" });

      let caughtError: Error | undefined;
      try {
        await effects.PersistSavedAnswers(deps, context);
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError?.message).to.equal(
        "Failed to update financial eligibility for case CASE123: unknown error",
      );
    });
  });

  describe("ClearDraftAnswers", () => {
    it("does nothing when there is no caseId", async () => {
      const context = createTestEffectContext({
        params: {},
        session: {
          financialEligibilityDrafts: { CASE123: { "under-18": "yes" } },
        },
      });
      const getAllAnswersSpy = sinon.spy(context, "getAllAnswers");

      await effects.ClearDraftAnswers(deps, context);

      const session = context.getSession() as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts.CASE123).to.deep.equal({
        "under-18": "yes",
      });
      expect(getAllAnswersSpy.called).to.be.false;
    });

    it("does nothing when getSession returns no session for the request", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
      });
      withNoSession(context);
      const getAllAnswersSpy = sinon.spy(context, "getAllAnswers");

      await effects.ClearDraftAnswers(deps, context);

      expect(getAllAnswersSpy.called).to.be.false;
    });

    it("throws a TypeError when the session has not been initialised with a financialEligibilityDrafts object", async () => {
      // The `session?.` optional chain only guards a missing session, not a missing financialEligibilityDrafts object
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {},
      });
      let thrown: unknown;

      try {
        await effects.ClearDraftAnswers(deps, context);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).to.be.instanceOf(TypeError);
    });

    it("does nothing when there is no draft for the current case", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: { financialEligibilityDrafts: {} },
      });
      const getAllAnswersSpy = sinon.spy(context, "getAllAnswers");

      await effects.ClearDraftAnswers(deps, context);

      expect(getAllAnswersSpy.called).to.be.false;
    });

    it("deletes the draft answers for the current case", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: { CASE123: { "under-18": "yes" } },
        },
      });
      const getAllAnswersSpy = sinon.spy(context, "getAllAnswers");

      await effects.ClearDraftAnswers(deps, context);

      const session = context.getSession() as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts.CASE123).to.be.undefined;
      expect(getAllAnswersSpy.calledOnce).to.be.true;
    });
  });

  describe("ClearDraftAnswers (property collections)", () => {
    it("also deletes the property collection drafts for the current case", async () => {
      const context = createTestEffectContext({
        params: { caseId: "CASE123" },
        session: {
          financialEligibilityDrafts: { CASE123: { "under-18": "yes" } },
          casePatternDrafts: {
            CASE123: { properties: { propertySet: [] } },
            OTHER: {},
          },
        },
      });

      await effects.ClearDraftAnswers(deps, context);

      const session = context.getSession() as FinancialEligibilitySession;
      expect(session.casePatternDrafts).to.deep.equal({ OTHER: {} });
    });
  });

  describe("SaveNewAnswerIfAnswered", () => {
    it("does nothing when there is no post data", async () => {
      const context = createTestEffectContext({ post: {} });

      await effects.SaveNewAnswerIfAnswered(deps, context);

      expect(context.getAllAnswers()).to.deep.equal({});
    });

    it("does not save an answer when there is no caseId", async () => {
      const context = createTestEffectContext({
        post: { "under-18": "yes" },
        params: {},
      });

      await effects.SaveNewAnswerIfAnswered(deps, context);

      expect(context.getAllAnswers()).to.deep.equal({});
    });

    it("does not save an answer when getSession returns no session for the request", async () => {
      const context = createTestEffectContext({
        post: { "under-18": "yes" },
        params: { caseId: "CASE123" },
      });
      withNoSession(context);

      await effects.SaveNewAnswerIfAnswered(deps, context);

      expect(context.getAllAnswers()).to.deep.equal({});
    });

    it("throws a TypeError when the session has not been initialised with a financialEligibilityDrafts object", async () => {
      const context = createTestEffectContext({
        post: { "under-18": "yes" },
        params: { caseId: "CASE123" },
        session: {},
      });
      let thrown: unknown;

      try {
        await effects.SaveNewAnswerIfAnswered(deps, context);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).to.be.instanceOf(TypeError);
      expect(context.getAllAnswers()).to.deep.equal({});
    });

    it("saves answered fields to the session draft and to Forge, skipping unanswered fields", async () => {
      const context = createTestEffectContext({
        post: {
          "under-18": "yes",
          "has-partner": "",
          "universal-credit": null,
          "income-support": undefined,
        },
        params: { caseId: "CASE123" },
        session: { financialEligibilityDrafts: {} },
      });

      await effects.SaveNewAnswerIfAnswered(deps, context);

      expect(context.getAnswer("under-18")).to.equal("yes");
      expect(context.hasAnswer("has-partner")).to.be.false;
      const session = context.getSession() as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts.CASE123).to.deep.equal({
        "under-18": "yes",
      });
    });

    it("creates a new draft entry for the case when one does not already exist", async () => {
      const context = createTestEffectContext({
        post: { "has-partner": "no" },
        params: { caseId: "CASE456" },
        session: { financialEligibilityDrafts: {} },
      });

      await effects.SaveNewAnswerIfAnswered(deps, context);

      const session = context.getSession() as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts.CASE456).to.deep.equal({
        "has-partner": "no",
      });
      expect(context.getAnswer("has-partner")).to.equal("no");
    });

    it("saves answered fields that relate to monetary fields with decimals", async () => {
      const context = createTestEffectContext({
        post: {
          "bank-balance": "100",
          "mortgage-left_0": "20000",
          value_0: "145000",
        },
        params: { caseId: "CASE456" },
        session: { financialEligibilityDrafts: {} },
      });

      await effects.SaveNewAnswerIfAnswered(deps, context);

      const session = context.getSession() as FinancialEligibilitySession;
      expect(session.financialEligibilityDrafts.CASE456).to.deep.equal({
        "bank-balance": "100.00",
        "mortgage-left_0": "20000.00",
        value_0: "145000.00",
      });
      expect(context.getAnswer("bank-balance")).to.equal("100.00");
      expect(context.getAnswer("mortgage-left_0")).to.equal("20000.00");
      expect(context.getAnswer("value_0")).to.equal("145000.00");
    });
  });
});

describe("SaveNewAnswerIfAnswered (disregards)", () => {
  it("normalises a single selected disregard into an array", async () => {
    const effects = new FinancialEligibilityEffectsWithDepsImpl({});
    const context = createTestEffectContext({
      post: { disregards: "grenfell_tower" },
      params: { caseId: "CASE123" },
      session: { financialEligibilityDrafts: {} },
    });

    await effects.SaveNewAnswerIfAnswered({} as Deps, context);

    expect(context.getAnswer("disregards")).to.deep.equal(["grenfell_tower"]);
    const session = context.getSession() as FinancialEligibilitySession;
    expect(session.financialEligibilityDrafts.CASE123.disregards).to.deep.equal(
      ["grenfell_tower"],
    );
  });
});

describe("mapFinancialEligibilityApiDataToAnswerCodes", () => {
  it("maps an empty eligibility check to unanswered questions with default frequencies", () => {
    const answers = mapFinancialEligibilityApiDataToAnswerCodes(
      transformFinancialEligibilityItem({}),
    );

    expect(answers["has-partner"]).to.equal(null);
    expect(answers["under-18"]).to.equal(null);
    expect(answers.earnings).to.equal(null);
    expect(answers["earnings-frequency"]).to.equal("per_month");
    expect(answers.propertySet).to.deep.equal([]);
  });
});
