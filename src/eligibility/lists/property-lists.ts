import eligibilityCopy from "../locales/en.json" with { type: "json" };
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
    percentage_owned: "amount",
    house_in_dispute: "checkbox",
  } as const;

  return {
    key,
    rowsData: `${key}Rows`,
    fields,
    blankRow: {},
    describeRow: (index, rowCount, answers = {}): RowDescriptor => {
      const position = index + FIRST_POSITION;
      const multiple = rowCount > FIRST_POSITION;
      const formatPosition = (message: string) =>
        message.replace("%1", String(position));

      return {
        index,
        position,
        heading: (subject === "client"
          ? eligibilityCopy.dynamic.property.rowClient
          : eligibilityCopy.dynamic.property.rowPartner
        ).replace("%1", String(position)),
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
            required: multiple
              ? formatPosition(
                  eligibilityCopy.dynamic.property.requiredHouseValueMultiple,
                )
              : eligibilityCopy.dynamic.property.requiredHouseValue,
            notANumber: multiple
              ? formatPosition(
                  eligibilityCopy.dynamic.property.numberHouseValueMultiple,
                )
              : eligibilityCopy.dynamic.property.numberHouseValue,
            greaterThanZero: multiple
              ? formatPosition(
                  eligibilityCopy.dynamic.property.greaterHouseValueMultiple,
                )
              : eligibilityCopy.dynamic.property.greaterHouseValue,
          },
          inline_owned_with_mortgage: {
            required: multiple
              ? formatPosition(
                  eligibilityCopy.dynamic.property
                    .requiredMortgageQuestionMultiple,
                )
              : eligibilityCopy.dynamic.property.requiredMortgageQuestion,
          },
          mortgage: {
            required: multiple
              ? formatPosition(
                  eligibilityCopy.dynamic.property.requiredMortgageMultiple,
                )
              : eligibilityCopy.dynamic.property.requiredMortgage,
            notANumber: multiple
              ? formatPosition(
                  eligibilityCopy.dynamic.property.numberMortgageMultiple,
                )
              : eligibilityCopy.dynamic.property.numberMortgage,
            greaterThanZero: multiple
              ? formatPosition(
                  eligibilityCopy.dynamic.property.greaterMortgageMultiple,
                )
              : eligibilityCopy.dynamic.property.greaterMortgage,
          },
          percentage_owned: {
            required:
              subject === "client"
                ? multiple
                  ? formatPosition(
                      eligibilityCopy.dynamic.property
                        .requiredPercentageClientMultiple,
                    )
                  : eligibilityCopy.dynamic.property.requiredPercentageClient
                : multiple
                  ? formatPosition(
                      eligibilityCopy.dynamic.property
                        .requiredPercentagePartnerMultiple,
                    )
                  : eligibilityCopy.dynamic.property.requiredPercentagePartner,
            withinRange: multiple
              ? formatPosition(
                  eligibilityCopy.dynamic.property.withinRangeMultiple,
                )
              : eligibilityCopy.dynamic.property.withinRange,
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
