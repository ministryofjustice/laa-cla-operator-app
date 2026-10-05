import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKCheckboxInput,
  GovUKTextareaInput,
  GovUKHeading,
  GovUKBody,
  GovUKUtilityClasses,
  GovUKTextInput,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Condition,
  Self,
  validation,
  Answer,
  or,
  and,
} from "@ministryofjustice/hmpps-forge/core/authoring";

const MAX_LANGUAGE_LENGTH = 30;

export const clientSupportNeeds = CollectionBlock({
  collection: [
    GovUKBody({
      text: "A client may need translation services, a Welsh language speaker or extra support due to a disability or condition which makes communication difficult.",
      size: "s",
    }),
    HtmlBlock({
      content: `
        <div class="govuk-inset-text taking-call-inset">
          <p class="govuk-body">Is there anything we can do to make it easier to communicate with us?</p>
        </div>
      `,
    }),
    GovUKHeading({
      text: "Client’s language requirements (optional)",
      size: "m",
    }),

    GovUKCheckboxInput({
      code: "languageChoice",
      items: [
        {
          value: "welsh",
          text: "Welsh language service needed",
        },
        {
          value: "otherLanguage",
          text: "Other language – interpreter needed",
          block: GovUKTextInput({
            code: "otherLanguageChoice",
            classes: GovUKUtilityClasses.Input.Width10,
            label: "Start typing to select the language",
            inputType: "text",
            dependentWhen: Answer("languageChoice").match(
              Condition.Array.Contains("otherLanguage"),
            ),
            validWhen: [
              validation({
                condition: Self().match(Condition.IsRequired()),
                message: "Enter a language",
              }),
              validation({
                condition: Self().match(
                  Condition.String.HasMaxLength(MAX_LANGUAGE_LENGTH),
                ),
                message: "Language must be 30 characters or fewer",
              }),
            ],
          }),
        },
      ],
      validWhen: [
        validation({
          condition: or(
            Self().not.match(Condition.Array.Contains("britishSignLanguage")),
            Self().not.match(Condition.Array.Contains("otherLanguage")),
          ),
          message: "Select only one language option",
        }),
      ],
    }),

    GovUKHeading({
      text: "Client’s communication and support needs (optional)",
      size: "m",
    }),

    GovUKCheckboxInput({
      code: "communicationNeeds",
      items: [
        {
          value: "britishSignLanguage",
          text: "British Sign Language (BSL)",
        },
        {
          value: "relayUK",
          text: "Relay UK",
        },
        {
          value: "otherSupport",
          text: "Any other support or accessibility needs",
          block: GovUKTextareaInput({
            code: "otherSupportDetails",
            rows: "6",
            classes: GovUKUtilityClasses.Input.Width20,
            label: `Enter client’s preferences, for example, ‘Client is hard of hearing, please speak distinctly’.
        ‘Client has an ADHD diagnosis and may need questions to be repeated’.`,
            dependentWhen: Answer("communicationNeeds").match(
              Condition.Array.Contains("otherSupport"),
            ),
            validWhen: [
              validation({
                condition: Self().match(Condition.IsRequired()),
                message: "Enter the client’s support needs",
              }),
            ],
          }),
        },
      ],
      validWhen: [
        validation({
          condition: or(
            and(
              Self().not.match(Condition.Array.Contains("britishSignLanguage")),
              Self().not.match(Condition.Array.Contains("relayUK")),
            ),
            and(
              Self().not.match(Condition.Array.Contains("britishSignLanguage")),
              Self().not.match(Condition.Array.Contains("otherSupport")),
            ),
            and(
              Self().not.match(Condition.Array.Contains("relayUK")),
              Self().not.match(Condition.Array.Contains("otherSupport")),
            ),
          ),
          message: "Select only one communication or support need",
        }),
      ],
    }),

    GovUKButton({ text: "Continue" }),
  ],
});
