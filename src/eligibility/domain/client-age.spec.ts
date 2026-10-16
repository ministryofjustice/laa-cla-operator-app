import { strict as assert } from "assert";
import { clientAge, withClientAge } from "./client-age.js";
import { CLIENT_AGE } from "./logic.js";

const TODAY = new Date(Date.UTC(2024, 5, 1));

describe("domain/client-age (CCQ's client_age, derived from date of birth)", () => {
  it("is under 18 until the 18th birthday", () => {
    assert.equal(clientAge("2006-06-02", TODAY), CLIENT_AGE.UNDER_18);
    assert.equal(clientAge("2006-06-01", TODAY), CLIENT_AGE.STANDARD);
  });

  it("is over 60 from the 60th birthday", () => {
    assert.equal(clientAge("1964-06-02", TODAY), CLIENT_AGE.STANDARD);
    assert.equal(clientAge("1964-06-01", TODAY), CLIENT_AGE.OVER_60);
  });

  it("adds client_age to answers that have a date of birth", () => {
    assert.deepEqual(withClientAge({ date_of_birth: "2010-01-01" }, TODAY), {
      date_of_birth: "2010-01-01",
      client_age: CLIENT_AGE.UNDER_18,
    });
  });

  it("leaves answers without a date of birth unchanged", () => {
    assert.deepEqual(withClientAge({ partner: false }, TODAY), {
      partner: false,
    });
  });
});
