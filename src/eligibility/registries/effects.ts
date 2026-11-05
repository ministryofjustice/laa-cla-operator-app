import eligibilityCopy from "../locales/en.json" with { type: "json" };
import {
  EffectRegistry,
  type EffectFunctionContext,
  type EffectFunctionExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EligibilityDeps, AnswerStore } from "../ports/index.js";
import { getAuthenticatedAxios } from "#src/journeys/helpers/effectHelpers.js";
import {
  cannotUseService,
  stepsFor,
  relevantAnswers,
} from "../domain/navigation.js";
import { withClientAge } from "../domain/client-age.js";
import { smodApplicable, type Answers } from "../domain/logic.js";
import { frequencyOptionsFor } from "../domain/frequency-options.js";
import { frequencyOptions } from "../journey/frequency-copy.js";
import { eligibleForChildcareCosts } from "../domain/childcare-eligibility.js";
import { ADD_ANOTHER_LISTS, listFor } from "../lists/index.js";
import {
  collapseLists,
  describeRows,
  formAnswersFor,
  withBlankRow,
  withoutRow,
} from "../lists/add-another.js";
import { loadBenefitTypeOptions } from "./benefit-types.js";
import { publishDependantsFormData } from "./dependant-effects.js";
import { withFormAliases } from "./field-aliases.js";
import { toDomainAnswers, toFormAnswer } from "./answer-conversion.js";

export { toDomainAnswers } from "./answer-conversion.js";

const NEXT_STEP_OFFSET = 1;

// Journey steps outside the domain's step list
const CHECK_YOUR_ANSWERS_PATH = "check-your-answers";
const CANNOT_USE_SERVICE_PATH = "cannot-use-service";
/**
 * The URL path segment for a step code.
 * @param {string} step - a step code
 * @returns {string} the step's path segment
 */
function toPath(step: string): string {
  return step.replace(/_/gu, "-");
}

/**
 * Today's date, as the UTC midnight instant the domain's date logic expects.
 * @returns {Date} today at UTC midnight
 */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Where a step goes once answered: off the service for an unsupported
 * route, otherwise to the next relevant step, or to check your answers
 * after the last one.
 * @param {Answers} answers - all saved answers
 * @param {string} step - the answered step code
 * @param {string | undefined} nextStep - the next relevant step code, if any
 * @returns {string} the path segment to go to
 */
function nextPath(
  answers: Answers,
  step: string,
  nextStep: string | undefined,
): string {
  if (cannotUseService(answers, step)) return CANNOT_USE_SERVICE_PATH;
  return nextStep === undefined ? CHECK_YOUR_ANSWERS_PATH : toPath(nextStep);
}

/**
 * Publishes the next-step map that each step's redirect reads via
 * `Data("nav.<step>")`, and that Forge's reachability walk follows.
 * Computed from all saved answers, as CCQ does: the section logic already
 * ignores answers for branches the client is no longer on.
 * @param {EffectFunctionContext} context - the effect context
 * @param {Answers} answers - all saved answers
 */
function publishNavigation(
  context: EffectFunctionContext,
  answers: Answers,
): void {
  const domainAnswers = withClientAge(answers, todayUtc());
  const steps = stepsFor(domainAnswers);
  const navigationMap = Object.fromEntries(
    steps.map((step, index) => [
      step,
      nextPath(domainAnswers, step, steps.at(index + NEXT_STEP_OFFSET)),
    ]),
  );

  context.setData("nav", navigationMap);
  context.setData("steps", steps);
}

/**
 * Publishes the option lists that depend on the level of help, for the
 * income forms' radios to read via `Data(...)`.
 * @param {EffectFunctionContext} context - the effect context
 * @param {Answers} answers - all saved answers
 */
function publishFrequencyOptions(
  context: EffectFunctionContext,
  answers: Answers,
): void {
  const options = frequencyOptionsFor(answers);
  context.setData("benefitFrequencyOptions", frequencyOptions(options.benefit));
  context.setData("incomeFrequencyOptions", frequencyOptions(options.income));
  context.setData(
    "otherIncomeFrequencyOptions",
    frequencyOptions(options.otherIncome),
  );
  context.setData(
    "outgoingsFrequencyOptions",
    frequencyOptions(options.outgoings),
  );
  context.setData(
    "dependantIncomeFrequencyOptions",
    frequencyOptions(options.dependantIncome),
  );
}

/**
 * Publishes whether the outgoings forms ask about childcare. See
 * `eligibleForChildcareCosts`.
 * @param {EffectFunctionContext} context - the effect context
 * @param {Answers} answers - all saved answers
 */
function publishOutgoingsFormData(
  context: EffectFunctionContext,
  answers: Answers,
): void {
  context.setData(
    "showChildcare",
    eligibleForChildcareCosts(toDomainAnswers(answers), todayUtc()),
  );
}

/**
 * Publishes the housing costs wording that depends on whether there is a
 * partner, as CCQ's housing costs views do.
 * @param {EffectFunctionContext} context - the effect context
 * @param {Answers} answers - all saved answers
 */
function publishHousingFormData(
  context: EffectFunctionContext,
  answers: Answers,
): void {
  const hasPartner = toDomainAnswers(answers).partner === true;
  context.setData("housingHasPartner", hasPartner);
  context.setData(
    "housingBenefitHint",
    hasPartner
      ? eligibilityCopy.dynamic.housing.benefitHintWithPartner
      : eligibilityCopy.dynamic.housing.benefitHintWithoutPartner,
  );
  context.setData(
    "sharedOwnershipHousingBenefitLegend",
    hasPartner
      ? eligibilityCopy.dynamic.housing.benefitLegendWithPartner
      : eligibilityCopy.dynamic.housing.benefitLegendWithoutPartner,
  );
}

function publishPropertyFormData(
  context: EffectFunctionContext,
  answers: Answers,
): void {
  const domainAnswers = toDomainAnswers(answers);
  const hasPartner = domainAnswers.partner === true;
  context.setData(
    "propertyOwnedLegend",
    hasPartner
      ? eligibilityCopy.dynamic.housing.propertyOwnedLegendWithPartner
      : eligibilityCopy.dynamic.housing.propertyOwnedLegendWithoutPartner,
  );
  context.setData(
    "propertyEntryHint",
    hasPartner
      ? eligibilityCopy.dynamic.housing.propertyEntryHintWithPartner
      : eligibilityCopy.dynamic.housing.propertyEntryHintWithoutPartner,
  );
  context.setData(
    "propertyPercentageHint",
    hasPartner
      ? eligibilityCopy.dynamic.housing.propertyPercentageHintWithPartner
      : "",
  );
  context.setData("smodApplicable", smodApplicable(domainAnswers));
}

/**
 * Publishes whether the client and partner are self-employed, for the
 * business capital guidance on the assets forms, as CCQ's assets view does.
 * @param {EffectFunctionContext} context - the effect context
 * @param {Answers} answers - all saved answers
 */
function publishAssetsFormData(
  context: EffectFunctionContext,
  answers: Answers,
): void {
  /**
   * Whether any income row is self-employment.
   * @param {unknown} rows - a saved incomes list
   * @returns {boolean} whether the rows include self-employment
   */
  const selfEmployed = (rows: unknown): boolean =>
    Array.isArray(rows) &&
    rows.some(
      (row: unknown) =>
        typeof row === "object" &&
        row !== null &&
        "income_type" in row &&
        row.income_type === "self_employment",
    );
  context.setData("clientSelfEmployed", selfEmployed(answers.incomes));
  context.setData("partnerSelfEmployed", selfEmployed(answers.partner_incomes));
}

/**
 * Populates each add-another list's rows, and pre-fills their fields from
 * the saved rows.
 * @param {EffectFunctionContext} context - the Forge effect context
 * @param {Answers} answers - all saved eligibility answers
 */
function setListFormData(
  context: EffectFunctionContext,
  answers: Answers,
): void {
  for (const list of ADD_ANOTHER_LISTS) {
    context.setData(list.rowsData, describeRows(list, answers));
    for (const [code, value] of Object.entries(formAnswersFor(list, answers))) {
      context.setAnswer(code, value);
    }
  }
}

/**
 * Reads the answer store, which a step's effects need for add-another changes.
 * @param {EligibilityDeps} deps - journey dependencies
 * @returns {AnswerStore} the answer store
 */
function answerStoreOf(deps: EligibilityDeps): AnswerStore {
  const { answerStore } = deps;
  if (answerStore === undefined) {
    throw new Error("answerStore not provided to eligibility package");
  }
  return answerStore;
}

/**
 * Appends a blank row to a list after the submitted rows have been saved.
 * @param {EligibilityDeps} deps - journey dependencies
 * @param {EffectFunctionContext} context - the Forge effect context
 * @param {string} key - the list's session key
 */
async function appendListRow(
  deps: EligibilityDeps,
  context: EffectFunctionContext,
  key: string,
): Promise<void> {
  const checkId = context.getRequestParam("caseId");
  const answerStore = answerStoreOf(deps);
  const list = listFor(key);
  await answerStore.save(checkId, {
    [list.key]: withBlankRow(list, await answerStore.load(checkId)),
  });
}

/**
 * Removes the row named by the posted `remove` value, after the submitted
 * rows have been saved.
 * @param {EligibilityDeps} deps - journey dependencies
 * @param {EffectFunctionContext} context - the Forge effect context
 * @param {string} key - the list's session key
 */
async function removeListRow(
  deps: EligibilityDeps,
  context: EffectFunctionContext,
  key: string,
): Promise<void> {
  const checkId = context.getRequestParam("caseId");
  const answerStore = answerStoreOf(deps);
  const list = listFor(key);
  const index = Number(context.getPostData("remove"));
  if (!Number.isInteger(index)) return;
  await answerStore.save(checkId, {
    [list.key]: withoutRow(list, await answerStore.load(checkId), index),
  });
}

// Where each benefit-details step sits, so a failed CFE call can send the
// operator back, and a later retry can return them. The query parameter that
// names the step is only ever looked up here, never used as a path.
const BENEFIT_STEPS: Readonly<
  Record<string, { path: string; back: string; title: string }>
> = {
  benefit_details: {
    path: "benefit-details",
    back: "benefits",
    title: eligibilityCopy.benefit_details,
  },
  partner_benefit_details: {
    path: "partner-benefit-details",
    back: "partner-benefits",
    title: eligibilityCopy.partner_benefit_details,
  },
};

/**
 * Fetches CFE's benefit types for a benefit-details step. On failure, logs
 * what is needed to raise the issue and publishes it for the error page.
 * @param {EligibilityDeps} deps - journey dependencies
 * @param {EffectFunctionContext} context - the Forge effect context
 * @param {unknown} stepCode - the benefit-details step being loaded
 */
async function loadBenefitTypes(
  deps: EligibilityDeps,
  context: EffectFunctionContext,
  stepCode: unknown,
): Promise<void> {
  const benefitStep =
    BENEFIT_STEPS[String(stepCode)] ?? BENEFIT_STEPS.benefit_details;
  context.setData("benefitTypesUnavailable", false);
  context.setData("benefitTypesRetryPath", benefitStep.path);
  context.setData("benefitTypesBackPath", benefitStep.back);

  try {
    const options = await loadBenefitTypeOptions(deps.assessor);
    context.setData("benefitTypes", [
      { value: "", text: eligibilityCopy.select_a_benefit },
      ...options,
    ]);
  } catch (error) {
    const checkId = String(context.getRequestParam("caseId"));
    const reason = error instanceof Error ? error.message : String(error);
    const step = benefitStep.title;
    console.error(
      `[LoadBenefitTypes] Could not load benefit types for ${step} (case ${checkId}): ${reason}`,
    );
    context.setData("benefitTypesUnavailable", true);
    context.setData("benefitTypesFailureRows", [
      { key: { text: eligibilityCopy.step }, value: { text: step } },
      { key: { text: eligibilityCopy.case_id }, value: { text: checkId } },
      {
        key: { text: eligibilityCopy.error_from_cfe },
        value: { text: reason },
      },
    ]);
  }
}

export interface EligibilityEffectShape {
  LoadAnswers: () => EffectFunctionExpr;
  SaveAnswers: () => EffectFunctionExpr;
  AddListRow: (key: string) => EffectFunctionExpr;
  RemoveListRow: (key: string) => EffectFunctionExpr;
  LoadBenefitTypes: (stepCode: unknown) => EffectFunctionExpr;
  RunAssessment: () => EffectFunctionExpr;
}

type EffectImplementation<TArgs extends unknown[] = []> = (
  deps: EligibilityDeps,
) => (context: EffectFunctionContext, ...args: TArgs) => Promise<void>;

interface EligibilityEffectsImplementations {
  LoadAnswers: EffectImplementation;
  SaveAnswers: EffectImplementation;
  AddListRow: EffectImplementation<[key: string]>;
  RemoveListRow: EffectImplementation<[key: string]>;
  LoadBenefitTypes: EffectImplementation<[stepCode: unknown]>;
  RunAssessment: EffectImplementation;
}

const EligibilityEffectsImplementation: EligibilityEffectsImplementations = {
  /**
   *
   * @param deps
   */
  LoadAnswers:
    (deps: EligibilityDeps) => async (context: EffectFunctionContext) => {
      try {
        const checkId = context.getRequestParam("caseId");
        const { answerStore } = deps;

        if (!answerStore) {
          throw new Error("answerStore not provided to eligibility package");
        }

        const answers = await answerStore.load(checkId);

        if (
          Object.keys(answers).length === 0 &&
          deps.caseApi !== undefined
        ) {
          const { date_of_birth: dateOfBirth } = await deps.caseApi.loadCase(
            getAuthenticatedAxios(context),
            String(checkId),
          );
          if (dateOfBirth === undefined || dateOfBirth.trim() === "") {
            throw new Error("Case date of birth is required for eligibility");
          }
          answers.date_of_birth = dateOfBirth;
          await answerStore.save(checkId, {
            date_of_birth: dateOfBirth,
          });
        }

        // Set each answer in Forge
        for (const [key, value] of Object.entries(withFormAliases(answers))) {
          const formValue = toFormAnswer(key, value);
          if (formValue !== undefined && formValue !== null) {
            context.setAnswer(key, formValue);
          }
        }

        setListFormData(context, answers);
        publishFrequencyOptions(context, answers);
        publishDependantsFormData(
          context,
          answers,
          toDomainAnswers(answers).partner === true,
        );
        publishPropertyFormData(context, answers);
        publishAssetsFormData(context, answers);
        publishOutgoingsFormData(context, answers);
        publishHousingFormData(context, answers);
        publishNavigation(context, answers);
      } catch (error) {
        throw error;
      }
    },

  /**
   * Registers the effect that saves submitted values and returns updated navigation.
   * @param {EligibilityDeps} deps - dependencies for the eligibility journey
   * @returns {EffectFunctionExpr} the save-answers effect
   */
  SaveAnswers:
    (deps: EligibilityDeps) => async (context: EffectFunctionContext) => {
      try {
        console.error("[SaveAnswers] Starting SaveAnswers effect");
        const checkId = context.getRequestParam("caseId");
        console.error(`[SaveAnswers] checkId: ${checkId}`);
        const { answerStore } = deps;

        if (!answerStore) {
          throw new Error("answerStore not provided to eligibility package");
        }

        // Forge has already parsed and validated every field on the step, so
        // persist its answers rather than picking known fields off the POST.
        // Forge's reachability walk only follows a step's redirect once that
        // step's answer is loaded back, so an unsaved answer strands every
        // step after it.
        await answerStore.save(
          checkId,
          toDomainAnswers(
            collapseLists(ADD_ANOTHER_LISTS, context.getAllAnswers()),
          ),
        );

        const allAnswers = await answerStore.load(checkId);
        console.error(
          `[SaveAnswers] Saved answers: ${JSON.stringify(allAnswers)}`,
        );

        publishNavigation(context, allAnswers);
        console.error(
          "[SaveAnswers] SaveAnswers effect completed successfully",
        );
      } catch (error) {
        console.error(
          `[SaveAnswers] FATAL ERROR: ${error instanceof Error ? error.stack : String(error)}`,
        );
        throw error;
      }
    },

  /**
   * Registers the effect that appends an empty row to an add-another list.
   * @param {EligibilityDeps} deps - dependencies for the eligibility journey
   * @returns {EffectFunctionExpr} the add-row effect
   */
  AddListRow:
    (deps: EligibilityDeps) =>
    async (context: EffectFunctionContext, key: string) => {
      await appendListRow(deps, context, key);
    },

  /**
   * Registers the effect that removes a row from an add-another list.
   * @param {EligibilityDeps} deps - dependencies for the eligibility journey
   * @returns {EffectFunctionExpr} the remove-row effect
   */
  RemoveListRow:
    (deps: EligibilityDeps) =>
    async (context: EffectFunctionContext, key: string) => {
      await removeListRow(deps, context, key);
    },

  /**
   * Registers the effect that loads CFE's benefit types for a benefit step.
   * @param {EligibilityDeps} deps - dependencies for the eligibility journey
   * @returns {EffectFunctionExpr} the load-benefit-types effect
   */
  LoadBenefitTypes:
    (deps: EligibilityDeps) =>
    async (context: EffectFunctionContext, stepCode: unknown) => {
      await loadBenefitTypes(deps, context, stepCode);
    },

  /**
   *
   * @param deps
   */
  RunAssessment:
    (deps: EligibilityDeps) => async (context: EffectFunctionContext) => {
      const checkId = context.getRequestParam("caseId");
      const { answerStore } = deps;

      if (!answerStore) {
        throw new Error("answerStore not provided to eligibility package");
      }

      // Import here to avoid circular dependencies
      const { buildAssessment } = await import("../domain/cfe/payload.js");

      const today = todayUtc();
      const allAnswers = withClientAge(await answerStore.load(checkId), today);
      const filtered = relevantAnswers(allAnswers);

      // Build assessment payload
      const payload = buildAssessment(filtered, today);

      // Call assessor
      const result = await deps.assessor.assess(payload);

      // Call result handler
      await deps.resultHandler.handle({
        checkId,
        answers: filtered,
        result,
      });

      // Clear answers
      await answerStore.clear(checkId);
    },
};

export const EligibilityEffectsRegistry = new EffectRegistry<EligibilityDeps>();

export const EligibilityEffects: EligibilityEffectShape = {
  LoadAnswers: EligibilityEffectsRegistry.register(
    "LoadAnswers",
    EligibilityEffectsImplementation.LoadAnswers,
  ),
  SaveAnswers: EligibilityEffectsRegistry.register(
    "SaveAnswers",
    EligibilityEffectsImplementation.SaveAnswers,
  ),
  AddListRow: EligibilityEffectsRegistry.register(
    "AddListRow",
    EligibilityEffectsImplementation.AddListRow,
  ),
  RemoveListRow: EligibilityEffectsRegistry.register(
    "RemoveListRow",
    EligibilityEffectsImplementation.RemoveListRow,
  ),
  LoadBenefitTypes: EligibilityEffectsRegistry.register(
    "LoadBenefitTypes",
    EligibilityEffectsImplementation.LoadBenefitTypes,
  ),
  RunAssessment: EligibilityEffectsRegistry.register(
    "RunAssessment",
    EligibilityEffectsImplementation.RunAssessment,
  ),
};
