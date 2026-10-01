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
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const clientSupportNeeds = CollectionBlock({
  collection: [
    GovUKBody({
      text: "A client may need translation services, a Welsh language speaker or extra support due to a disability or condition which makes communication difficult. ",
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
import { Answer, Condition } from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton, GovUKCheckboxInput, GovUKTextareaInput,GovUKHeading, GovUKBody, GovUKInsetText, } from "@ministryofjustice/hmpps-forge/govuk-components";
import {} from "@ministryofjustice/hmpps-forge/moj-components"

export const clientSupportNeeds = CollectionBlock({
  collection: [
    
    GovUKBody(
        { text: 'A client may need translation services, a Welsh language speaker or extra support due to a disability or condition which makes communication difficult. ', size: 's' }
    ),
    HtmlBlock({
      content:`
        <div class="govuk-inset-text taking-call-inset">
          <p class="govuk-body">Is there anything we can do to make it easier to communicate with us?</p>
        </div> 
        `,
    }),

    GovUKCheckboxInput({
      code: "languageChoice",
      items: [
        {
          value: "britishSignLanguage",
          text: "British Sign Language (BSL)",
        },
        {
          value: "otherLanguage",
          text: "Other language – interpreter needed",
          block: GovUKTextInput({
            code: "otherLanguageChoice",
            classes: GovUKUtilityClasses.Input.Width10,
            label: "Start typing to select the language ",
            inputType: "text",
            dependentWhen: Answer("languageChoice").match(
              Condition.Array.Contains("otherLanguage"),
            ),
            validWhen: [
              validation({
                condition: Self().match(Condition.IsRequired()),
                message: "Enter a language",
              }),
            ],
          }),
        },
      ],
    }),

    GovUKHeading({
      text: "Client’s communication and support needs (optional)",
      size: "m",
      visibleWhen: true,
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
          text: "Relay UK ",
        },
        {
          value: "otherSupport",
          text: "Any other support or accessibility needs",
          block: GovUKTextareaInput({
            code: "otherSupport",
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
                message: "Enter a language",
              }),
            ],
          }),
        },
      ],
    }),

    GovUKButton({ text: "Continue" }),
  ],
});