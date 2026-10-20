// The client and partner assets steps, as CCQ's `ClientAssetsForm` and
// `PartnerAssetsForm` with the shared `forms/_assets` view: bank accounts as
// add-another rows, then investments and valuables, each a yes/no question
// revealing its total. Only the client's assets can be a subject matter of
// dispute.
import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
  type BlockDefinition,
  type ResolvableString,
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
  Format,
  Item,
  Iterator,
  Self,
  and,
  not,
  validation,
  when,
  type PredicateExpr,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  POUNDS_AMOUNT_MIN_500_PATTERN,
  POUNDS_AMOUNT_PATTERN,
  amountValidations,
} from "../amount-validation.js";
import { byLevelOfHelp, isControlled } from "../income-subject.js";
import {
  CERTIFICATED_ONLY_PAGES,
  certificatedGuidanceLink,
  guidanceLink,
  LC_GUIDANCE,
} from "../guidance.js";
import {
  BANK_ACCOUNTS_LIST,
  PARTNER_BANK_ACCOUNTS_LIST,
} from "../../lists/index.js";
import type { AddAnotherList } from "../../lists/add-another.js";

type Subject = "client" | "partner";

const { dynamic } = eligibilityCopy;
const { assets: wording } = dynamic;

const hasPartner = Answer("partner").match(Condition.Equals("true"));
const smodApplies = Data("smodApplicable").match(Condition.Equals(true));

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
 * CCQ's "Help with subject matter of dispute" details.
 * @param {PredicateExpr} [visibleWhen] - when to show it
 * @returns {BlockDefinition} the details
 */
const smodHelp = (visibleWhen?: PredicateExpr): BlockDefinition =>
  GovUKDetails({
    summaryText: eligibilityCopy.help_with_subject_matter_of_dispute,
    html: eligibilityCopy.p_class_govuk_body_any_asset_owned_or_partially_owned_b_91ffa8b450,
    ...(visibleWhen === undefined ? {} : { visibleWhen }),
  });

/**
 * The guidance links under the bank accounts examples, to the guide for the
 * check's level of help.
 * @param {string} html - the paragraphs, with `%1` and `%2` for the links
 * @returns {ResolvableString} the paragraphs as HTML
 */
function bankExclusionsHtml(html: string): ResolvableString {
  /**
   * The paragraphs with links into one level of help's guide.
   * @param {keyof typeof LC_GUIDANCE} level - the guide to link to
   * @returns {ResolvableString} the paragraphs as HTML
   */
  const links = (level: keyof typeof LC_GUIDANCE): ResolvableString =>
    Format(
      html,
      guidanceLink(level, "disregardedCapital", wording.disregardedCapitalLink),
      guidanceLink(
        level,
        "exercisingDiscretion",
        wording.exercisingDiscretionLink,
      ),
    );
  return byLevelOfHelp(links("controlled"), links("certificated"));
}

/**
 * The bank account rows, with a Remove button on every row after the first.
 * @param {AddAnotherList} list - the client's or partner's bank accounts
 * @returns {BlockDefinition} the rows
 */
function bankAccountRows(list: AddAnotherList): BlockDefinition {
  const rowSmodApplies = Item()
    .path("smodApplicable")
    .match(Condition.Equals(true));
  const hasDispute = Object.hasOwn(list.fields, "account_in_dispute");
  return CollectionBlock({
    collection: Data(list.rowsData).each(
      Iterator.Map(
        CollectionBlock({
          classes: "bank-account-row govuk-!-margin-bottom-6",
          collection: [
            HtmlBlock({
              tag: "h3",
              content: Item().path("heading"),
              classes: "govuk-heading-s",
            }),
            GovUKButton({
              name: "remove",
              value: Item().path("index"),
              text: eligibilityCopy.remove,
              classes: "govuk-button--secondary",
              visibleWhen: Item().path("removable"),
            }),
            GovUKTextInput({
              code: rowCode("amount"),
              label: { text: eligibilityCopy.total_money_in_bank_account },
              hint: { text: eligibilityCopy.enter_0_if_this_does_not_apply },
              prefix: { text: eligibilityCopy.copy },
              classes: "govuk-input--width-10",
              validWhen: amountValidations(
                {
                  required: rowMessage("amount", "required"),
                  notANumber: rowMessage("amount", "notANumber"),
                  outOfRange: rowMessage("amount", "outOfRange"),
                },
                POUNDS_AMOUNT_PATTERN,
              ),
            }),
            ...(hasDispute
              ? [
                  GovUKCheckboxInput({
                    code: rowCode("account_in_dispute"),
                    visibleWhen: rowSmodApplies,
                    dependentWhen: rowSmodApplies,
                    items: [
                      {
                        value: "true",
                        text: eligibilityCopy.this_asset_is_a_subject_matter_of_dispute,
                      },
                    ],
                  }),
                  smodHelp(rowSmodApplies),
                ]
              : []),
          ],
        }),
      ),
    ),
  });
}

interface AssetQuestion {
  relevantCode: string;
  amountCode: string;
  disputeCode?: string;
  legend: string;
  hint: { text: ResolvableString } | { html: ResolvableString };
  requiredMessage: string;
  amountLabel: string;
  messages: { required: string; notANumber: string; outOfRange: string };
  rangePattern: string;
  disputeSummaryLabel?: string;
}

/**
 * A yes/no asset question, revealing its total (and, for the client when
 * SMOD applies, whether it is in dispute) under Yes. The total and dispute
 * answer are only checked, and kept, when the answer is yes.
 * @param {AssetQuestion} question - the codes, wording and checks
 * @returns {BlockDefinition} the question
 */
function assetQuestion(question: AssetQuestion): BlockDefinition {
  const isRelevant = Answer(question.relevantCode).match(
    Condition.Equals("true"),
  );
  const reveal: BlockDefinition[] = [
    GovUKTextInput({
      code: question.amountCode,
      label: { text: question.amountLabel },
      prefix: { text: eligibilityCopy.copy },
      classes: "govuk-input--width-5",
      dependentWhen: isRelevant,
      validWhen: amountValidations(question.messages, question.rangePattern),
    }),
  ];
  if (question.disputeCode !== undefined) {
    reveal.push(
      GovUKCheckboxInput({
        code: question.disputeCode,
        visibleWhen: smodApplies,
        dependentWhen: and([isRelevant, smodApplies]),
        metadata: { summaryLabel: question.disputeSummaryLabel },
        items: [
          {
            value: "true",
            text: eligibilityCopy.this_asset_is_a_subject_matter_of_dispute,
          },
        ],
      }),
    );
  }

  return GovUKRadioInput({
    code: question.relevantCode,
    fieldset: {
      legend: {
        text: question.legend,
        classes: "govuk-fieldset__legend--m",
      },
    },
    hint: question.hint,
    items: [
      {
        value: "true",
        text: eligibilityCopy.yes,
        block: CollectionBlock({ collection: reveal }),
      },
      { value: "false", text: eligibilityCopy.no },
    ],
    validWhen: [
      validation({
        condition: Self().match(Condition.IsRequired()),
        message: question.requiredMessage,
      }),
    ],
  });
}

interface SubjectAssets {
  list: AddAnotherList;
  prefix: string;
  selfEmployedData: string;
  heading: string;
  intro: { content: string; visibleWhen?: PredicateExpr };
  bankruptSummary: string;
  bankruptText: string;
  businessCapitalLink: string;
  bankExamplesHtml: ResolvableString;
  bankExclusionsHtml: string;
  investments: Pick<
    AssetQuestion,
    | "disputeCode"
    | "disputeSummaryLabel"
    | "legend"
    | "hint"
    | "requiredMessage"
  >;
  trustsHtml: ResolvableString;
  valuables: Pick<
    AssetQuestion,
    | "disputeCode"
    | "disputeSummaryLabel"
    | "legend"
    | "hint"
    | "requiredMessage"
  >;
  valuablesDetailsHtml: ResolvableString;
}

const SUBJECT_ASSETS: Record<Subject, SubjectAssets> = {
  client: {
    list: BANK_ACCOUNTS_LIST,
    prefix: "",
    selfEmployedData: "clientSelfEmployed",
    heading: eligibilityCopy.client_assets,
    intro: { content: wording.clientWithPartnerHint, visibleWhen: hasPartner },
    bankruptSummary: eligibilityCopy.clients_who_are_bankrupt,
    bankruptText:
      eligibilityCopy.if_your_client_is_bankrupt_any_capital_assets_vested_in_33adc750b1,
    businessCapitalLink: wording.businessCapitalLinkClient,
    bankExamplesHtml: when(hasPartner)
      .then(wording.bankExamplesClientWithPartnerHtml)
      .else(wording.bankExamplesClientHtml),
    bankExclusionsHtml: wording.bankExclusionsClientHtml,
    investments: {
      disputeCode: "investments_in_dispute",
      disputeSummaryLabel: wording.investmentsDisputeSummary,
      legend: eligibilityCopy.does_your_client_have_any_investments,
      hint: {
        text: when(hasPartner)
          .then(wording.investmentsHintClientWithPartner)
          .else(wording.investmentsHintClient),
      },
      requiredMessage: wording.investmentsRequiredClient,
    },
    trustsHtml: when(hasPartner)
      .then(wording.trustsClientWithPartnerHtml)
      .else(wording.trustsClientHtml),
    valuables: {
      disputeCode: "valuables_in_dispute",
      disputeSummaryLabel: wording.valuablesDisputeSummary,
      legend:
        eligibilityCopy.does_your_client_have_valuable_items_worth_500_or_more,
      hint: {
        text: byLevelOfHelp(
          wording.valuablesHintControlled,
          wording.valuablesHintCertificated,
        ),
      },
      requiredMessage: wording.valuablesRequiredClient,
    },
    valuablesDetailsHtml: byLevelOfHelp(
      wording.valuablesDetailsClientControlledHtml,
      wording.valuablesDetailsClientCertificatedHtml,
    ),
  },
  partner: {
    list: PARTNER_BANK_ACCOUNTS_LIST,
    prefix: "partner_",
    selfEmployedData: "partnerSelfEmployed",
    heading: eligibilityCopy.partner_assets,
    intro: { content: wording.partnerHint },
    bankruptSummary: wording.partnerBankruptSummary,
    bankruptText: wording.partnerBankruptText,
    businessCapitalLink: wording.businessCapitalLinkPartner,
    bankExamplesHtml: wording.bankExamplesPartnerHtml,
    bankExclusionsHtml: wording.bankExclusionsPartnerHtml,
    investments: {
      legend: eligibilityCopy.does_the_partner_have_any_investments,
      hint: { html: wording.investmentsHintPartnerHtml },
      requiredMessage: wording.investmentsRequiredPartner,
    },
    trustsHtml: wording.trustsClientWithPartnerHtml,
    valuables: {
      legend:
        eligibilityCopy.does_the_partner_have_valuable_items_worth_500_or_more,
      hint: {
        html: byLevelOfHelp(
          wording.valuablesHintPartnerControlledHtml,
          wording.valuablesHintPartnerCertificatedHtml,
        ),
      },
      requiredMessage: wording.valuablesRequiredPartner,
    },
    valuablesDetailsHtml: byLevelOfHelp(
      wording.valuablesDetailsPartnerControlledHtml,
      wording.valuablesDetailsPartnerCertificatedHtml,
    ),
  },
};

/**
 * The assets step's blocks for the client or the partner.
 * @param {Subject} subject - whose assets these are
 * @returns {BlockDefinition[]} the blocks
 */
function assetsBlocks(subject: Subject): BlockDefinition[] {
  const { [subject]: copy } = SUBJECT_ASSETS;
  const selfEmployed = Data(copy.selfEmployedData).match(
    Condition.Equals(true),
  );

  return [
    HtmlBlock({
      tag: "h1",
      content: copy.heading,
      classes: "govuk-heading-xl",
    }),
    HtmlBlock({ tag: "p", classes: "govuk-body", ...copy.intro }),
    GovUKDetails({
      summaryText: copy.bankruptSummary,
      text: copy.bankruptText,
    }),
    GovUKDetails({
      summaryText: wording.businessCapitalSummary,
      html: Format(
        wording.businessCapitalLinkHtml,
        LC_GUIDANCE.certificated.url,
        String(CERTIFICATED_ONLY_PAGES.businessCapital),
        copy.businessCapitalLink,
      ),
      visibleWhen: and([not(isControlled), selfEmployed]),
    }),
    HtmlBlock({
      tag: "h2",
      content: eligibilityCopy.money_in_bank_accounts,
      classes: "govuk-heading-m",
    }),
    HtmlBlock({ content: copy.bankExamplesHtml }),
    HtmlBlock({ content: bankExclusionsHtml(copy.bankExclusionsHtml) }),
    GovUKDetails({
      summaryText: eligibilityCopy.examples_of_cost_of_living_payments,
      html: eligibilityCopy.ul_class_govuk_list_govuk_list_bullet_li_pensioner_cost_5ded7c2354,
    }),
    bankAccountRows(copy.list),
    GovUKButton({
      name: "action",
      value: "add",
      text: eligibilityCopy.add_another_bank_account,
      classes: "govuk-button--secondary",
    }),
    assetQuestion({
      ...copy.investments,
      relevantCode: `${copy.prefix}investments_relevant`,
      amountCode: `${copy.prefix}investments`,
      amountLabel: eligibilityCopy.total_of_all_investments,
      messages: {
        required: wording.investmentsBlank,
        notANumber: wording.investmentsNumber,
        outOfRange: wording.investmentsGreaterThanZero,
      },
      rangePattern: POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
    }),
    GovUKDetails({
      summaryText: wording.trustsSummary,
      html: Format(
        copy.trustsHtml,
        certificatedGuidanceLink("trusts", wording.trustsLink),
      ),
      visibleWhen: not(isControlled),
    }),
    assetQuestion({
      ...copy.valuables,
      relevantCode: `${copy.prefix}valuables_relevant`,
      amountCode: `${copy.prefix}valuables`,
      amountLabel: eligibilityCopy.total_of_all_valuable_items,
      messages: {
        required: wording.valuablesBlank,
        notANumber: wording.valuablesNumber,
        outOfRange: wording.valuablesAtLeast500,
      },
      rangePattern: POUNDS_AMOUNT_MIN_500_PATTERN,
    }),
    GovUKDetails({
      summaryText: wording.valuablesDetailsSummary,
      html: copy.valuablesDetailsHtml,
    }),
    GovUKButton({ text: eligibilityCopy.continue }),
  ];
}

export const clientAssetsBlocks = assetsBlocks("client");
export const partnerAssetsBlocks = assetsBlocks("partner");
