// Port of CCQ's `Cfe::AssetsPayloadService` + `CfeParamBuilders::Capitals`.
// The capitals builder and the "owned with mortgage" resolution are also
// reused by partner.ts, which has its own (simpler) capitals and additional
// properties sections.
import type { Answers } from "../logic.js";
import { asArray, assumeType } from "./types.js";
import type {
  AdditionalPropertyItem,
  BankAccount,
  CapitalPayload,
  CapitalsPayload,
  PartnerPropertyPayload,
  PropertiesPayload,
  PropertyPayload,
} from "./types.js";

const FIRST_INDEX = 0;
const ZERO = 0;
const LIQUID_ASSET = "Liquid Asset";
const NON_LIQUID_ASSET = "Non Liquid Asset";

/** The subset of a client's or partner's assets answers the capitals builder reads. */
export interface CapitalsAnswers {
  investments: number;
  valuables: number;
  investments_in_dispute?: boolean;
  valuables_in_dispute?: boolean;
  bank_accounts?: BankAccount[];
}

/**
 * Builds the `capitals` section (bank accounts plus non-liquid assets) for a
 * client or partner. Ported from `CfeParamBuilders::Capitals.call`.
 * @param {CapitalsAnswers} form - the relevant assets answers
 * @param {boolean} smodApplicable - whether disputed assets can be flagged
 * @returns {CapitalsPayload} the capitals section
 */
export function buildCapitals(
  form: CapitalsAnswers,
  smodApplicable: boolean,
): CapitalsPayload {
  const bankAccounts: CapitalPayload[] = asArray<BankAccount>(
    form.bank_accounts,
  )
    .filter((account) => account.amount > ZERO)
    .map((account) => ({
      value: account.amount,
      description: LIQUID_ASSET,
      subject_matter_of_dispute:
        smodApplicable && account.account_in_dispute === true,
    }));

  const nonLiquidCapital: CapitalPayload[] = [
    {
      value: form.investments,
      description: NON_LIQUID_ASSET,
      subject_matter_of_dispute:
        smodApplicable && form.investments_in_dispute === true,
    },
    {
      value: form.valuables,
      description: NON_LIQUID_ASSET,
      subject_matter_of_dispute:
        smodApplicable && form.valuables_in_dispute === true,
    },
  ].filter((capital) => capital.value > ZERO);

  return { bank_accounts: bankAccounts, non_liquid_capital: nonLiquidCapital };
}

/**
 * Whether a capitals section has anything in it, matching CCQ's check before
 * including an empty `capitals` key in the payload.
 * @param {CapitalsPayload} capitals - a built capitals section
 * @returns {boolean} whether the section has any entries
 */
export function capitalsPresent(capitals: CapitalsPayload): boolean {
  return (
    capitals.bank_accounts.length > ZERO ||
    capitals.non_liquid_capital.length > ZERO
  );
}

/** The subset of a client's assets answers the capitals builder reads. */
interface ClientAssetsAnswers extends CapitalsAnswers {
  investments_in_dispute?: boolean;
  valuables_in_dispute?: boolean;
}

/**
 * Builds the `capitals` section of a CFE payload for the client, if the
 * client's assets are relevant and non-empty. Ported from the `capitals`
 * method of `Cfe::AssetsPayloadService`.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @param {boolean} smodApplicable - whether disputed assets can be flagged
 * @returns {CapitalsPayload | undefined} the capitals section, if relevant
 */
export function buildCapitalsSection(
  answers: Answers,
  relevantSteps: Set<string>,
  smodApplicable: boolean,
): CapitalsPayload | undefined {
  if (!relevantSteps.has("assets")) return undefined;

  const capitals = buildCapitals(
    assumeType<ClientAssetsAnswers>(answers),
    smodApplicable,
  );
  return capitalsPresent(capitals) ? capitals : undefined;
}

/**
 * Ported from `AdditionalPropertyModel#owned_with_mortgage?`: row 0 takes its
 * answer from the step-level ownership question; every other row takes its
 * own `inline_owned_with_mortgage` answer.
 * @param {AdditionalPropertyItem} item - one additional-property row
 * @param {number} index - the row's position in the list
 * @param {unknown} ownershipAnswer - the step-level `..._additional_property_owned` answer
 * @returns {boolean} whether this property is owned with a mortgage
 */
export function resolveOwnedWithMortgage(
  item: AdditionalPropertyItem,
  index: number,
  ownershipAnswer: unknown,
): boolean {
  if (index === FIRST_INDEX) return ownershipAnswer === "with_mortgage";
  return item.inline_owned_with_mortgage === true;
}

/**
 * The outstanding mortgage to report for a property, which is only ever
 * non-zero when the property is owned with a mortgage.
 * @param {boolean} ownedWithMortgage - whether the property is owned with a mortgage
 * @param {number} [mortgage] - the mortgage amount, if any
 * @returns {number} the outstanding mortgage to report
 */
function resolveOutstandingMortgage(
  ownedWithMortgage: boolean,
  mortgage?: number,
): number {
  return ownedWithMortgage ? (mortgage ?? ZERO) : ZERO;
}

/**
 * Builds the client's additional properties, if relevant. Ported from the
 * `additional_property_details` branch of `AssetsPayloadService#properties`.
 * @param {Answers} answers - the saved answers
 * @param {boolean} smodApplicable - whether disputed assets can be flagged
 * @returns {PropertyPayload[]} the additional properties
 */
function buildAdditionalProperties(
  answers: Answers,
  smodApplicable: boolean,
): PropertyPayload[] {
  return asArray<AdditionalPropertyItem>(answers.additional_properties).map(
    (item, index) => {
      const ownedWithMortgage = resolveOwnedWithMortgage(
        item,
        index,
        answers.additional_property_owned,
      );
      return {
        value: item.house_value,
        outstanding_mortgage: resolveOutstandingMortgage(
          ownedWithMortgage,
          item.mortgage,
        ),
        percentage_owned: item.percentage_owned,
        subject_matter_of_dispute:
          item.house_in_dispute === true && smodApplicable,
        shared_with_housing_assoc: false,
      };
    },
  );
}

/** The subset of the main property's answers the properties builder reads. */
interface MainHomeAnswers {
  house_value: number;
  mortgage?: number;
  percentage_owned: number;
  house_in_dispute?: boolean;
  property_owned: unknown;
}

/**
 * Builds the client's main home. Ported from the `property_entry` branch of
 * `AssetsPayloadService#properties`.
 * @param {MainHomeAnswers} form - the main property's answers
 * @param {boolean} smodApplicable - whether disputed assets can be flagged
 * @returns {PropertyPayload} the main home
 */
function buildMainHome(
  form: MainHomeAnswers,
  smodApplicable: boolean,
): PropertyPayload {
  const ownedWithMortgage = form.property_owned === "with_mortgage";
  const sharedOwnership = form.property_owned === "shared_ownership";
  return {
    value: form.house_value,
    outstanding_mortgage: resolveOutstandingMortgage(
      ownedWithMortgage || sharedOwnership,
      form.mortgage,
    ),
    percentage_owned: form.percentage_owned,
    subject_matter_of_dispute: form.house_in_dispute === true && smodApplicable,
    shared_with_housing_assoc: sharedOwnership,
  };
}

const DEFAULT_MAIN_HOME: PropertyPayload = {
  value: ZERO,
  outstanding_mortgage: ZERO,
  percentage_owned: ZERO,
  subject_matter_of_dispute: false,
  shared_with_housing_assoc: false,
};

/**
 * Builds the `properties` section of a CFE payload, if the client's main
 * property or any additional property is relevant.
 * @param {Answers} answers - the saved answers
 * @param {Set<string>} relevantSteps - the currently relevant step codes
 * @param {boolean} smodApplicable - whether disputed assets can be flagged
 * @returns {PropertiesPayload | undefined} the properties section, if relevant
 */
export function buildProperties(
  answers: Answers,
  relevantSteps: Set<string>,
  smodApplicable: boolean,
): PropertiesPayload | undefined {
  const additionalProperties = relevantSteps.has("additional_property_details")
    ? buildAdditionalProperties(answers, smodApplicable)
    : undefined;

  const mainHome = relevantSteps.has("property_entry")
    ? buildMainHome(assumeType<MainHomeAnswers>(answers), smodApplicable)
    : undefined;

  if (mainHome === undefined && additionalProperties === undefined) {
    return undefined;
  }

  const properties: PropertiesPayload = {
    main_home: mainHome ?? DEFAULT_MAIN_HOME,
  };
  if (additionalProperties !== undefined) {
    properties.additional_properties = additionalProperties;
  }
  return properties;
}

/**
 * Builds the partner's additional properties. Ported from
 * `PartnerPayloadService#additional_properties` — note the partner's rows
 * never carry a `subject_matter_of_dispute` key at all.
 * @param {Answers} answers - the saved answers
 * @returns {PartnerPropertyPayload[]} the partner's additional properties
 */
export function buildPartnerAdditionalProperties(
  answers: Answers,
): PartnerPropertyPayload[] {
  return asArray<AdditionalPropertyItem>(
    answers.partner_additional_properties,
  ).map((item, index) => {
    const ownedWithMortgage = resolveOwnedWithMortgage(
      item,
      index,
      answers.partner_additional_property_owned,
    );
    return {
      value: item.house_value,
      outstanding_mortgage: resolveOutstandingMortgage(
        ownedWithMortgage,
        item.mortgage,
      ),
      percentage_owned: item.percentage_owned,
      shared_with_housing_assoc: false,
    };
  });
}
