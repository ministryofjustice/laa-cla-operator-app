import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKTextInput,
  GovUKRadioInput,
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  validation,
  Condition,
  Self,
  Data,
  Iterator,
  Item,
  Loop,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const bankAccountsHeadingBlock = HtmlBlock({
  tag: "h2",
  content: "Bank accounts and savings",
  classes: "govuk-heading-l",
});

export const bankAccountsTableBlock = CollectionBlock({
  collection: Data("bankAccountRows").each(
    Iterator.Map(
      CollectionBlock({
        classes: "bank-account-row govuk-!-margin-bottom-6",
        collection: [
          HtmlBlock({
            tag: "h3",
            // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions -- Loop.Index() is Forge runtime binding
            content: `Bank account ${Loop.Index()}`,
            classes: "govuk-heading-s",
          }),
          GovUKTextInput({
            // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions -- Item().path() is Forge runtime binding
            code: `bank_accounts_${Item().path("index")}_amount`,
            label: { text: "Amount" },
            hint: { text: "In pounds" },
            validWhen: [
              validation({
                condition: Self().match(Condition.IsRequired()),
                // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions -- Loop.Index() is Forge runtime binding
                message: `Enter the amount in bank account ${Loop.Index()}`,
              }),
            ],
          }),
          GovUKRadioInput({
            // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions -- Item().path() is Forge runtime binding
            code: `bank_accounts_${Item().path("index")}_joint`,
            fieldset: {
              legend: {
                text: "Is this a joint account?",
                classes: "govuk-fieldset__legend--s",
              },
            },
            items: [
              { value: "true", text: "Yes" },
              { value: "false", text: "No" },
            ],
            validWhen: [
              validation({
                condition: Self().match(Condition.IsRequired()),
                // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions -- Loop.Index() is Forge runtime binding
                message: `Select whether bank account ${Loop.Index()} is joint`,
              }),
            ],
          }),
        ],
      })
    )
  ),
});

export const bankAccountsButtonsBlock = CollectionBlock({
  collection: [
    GovUKButton({
      name: "action",
      value: "add",
      text: "Add another bank account",
      classes: "govuk-button--secondary",
    }),
    GovUKButton({ text: "Continue" }),
  ],
});
