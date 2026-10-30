import { describe, it } from "mocha";
import { expect } from "chai";
import {
  ALLOWED_LAA_ACCOUNTS,
  EMPTY_LENGTH,
  MS_PER_SECOND,
  INTERNAL_SERVER_ERROR,
  ZERO,
} from "#src/constants.js";

describe("constants", () => {
  describe("ALLOWED_LAA_ACCOUNTS", () => {
    it("is defined and is an array", () => {
      expect(ALLOWED_LAA_ACCOUNTS).to.not.equal(undefined);
      expect(Array.isArray(ALLOWED_LAA_ACCOUNTS)).to.equal(true);
    });

    it("is not empty", () => {
      expect(ALLOWED_LAA_ACCOUNTS.length).to.be.greaterThan(EMPTY_LENGTH);
    });

    it("contains only non-empty strings", () => {
      ALLOWED_LAA_ACCOUNTS.forEach((account) => {
        expect(account).to.be.a("string");
        expect(account.length).to.be.greaterThan(EMPTY_LENGTH);
      });
    });

    it("contains the expected LAA account", () => {
      expect(ALLOWED_LAA_ACCOUNTS).to.include("2Q209V");
    });

    it("does not contain duplicate accounts", () => {
      expect(new Set(ALLOWED_LAA_ACCOUNTS).size).to.equal(
        ALLOWED_LAA_ACCOUNTS.length,
      );
    });

    it("does not contain an unknown account", () => {
      expect(ALLOWED_LAA_ACCOUNTS).to.not.include("NOTALLOWED");
    });
  });

  describe("numeric constants", () => {
    it("exposes the expected values", () => {
      expect(EMPTY_LENGTH).to.equal(0);
      expect(ZERO).to.equal(0);
      expect(MS_PER_SECOND).to.equal(1000);
      expect(INTERNAL_SERVER_ERROR).to.equal(500);
    });
  });
});
