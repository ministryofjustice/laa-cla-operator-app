import eligibilityCopy from "../locales/en.json" with { type: "json" };

const FREQUENCY_LABELS: Readonly<Partial<Record<string, string>>> = {
  every_week: eligibilityCopy.frequency_every_week,
  every_two_weeks: eligibilityCopy.frequency_every_two_weeks,
  every_four_weeks: eligibilityCopy.frequency_every_four_weeks,
  monthly: eligibilityCopy.frequency_monthly,
  three_months: eligibilityCopy.frequency_three_months,
  year: eligibilityCopy.frequency_year,
  total: eligibilityCopy.frequency_total,
};

/**
 * Gets the locale label for a frequency code.
 * @param {unknown} value - the frequency code
 * @returns {string | undefined} the label, if the code is known
 */
export function frequencyLabel(value: unknown): string | undefined {
  return typeof value === "string" ? FREQUENCY_LABELS[value] : undefined;
}

/**
 * Adds locale labels to frequency option values.
 * @param {ReadonlyArray<{ value: string }>} options - the frequency values
 * @returns {Array<{ value: string; text: string }>} the labelled options
 */
export function frequencyOptions(
  options: ReadonlyArray<{ value: string }>,
): Array<{ value: string; text: string }> {
  return options.map(({ value }) => {
    const { [value]: text } = FREQUENCY_LABELS;
    if (text === undefined) {
      throw new Error(`Missing eligibility frequency label: ${value}`);
    }
    return { value, text };
  });
}
