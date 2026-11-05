import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKRadioInput,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Answer,
  Condition,
  Data,
  Format,
  Self,
  and,
  validation,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { PredicateExpr } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { ResolvableString } from "@ministryofjustice/hmpps-forge/core/components";
import {
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  amountValidations,
} from "../amount-validation.js";
import { CLIENT, type IncomeSubject } from "../income-subject.js";

/** What differs between the kinds of outgoing CCQ asks about. */
interface OutgoingType {
  /** The answer key stem: `${prefix}${type}_relevant` and so on. */
  type: string;
  /** Names the outgoing in the check your answers summary. */
  title: string;
  /** Completes "Does <subject> ...?". */
  question: string;
  /** Completes "Select yes if <subject> ...". */
  selectYes: string;
  hint: (subject: IncomeSubject) => ResolvableString | undefined;
  amountMessages: {
    required: ResolvableString;
    notANumber: ResolvableString;
    outOfRange: ResolvableString;
  };
  frequencyMessage: ResolvableString;
}

const CHILDCARE = "childcare_payments";

const OUTGOING_TYPES: readonly OutgoingType[] = [
  {
    type: CHILDCARE,
    title: eligibilityCopy.childcare_payments,
    question: eligibilityCopy.pay_for_childcare,
    selectYes: eligibilityCopy.pays_for_childcare,
    hint: () => eligibilityCopy.dynamic.income.outgoingHintChildcare,
    amountMessages: {
      required: eligibilityCopy.enter_amount_paid_for_childcare,
      notANumber: eligibilityCopy.amount_paid_for_childcare_must_be_a_number,
      outOfRange: eligibilityCopy.dynamic.income.outgoingOutOfRangeChildcare,
    },
    frequencyMessage: eligibilityCopy.select_frequency_of_childcare_payments,
  },
  {
    type: "maintenance_payments",
    title: eligibilityCopy.maintenance_payments_to_a_former_partner,
    question: eligibilityCopy.pay_maintenance_to_a_former_partner,
    selectYes: eligibilityCopy.pays_maintenance_to_a_former_partner,
    hint: (subject) =>
      subject.prefix === ""
        ? eligibilityCopy.dynamic.income.outgoingHintMaintenanceClient
        : eligibilityCopy.dynamic.income.outgoingHintMaintenancePartner,
    amountMessages: {
      required:
        eligibilityCopy.enter_amount_of_maintenance_paid_to_a_former_partner,
      notANumber:
        eligibilityCopy.amount_of_maintenance_paid_to_a_former_partner_must_be_a_number,
      outOfRange: eligibilityCopy.dynamic.income.outgoingOutOfRangeMaintenance,
    },
    frequencyMessage:
      eligibilityCopy.select_frequency_of_maintenance_payments_to_a_former_partner,
  },
  {
    type: "legal_aid_payments",
    title: eligibilityCopy.payments_towards_legal_aid_in_a_criminal_case,
    question:
      eligibilityCopy.make_payments_towards_legal_aid_for_a_criminal_case,
    selectYes:
      eligibilityCopy.makes_payments_toward_legal_aid_for_a_criminal_case,
    hint: () => undefined,
    amountMessages: {
      required:
        eligibilityCopy.enter_amount_paid_toward_legal_aid_in_a_criminal_case,
      notANumber:
        eligibilityCopy.amount_paid_toward_legal_aid_in_a_criminal_case_must_be_a_number,
      outOfRange: eligibilityCopy.dynamic.income.outgoingOutOfRangeLegalAid,
    },
    frequencyMessage:
      eligibilityCopy.select_frequency_of_payments_towards_legal_aid_in_a_criminal_case,
  },
];

// CCQ only asks about childcare when the household can claim it (see
// `eligibleForChildcareCosts`), and neither checks nor keeps the answers otherwise.
const childcareAsked = Data("showChildcare").match(Condition.Equals(true));

/**
 * The questions for one kind of outgoing: whether there is any, how much
 * and how often. Amount and frequency are always shown, and only checked,
 * and kept, when the answer is yes.
 * @param {OutgoingType} outgoing - the kind of outgoing
 * @param {IncomeSubject} subject - whose outgoing this is
 * @returns {ReturnType<typeof CollectionBlock>} the questions
 */
function outgoingQuestions(
  outgoing: OutgoingType,
  subject: IncomeSubject,
): ReturnType<typeof CollectionBlock> {
  const relevantCode = `${subject.prefix}${outgoing.type}_relevant`;
  const isRelevant = Answer(relevantCode).match(Condition.Equals("true"));
  const isChildcare = outgoing.type === CHILDCARE;
  const asked = (condition?: PredicateExpr): PredicateExpr | undefined => {
    if (!isChildcare) return condition;
    return condition === undefined
      ? childcareAsked
      : and([childcareAsked, condition]);
  };
  const askedWhenRelevant = asked(isRelevant);
  const askedAtAll = asked();
  const hint = outgoing.hint(subject);

  return CollectionBlock({
    classes: "govuk-!-margin-bottom-6",
    ...(isChildcare ? { visibleWhen: childcareAsked } : {}),
    collection: [
      GovUKRadioInput({
        code: relevantCode,
        fieldset: {
          legend: {
            text: eligibilityCopy.dynamic.income.outgoingQuestion
              .replace("%1", subject.noun)
              .replace("%2", outgoing.question),
            classes: "govuk-fieldset__legend--m",
          },
        },
        ...(hint === undefined ? {} : { hint: { text: hint } }),
        items: [
          { value: "true", text: eligibilityCopy.yes },
          { value: "false", text: eligibilityCopy.no },
        ],
        classes: "govuk-radios--inline",
        ...(askedAtAll === undefined ? {} : { dependentWhen: askedAtAll }),
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: Format(
              eligibilityCopy.dynamic.income.outgoingRequired,
              subject.noun,
              outgoing.selectYes,
            ),
          }),
        ],
      }),
      GovUKTextInput({
        code: `${subject.prefix}${outgoing.type}_conditional_value`,
        label: { text: eligibilityCopy.amount, classes: "govuk-label--s" },
        hint: { text: eligibilityCopy.if_yes_enter_amount_and_frequency },
        prefix: { text: eligibilityCopy.copy },
        classes: "govuk-input--width-10",
        dependentWhen: askedWhenRelevant,
        metadata: {
          summaryLabel:
            eligibilityCopy.dynamic.income.outgoingSummaryAmount.replace(
              "%1",
              outgoing.title,
            ),
        },
        validWhen: amountValidations(
          outgoing.amountMessages,
          POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
        ),
      }),
      GovUKRadioInput({
        code: `${subject.prefix}${outgoing.type}_frequency`,
        fieldset: {
          legend: {
            text: eligibilityCopy.frequency,
            classes: "govuk-fieldset__legend--s",
          },
        },
        items: Data("outgoingsFrequencyOptions"),
        dependentWhen: askedWhenRelevant,
        metadata: {
          summaryLabel:
            eligibilityCopy.dynamic.income.outgoingSummaryFrequency.replace(
              "%1",
              outgoing.title,
            ),
        },
        validWhen: [
          validation({
            condition: Self().match(Condition.IsRequired()),
            message: outgoing.frequencyMessage,
          }),
        ],
      }),
    ],
  });
}

/**
 * The outgoings step, as in CCQ's `OutgoingsForm` and `PartnerOutgoingsForm`:
 * childcare (only when it can be claimed), maintenance to a former partner,
 * and payments towards criminal legal aid.
 * @param {IncomeSubject} subject - whose outgoings these are
 * @returns {ReturnType<typeof CollectionBlock>} the heading, questions and button
 */
export function createOutgoingsBlock(
  subject: IncomeSubject,
): ReturnType<typeof CollectionBlock> {
  const isClient = subject.prefix === "";
  return CollectionBlock({
    collection: [
      HtmlBlock({
        tag: "h1",
        content: isClient
          ? eligibilityCopy.dynamic.income.outgoingHeadingClient
          : eligibilityCopy.dynamic.income.outgoingHeadingPartner,
        classes: "govuk-heading-xl",
      }),
      ...(isClient
        ? []
        : [
            HtmlBlock({
              tag: "p",
              content:
                eligibilityCopy.do_not_include_any_outgoings_already_entered_for_your_client,
              classes: "govuk-body",
            }),
          ]),
      ...OUTGOING_TYPES.map((type) => outgoingQuestions(type, subject)),
      GovUKButton({ text: eligibilityCopy.continue }),
    ],
  });
}

/** The client's outgoings step. */
export const outgoingsBlock = createOutgoingsBlock(CLIENT);
