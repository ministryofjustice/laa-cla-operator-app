// The vehicle steps, as CCQ's `VehicleForm` and `VehiclesDetailsForm`: a
// yes/no question, then a row of details for each vehicle.
import eligibilityCopy from "../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
  type BlockDefinition,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKCheckboxInput,
  GovUKDetails,
  GovUKRadioInput,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Answer,
  Condition,
  Data,
  Item,
  Iterator,
  Self,
  validation,
  when,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  amountValidations,
  type AmountMessages,
} from "./amount-validation.js";
import { VEHICLES_LIST } from "../lists/index.js";

const { vehicles: wording } = eligibilityCopy.dynamic;
const hasPartner = Answer("partner").match(Condition.Equals("true"));

const yesNo = [
  { value: "true", text: eligibilityCopy.yes },
  { value: "false", text: eligibilityCopy.no },
];

/**
 * The current row's code for a field.
 * @param {string} field - the row field
 * @returns {ReturnType<ReturnType<typeof Item>["path"]>} the code reference
 */
const rowCode = (field: string): ReturnType<ReturnType<typeof Item>["path"]> =>
  Item().path(`codes.${field}`);
/**
 * The current row's message for a field's check.
 * @param {string} field - the row field
 * @param {string} check - the check, as named in the row's messages
 * @returns {ReturnType<ReturnType<typeof Item>["path"]>} the message reference
 */
const rowMessage = (
  field: string,
  check: string,
): ReturnType<ReturnType<typeof Item>["path"]> =>
  Item().path(`messages.${field}.${check}`);

/**
 * The row field's required-answer check.
 * @param {string} field - the row field
 * @returns {Array<ReturnType<typeof validation>>} the check
 */
const rowRequired = (field: string): Array<ReturnType<typeof validation>> => [
  validation({
    condition: Self().match(Condition.IsRequired()),
    message: rowMessage(field, "required"),
  }),
];

/**
 * The row amount field's validation messages.
 * @param {string} field - the row field
 * @returns {AmountMessages} the messages
 */
const amountMessages = (field: string): AmountMessages => ({
  required: rowMessage(field, "required"),
  notANumber: rowMessage(field, "notANumber"),
  outOfRange: rowMessage(field, "outOfRange"),
});

export const vehiclesBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "vehicle_owned",
      fieldset: {
        legend: {
          text: when(hasPartner)
            .then(wording.ownedLegendWithPartner)
            .else(wording.ownedLegendWithoutPartner),
          classes: "govuk-fieldset__legend--xl",
          isPageHeading: true,
        },
      },
      hint: when(hasPartner).then("").else(wording.ownedHint),
      items: yesNo,
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: wording.ownedRequired,
        }),
      ],
    }),
    GovUKButton({ text: eligibilityCopy.save_and_continue }),
  ],
});

/**
 * One vehicle's details. The payments left are only asked, checked and kept
 * when there are payments left, and the dispute answer only when SMOD
 * applies.
 * @returns {BlockDefinition} the row
 */
function vehicleRow(): BlockDefinition {
  const rowSmodApplies = Item()
    .path("smodApplicable")
    .match(Condition.Equals(true));
  return CollectionBlock({
    classes: "vehicle-row govuk-!-margin-bottom-6",
    collection: [
      HtmlBlock({
        tag: "h2",
        content: Item().path("heading"),
        classes: "govuk-heading-m",
      }),
      GovUKButton({
        name: "remove",
        value: Item().path("index"),
        text: eligibilityCopy.remove,
        classes: "govuk-button--secondary",
        visibleWhen: Item().path("removable"),
      }),
      GovUKTextInput({
        code: rowCode("vehicle_value"),
        label: { text: wording.valueLabel, classes: "govuk-label--s" },
        hint: { text: wording.valueHint },
        prefix: { text: eligibilityCopy.copy },
        classes: "govuk-input--width-5",
        validWhen: amountValidations(
          amountMessages("vehicle_value"),
          POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
        ),
      }),
      GovUKRadioInput({
        code: rowCode("vehicle_pcp"),
        fieldset: {
          legend: {
            text: wording.pcpLegend,
            classes: "govuk-fieldset__legend--s",
          },
        },
        hint: { text: wording.pcpHint },
        items: [
          {
            value: "true",
            text: eligibilityCopy.yes,
            block: GovUKTextInput({
              code: rowCode("vehicle_finance"),
              label: { text: wording.financeLabel },
              prefix: { text: eligibilityCopy.copy },
              classes: "govuk-input--width-5",
              dependentWhen: Answer(rowCode("vehicle_pcp")).match(
                Condition.Equals("true"),
              ),
              validWhen: amountValidations(
                amountMessages("vehicle_finance"),
                POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
              ),
            }),
          },
          { value: "false", text: eligibilityCopy.no },
        ],
        validWhen: rowRequired("vehicle_pcp"),
      }),
      GovUKRadioInput({
        code: rowCode("vehicle_over_3_years_ago"),
        fieldset: {
          legend: {
            text: wording.overThreeYearsLegend,
            classes: "govuk-fieldset__legend--s",
          },
        },
        items: yesNo,
        validWhen: rowRequired("vehicle_over_3_years_ago"),
      }),
      GovUKRadioInput({
        code: rowCode("vehicle_in_regular_use"),
        fieldset: {
          legend: {
            text: wording.regularUseLegend,
            classes: "govuk-fieldset__legend--s",
          },
        },
        hint: { text: wording.regularUseHint },
        items: yesNo,
        validWhen: rowRequired("vehicle_in_regular_use"),
      }),
      GovUKCheckboxInput({
        code: rowCode("vehicle_in_dispute"),
        visibleWhen: rowSmodApplies,
        dependentWhen: rowSmodApplies,
        items: [
          {
            value: "true",
            text: eligibilityCopy.this_asset_is_a_subject_matter_of_dispute,
          },
        ],
      }),
      GovUKDetails({
        summaryText: eligibilityCopy.help_with_subject_matter_of_dispute,
        html: eligibilityCopy.p_class_govuk_body_any_asset_owned_or_partially_owned_b_91ffa8b450,
        visibleWhen: rowSmodApplies,
      }),
    ],
  });
}

export const vehicleDetailsBlocks: BlockDefinition[] = [
  HtmlBlock({
    tag: "h1",
    content: wording.heading,
    classes: "govuk-heading-xl",
  }),
  CollectionBlock({
    collection: Data(VEHICLES_LIST.rowsData).each(Iterator.Map(vehicleRow())),
  }),
  GovUKButton({
    name: "action",
    value: "add",
    text: wording.add,
    classes: "govuk-button--secondary",
  }),
  GovUKButton({ text: eligibilityCopy.save_and_continue }),
];
