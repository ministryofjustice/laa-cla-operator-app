import { smodApplicable } from "../domain/logic.js";
import type { Answers } from "../domain/logic.js";
import type { AddAnotherList, RowDescriptor } from "./add-another.js";
import { FIRST_ROW, rowFieldCode } from "./add-another.js";

const FIRST_POSITION = 1;

function createPropertyList(
  key: string,
  ownershipKey: string,
  subject: "client" | "partner",
): AddAnotherList {
  const fields = {
    house_value: "amount",
    inline_owned_with_mortgage: "boolean",
    mortgage: "amount",
    percentage_owned: "text",
    house_in_dispute: "checkbox",
  } as const;

  return {
    key,
    rowsData: `${key}Rows`,
    fields,
    blankRow: {},
    describeRow: (index, rowCount, answers = {}): RowDescriptor => {
      const position = index + FIRST_POSITION;
      const name = "property, holiday home or land";
      const multiple = rowCount > FIRST_POSITION;

      return {
        index,
        position,
        heading: `${subject === "client" ? "Other" : "Partner's other"} ${name} ${position}`,
        removable: index > FIRST_ROW,
        showInlineMortgageOwnershipQuestion: index > FIRST_ROW,
        ownedWithMortgage:
          index === FIRST_ROW && answers[ownershipKey] === "with_mortgage",
        smodApplicable: subject === "client" && smodApplicable(answers),
        codes: Object.fromEntries(
          Object.keys(fields).map((field) => [
            field,
            rowFieldCode(key, index, field),
          ]),
        ),
        messages: {
          house_value: {
            required: `Enter how much the ${name} is worth${multiple ? ` for property ${position}` : ""}`,
            notANumber: `The value of the ${name} must be a number${multiple ? ` for property ${position}` : ""}`,
            greaterThanZero: `The value of the ${name} must be more than 0${multiple ? ` for property ${position}` : ""}`,
          },
          inline_owned_with_mortgage: {
            required: `Select whether there is an outstanding mortgage${multiple ? ` for property ${position}` : ""}`,
          },
          mortgage: {
            required: `Enter the value of the outstanding mortgage${multiple ? ` for property ${position}` : ""}`,
            notANumber: `The outstanding mortgage must be a number${multiple ? ` for property ${position}` : ""}`,
            greaterThanZero: `The outstanding mortgage must be more than 0${multiple ? ` for property ${position}` : ""}`,
          },
          percentage_owned: {
            required: `Enter what percentage${multiple ? ` of property ${position}` : ""} ${subject === "client" ? "your client" : "the partner"} owns`,
            withinRange: `Enter a whole number between 1 and 100${multiple ? ` for property ${position}` : ""}`,
          },
        },
      };
    },
  };
}

export const ADDITIONAL_PROPERTIES_LIST = createPropertyList(
  "additional_properties",
  "additional_property_owned",
  "client",
);

export const PARTNER_ADDITIONAL_PROPERTIES_LIST = createPropertyList(
  "partner_additional_properties",
  "partner_additional_property_owned",
  "partner",
);
