import { strict as assert } from "assert";
import { frequencyLabel, frequencyOptions } from "./frequency-copy.js";

describe("eligibility frequency copy", () => {
  it("uses locale labels for dynamic options and summaries", () => {
    const options = frequencyOptions([
      { value: "every_week" },
      { value: "year" },
    ]);

    assert.deepEqual(options, [
      { value: "every_week", text: "Every week" },
      { value: "year", text: "Total in the last year" },
    ]);
    assert.equal(frequencyLabel("total"), "Total in last 3 months");
  });

  it("fails explicitly when a frequency has no locale label", () => {
    assert.equal(frequencyLabel("unknown_frequency"), undefined);
    assert.throws(
      () => frequencyOptions([{ value: "unknown_frequency" }]),
      /Missing eligibility frequency label: unknown_frequency/u,
    );
  });
});
