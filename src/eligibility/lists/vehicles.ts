import eligibilityCopy from "../locales/en.json" with { type: "json" };
import { smodApplicable } from "../domain/logic.js";
import type { AddAnotherList, RowDescriptor } from "./add-another.js";
import { FIRST_ROW, rowFieldCode } from "./add-another.js";

const FIRST_POSITION = 1;
const KEY = "vehicles";

const FIELDS = {
  vehicle_value: "amount",
  vehicle_pcp: "boolean",
  vehicle_finance: "amount",
  vehicle_over_3_years_ago: "boolean",
  vehicle_in_regular_use: "boolean",
  vehicle_in_dispute: "checkbox",
} as const;

/** The client's (and partner's) vehicles, as CCQ's `VehicleModel` rows. */
export const VEHICLES_LIST: AddAnotherList = {
  key: KEY,
  rowsData: "vehicleRows",
  fields: FIELDS,
  blankRow: {},
  /**
   * Describes one row, with messages naming its position if there are several.
   * @param {number} index - the row's index
   * @param {number} rowCount - how many rows there are
   * @param {Record<string, unknown>} [answers] - the saved answers
   * @returns {RowDescriptor} the row
   */
  describeRow: (index, rowCount, answers = {}): RowDescriptor => {
    const position = index + FIRST_POSITION;
    const many = rowCount > FIRST_POSITION;
    const { vehicles: wording } = eligibilityCopy.dynamic;
    /**
     * The single-row message, or the many-row one naming this row.
     * @param {string} single - the message for a single row
     * @param {string} multiple - the message with `%1` for the position
     * @returns {string} the message
     */
    const pick = (single: string, multiple: string): string =>
      many ? multiple.replace("%1", String(position)) : single;
    return {
      index,
      position,
      heading: wording.rowHeading.replace("%1", String(position)),
      removable: index > FIRST_ROW,
      smodApplicable: smodApplicable(answers),
      codes: Object.fromEntries(
        Object.keys(FIELDS).map((field) => [
          field,
          rowFieldCode(KEY, index, field),
        ]),
      ),
      messages: {
        vehicle_value: {
          required: pick(wording.valueRequired, wording.valueRequiredMany),
          notANumber: pick(wording.valueNumber, wording.valueNumberMany),
          outOfRange: pick(
            wording.valueGreaterThanZero,
            wording.valueGreaterThanZeroMany,
          ),
        },
        vehicle_pcp: {
          required: pick(wording.pcpRequired, wording.pcpRequiredMany),
        },
        vehicle_finance: {
          required: pick(wording.financeRequired, wording.financeRequiredMany),
          notANumber: pick(wording.financeNumber, wording.financeNumberMany),
          outOfRange: pick(
            wording.financeGreaterThanZero,
            wording.financeGreaterThanZeroMany,
          ),
        },
        vehicle_over_3_years_ago: {
          required: pick(
            wording.overThreeYearsRequired,
            wording.overThreeYearsRequiredMany,
          ),
        },
        vehicle_in_regular_use: {
          required: pick(
            wording.regularUseRequired,
            wording.regularUseRequiredMany,
          ),
        },
      },
    };
  },
};
