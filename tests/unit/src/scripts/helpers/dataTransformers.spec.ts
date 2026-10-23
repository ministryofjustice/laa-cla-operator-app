/**
 * @description Tests for the utility functions in dataTransformers work as expected
 */

import { expect } from "chai";
import {
  safeString,
  safeOptionalString,
  isRecord,
  safeStringFromRecord,
  hasProperty,
  toBoolean,
  toNumber,
  toYesNo,
  normaliseSelectedKeys,
  formatBooleanToRetainNullValue,
  formatCurrency,
} from "#src/scripts/helpers/dataTransformers.js";

describe("Data Transformation Helpers", () => {
  describe("safeString()", () => {
    it("returns empty string for null or undefined", () => {
      expect(safeString(null)).to.equal("");
      expect(safeString(undefined)).to.equal("");
    });

    it("returns the string unchanged", () => {
      expect(safeString("hello")).to.equal("hello");
    });

    it("converts number and boolean to string", () => {
      expect(safeString(123)).to.equal("123");
      expect(safeString(true)).to.equal("true");
    });

    it("returns empty string for other types", () => {
      expect(safeString({})).to.equal("");
      expect(safeString([])).to.equal("");
      expect(safeString(() => {})).to.equal("");
    });
  });

  describe("safeOptionalString()", () => {
    it("returns undefined for null or undefined", () => {
      expect(safeOptionalString(null)).to.be.undefined;
      expect(safeOptionalString(undefined)).to.be.undefined;
    });

    it("returns string for string values", () => {
      expect(safeOptionalString("world")).to.equal("world");
    });

    it("converts number and boolean to string", () => {
      expect(safeOptionalString(0)).to.equal("0");
      expect(safeOptionalString(false)).to.equal("false");
    });

    it("returns undefined for other types", () => {
      expect(safeOptionalString({})).to.be.undefined;
      expect(safeOptionalString([])).to.be.undefined;
    });
  });

  describe("isRecord()", () => {
    it("returns true for plain objects", () => {
      expect(isRecord({ a: 1 })).to.be.true;
    });

    it("returns false for null, arrays, functions, and primitives", () => {
      expect(isRecord(null)).to.be.false;
      expect(isRecord([])).to.be.false;
      expect(isRecord(() => {})).to.be.false;
      expect(isRecord(123)).to.be.false;
      expect(isRecord("test")).to.be.false;
    });
  });

  describe("safeStringFromRecord()", () => {
    it("returns string value for valid key with non-empty string", () => {
      const obj = { name: "Alice" };
      expect(safeStringFromRecord(obj, "name")).to.equal("Alice");
    });

    it("returns null if key missing or value not a non-empty string", () => {
      const obj = { name: "" };
      expect(safeStringFromRecord(obj, "age")).to.be.null;
      expect(safeStringFromRecord(obj, "name")).to.be.null;
      expect(safeStringFromRecord(null, "name")).to.be.null;
    });
  });

  describe("hasProperty()", () => {
    it("returns true if object has property", () => {
      expect(hasProperty({ foo: 123 }, "foo")).to.be.true;
    });

    it("returns false if not a record or property missing", () => {
      expect(hasProperty(null, "foo")).to.be.false;
      expect(hasProperty({}, "foo")).to.be.false;
      expect(hasProperty([], "foo")).to.be.false;
    });
  });

  describe("toBoolean()", () => {
    it("treats true, 'yes' and 'true' (any case) as true", () => {
      expect(toBoolean(true)).to.equal(true);
      expect(toBoolean("Yes")).to.equal(true);
      expect(toBoolean("TRUE")).to.equal(true);
    });

    it("treats everything else as false", () => {
      expect(toBoolean(false)).to.equal(false);
      expect(toBoolean("no")).to.equal(false);
      expect(toBoolean(null)).to.equal(false);
      expect(toBoolean(1)).to.equal(false);
    });
  });

  describe("toNumber()", () => {
    it("converts numeric values", () => {
      expect(toNumber("12.5")).to.equal(12.5);
      expect(toNumber(3)).to.equal(3);
    });

    it("returns 0 for non-numeric values", () => {
      expect(toNumber("abc")).to.equal(0);
      expect(toNumber(undefined)).to.equal(0);
    });
  });

  describe("toYesNo()", () => {
    it("maps truthy values to 'yes'", () => {
      expect(toYesNo(true)).to.equal("yes");
      expect(toYesNo("TRUE")).to.equal("yes");
    });

    it("maps falsy values to 'no'", () => {
      expect(toYesNo(false)).to.equal("no");
      expect(toYesNo("No")).to.equal("no");
      expect(toYesNo("false")).to.equal("no");
    });

    it("returns an empty string for unknown values", () => {
      expect(toYesNo(null)).to.equal("");
      expect(toYesNo(undefined)).to.equal("");
      expect(toYesNo("maybe")).to.equal("");
    });
  });

  describe("normaliseSelectedKeys()", () => {
    it("keeps string entries from an array", () => {
      expect(normaliseSelectedKeys(["a", 1, "b"])).to.deep.equal(["a", "b"]);
    });

    it("returns the truthy keys from an object map", () => {
      expect(normaliseSelectedKeys({ a: true, b: false, c: 1 })).to.deep.equal([
        "a",
        "c",
      ]);
    });

    it("returns an empty array for other values", () => {
      expect(normaliseSelectedKeys("a")).to.deep.equal([]);
      expect(normaliseSelectedKeys(null)).to.deep.equal([]);
    });
  });

  describe("formatBooleanToRetainNullValue()", () => {
    it("keeps null and undefined as null", () => {
      expect(formatBooleanToRetainNullValue(null)).to.equal(null);
      expect(formatBooleanToRetainNullValue(undefined)).to.equal(null);
    });

    it("converts other values to booleans", () => {
      expect(formatBooleanToRetainNullValue(0)).to.equal(false);
      expect(formatBooleanToRetainNullValue("x")).to.equal(true);
    });
  });

  describe("formatCurrency()", () => {
    it("drops pence for whole pounds", () => {
      expect(formatCurrency(1500)).to.equal("£1,500");
      expect(formatCurrency("20")).to.equal("£20");
    });

    it("shows two decimal places otherwise", () => {
      expect(formatCurrency(12.5)).to.equal("£12.50");
      expect(formatCurrency("0.1")).to.equal("£0.10");
    });
  });
});
