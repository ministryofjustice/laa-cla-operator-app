import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKCheckboxInput,
  GovUKDetails,
  GovUKRadioInput,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
  Answer,
  Data,
  Iterator,
  Item,
  or,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
  POUNDS_AMOUNT_MIN_500_PATTERN,
  POUNDS_AMOUNT_PATTERN,
} from "../amount-validation.js";

export const assetsHeadingBlock = HtmlBlock({
  tag: "h1",
  content: "Client assets",
  classes: "govuk-heading-xl",
});

export const bankruptClientsDetailsBlock = GovUKDetails({
  summaryText: "Clients who are bankrupt",
  text: "If your client is bankrupt, any capital assets vested in the trustee in bankruptcy will not be included in the capital assessment.",
});

export const bankAccountsHeadingBlock = HtmlBlock({
  tag: "h2",
  content: "Money in bank accounts",
  classes: "govuk-heading-m",
});

export const bankAccountsGuidanceBlock = HtmlBlock({
  content: `
    <p class="govuk-body">For example:</p>
    <ul class="govuk-list govuk-list--bullet">
      <li>current or savings accounts</li>
      <li>ISAs</li>
      <li>child accounts your client is a signatory on</li>
      <li>prison accounts</li>
    </ul>
    <p class="govuk-body">Do not include any disregarded capital or Cost of Living Payments.</p>
    <p class="govuk-body">Check the guidance for:</p>
    <ul class="govuk-list govuk-list--bullet">
      <li><a class="govuk-link" href="https://assets.publishing.service.gov.uk/media/673602d2b613efc3f182312e/Lord_Chancellor_s_guide_to_determining_financial_eligibility_for_controlled_work_and_family_mediation_November_2024.pdf#page=26" target="_blank" rel="noreferrer noopener">mandatory and discretionary disregarded capital (PDF, 599KB)</a></li>
      <li><a class="govuk-link" href="https://assets.publishing.service.gov.uk/media/673602d2b613efc3f182312e/Lord_Chancellor_s_guide_to_determining_financial_eligibility_for_controlled_work_and_family_mediation_November_2024.pdf#page=32" target="_blank" rel="noreferrer noopener">the principles for exercising discretion (PDF, 599KB)</a></li>
    </ul>
  `,
});

export const bankAccountsTableBlock = CollectionBlock({
  collection: Data("bankAccountRows").each(
    Iterator.Map(
      CollectionBlock({
        classes: "bank-account-row govuk-!-margin-bottom-6",
        collection: [
          HtmlBlock({
            tag: "h3",
            content: Item().path("heading"),
            classes: "govuk-heading-s",
          }),
          GovUKTextInput({
            code: Item().path("amountCode"),
            label: { text: "Total money in bank account" },
            hint: { text: "Enter 0 if this does not apply." },
            prefix: { text: "£" },
            validWhen: [
              validation({
                condition: Self().match(Condition.IsRequired()),
                message: Item().path("requiredMessage"),
              }),
              validation({
                condition: Self().match(
                  Condition.String.MatchesRegex(POUNDS_AMOUNT_PATTERN),
                ),
                message: Item().path("numberMessage"),
              }),
            ],
          }),
          GovUKCheckboxInput({
            code: Item().path("disputeCode"),
            items: [
              {
                value: "true",
                text: "This asset is a subject matter of dispute",
              },
            ],
          }),
          GovUKDetails({
            summaryText: "Help with subject matter of dispute",
            html: `
              <p class="govuk-body">Any asset owned or partially owned by your client that is the subject of a claim by their opponent in a case is the subject matter of dispute.</p>
              <p class="govuk-body">These assets will be disregarded from the calculation, up to a total of £100,000. See Regulation 38 of The Civil Legal Aid (Financial Resources and Payment for Services) Regulations 2013 for more information.</p>
            `,
          }),
        ],
      }),
    ),
  ),
});

export const costOfLivingPaymentsDetailsBlock = GovUKDetails({
  summaryText: "Examples of Cost of Living Payments",
  html: `
    <ul class="govuk-list govuk-list--bullet">
      <li>Pensioner Cost of Living Payment</li>
      <li>Cost of Living Payment</li>
      <li>Disability Cost of Living Payment</li>
      <li>Household Support Fund</li>
      <li>Council Tax rebate</li>
      <li>Energy Bills Support Scheme (EBSS)</li>
      <li>Alternative Fuel Payment</li>
    </ul>
  `,
});

export const addBankAccountButtonBlock = GovUKButton({
  name: "action",
  value: "add",
  text: "Add another bank account",
  classes: "govuk-button--secondary",
});

export const assetsQuestionsBlock = CollectionBlock({
  collection: [
    GovUKRadioInput({
      code: "investments_relevant",
      fieldset: {
        legend: {
          text: "Does your client have any investments?",
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
        },
      },
      hint: {
        text: "For example, shares in a public limited company, unit trusts or capital bonds.",
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select yes if client has any investments",
        }),
      ],
    }),
    GovUKTextInput({
      code: "investments",
      label: { text: "Total of all investments" },
      hint: { text: "In pounds" },
      validWhen: [
        validation({
          condition: or([
            Answer("investments_relevant").not.match(Condition.Equals("true")),
            Self().match(
              Condition.String.MatchesRegex(
                POUNDS_AMOUNT_GREATER_THAN_ZERO_PATTERN,
              ),
            ),
          ]),
          message:
            "Enter the total value of investments as a number greater than 0",
        }),
      ],
    }),
    GovUKCheckboxInput({
      code: "investments_in_dispute",
      fieldset: {
        legend: {
          text: "Investments",
        },
      },
      items: [
        {
          value: "true",
          text: "This asset is a subject matter of dispute",
        },
      ],
    }),
    GovUKRadioInput({
      code: "valuables_relevant",
      fieldset: {
        legend: {
          text: "Does your client have valuable items worth £500 or more?",
          classes: "govuk-fieldset__legend govuk-fieldset__legend--m",
        },
      },
      hint: {
        html: `
          If you have more than one valuation for any of these valuable items, use the highest. Keep a record of where the valuation is from for evidence, as it may be checked at file audit or assessment stage.
          <details class="govuk-details" data-module="govuk-details">
            <summary class="govuk-details__summary">
              <span class="govuk-details__summary-text">What valuable items to include</span>
            </summary>
            <div class="govuk-details__text">
              <p class="govuk-body">Include things like:</p>
              <ul class="govuk-list govuk-list--bullet">
                <li>jewellery (but not wedding, engagement or eternity rings)</li>
                <li>art</li>
                <li>antiques</li>
                <li>a caravan (if it is not the client's main residence)</li>
                <li>musical instruments, unless your client is a professional musician</li>
                <li>any vehicle not in regular use</li>
              </ul>
              <p class="govuk-body">Do not include things like:</p>
              <ul class="govuk-list govuk-list--bullet">
                <li>wedding, engagement and eternity rings</li>
                <li>furniture and appliances</li>
                <li>televisions</li>
                <li>mobile phones, laptops and other devices</li>
                <li>clothing</li>
                <li>equipment or tools used for work</li>
              </ul>
            </div>
          </details>
        `,
      },
      items: [
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
      ],
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Select yes if client has valuable items worth £500 or more",
        }),
      ],
    }),
    GovUKTextInput({
      code: "valuables",
      label: { text: "Total of all valuable items" },
      hint: { text: "In pounds" },
      validWhen: [
        validation({
          condition: or([
            Answer("valuables_relevant").not.match(Condition.Equals("true")),
            Self().match(
              Condition.String.MatchesRegex(POUNDS_AMOUNT_MIN_500_PATTERN),
            ),
          ]),
          message: "Enter the total value of valuable items as at least £500",
        }),
      ],
    }),
    GovUKCheckboxInput({
      code: "valuables_in_dispute",
      fieldset: {
        legend: {
          text: "Valuable items",
        },
      },
      items: [
        {
          value: "true",
          text: "This asset is a subject matter of dispute",
        },
      ],
    }),
  ],
});

export const assetsContinueButtonBlock = GovUKButton({
  text: "Save and continue",
});
