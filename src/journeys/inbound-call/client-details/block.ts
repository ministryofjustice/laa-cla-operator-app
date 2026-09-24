import {
  Condition,
  Self,
  validation,
  and,
  or,
  Generator,
  Transformer,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKRadioInput,
  GovUKTextInput,
  GovUKDateInputFull,
  GovUKHeading,
  GovUKBody,
  GovUKUtilityClasses,
} from "@ministryofjustice/hmpps-forge/govuk-components";

const MAX_CLIENT_AGE_YEARS = 120;

export const clientDetailsBlock = CollectionBlock({
  collection: [
    GovUKHeading({ text: "Client's personal details", size: "m" }),

    GovUKTextInput({
      code: "fullName",
      label: { text: "Name", classes: GovUKUtilityClasses.Label.Small },
      validWhen: [
        validation({
          condition: Self().match(Condition.IsRequired()),
          message: "Enter the client’s name",
        }),
      ],
    }),

    GovUKDateInputFull({
      code: "dateOfBirth",
      fieldset: {
        legend: {
          text: "Date of birth",
          classes: "govuk-fieldset__legend--s",
        },
      },
      hint: { text: "For example, 27 3 2007" },
      validWhen: [
        validation({
          condition: Self().match(Condition.Date.IsValid()),
          message: "Enter a valid date of birth",
        }),
        validation({
          condition: or(
            Self().not.match(Condition.Date.IsValid()),
            Self().not.match(Condition.Date.IsFutureDate()),
          ),
          message: "Year cannot be in the future",
          details: { field: "year" },
        }),
        validation({
          condition: or(
            Self().not.match(Condition.Date.IsValid()),
            Self().not.match(
              Condition.Date.IsBefore(
                Generator.Date.Today().pipe(
                  Transformer.Date.AddYears(-MAX_CLIENT_AGE_YEARS),
                  Transformer.Date.Format("YYYY-MM-DD"),
                ),
              ),
            ),
          ),
          message: "Year cannot be more than 120 years ago",
          details: { field: "year" },
        }),
      ],
    }),

    GovUKHeading({ text: "Client's contact preferences", size: "m" }),

    GovUKTextInput({
      code: "phoneNumber",
      label: {
        text: "Phone number",
        classes: GovUKUtilityClasses.Label.Small,
      },
      validWhen: [
        validation({
          condition: and(
            Self().match(Condition.IsRequired()),
            Self().match(Condition.Phone.IsValidPhoneNumber()),
          ),
          message: "Enter a valid phone number",
        }),
      ],
    }),

    GovUKRadioInput({
      code: "safeToCall",
      fieldset: {
        legend: {
          text: "Is it safe to call this number?",
          classes: "govuk-fieldset__legend--s",
        },
      },
      items: [
        { value: "yes", text: "Yes" },
        { value: "no", text: "No" },
      ],
    }),

    GovUKRadioInput({
      code: "safeToLeaveMessage",
      fieldset: {
        legend: {
          text: "Is it safe to leave a message?",
          classes: "govuk-fieldset__legend--s",
        },
      },
      items: [
        { value: "yes", text: "Yes" },
        { value: "no", text: "No" },
      ],
    }),

    GovUKRadioInput({
      code: "acceptsWithheldCalls",
      fieldset: {
        legend: {
          text: "If safe to call, does your phone accept calls from a withheld number?",
          classes: "govuk-fieldset__legend--s",
        },
      },
      hint: {
        text: "When we call you back, our number will not display and your phone may show 'No Caller ID', 'Private number' or 'Number withheld'. Call screening settings mean some phones do not accept withheld numbers.",
        classes: "govuk-!-margin-top-2",
      },
      items: [
        {
          value: "yes",
          text: "Yes",
          block: GovUKBody({
            text: "Prompt the client to add Civil Legal Advice as a contact using 0345 345 4345 'just in case'",
            classes: "govuk-!-margin-top-2",
          }),
        },
        {
          value: "no",
          text: "No",
          block: [
            GovUKBody({
              text: "We will try to call you back 3 times but if we can't get through you will have to contact us again to continue your case.",
            }),
            GovUKBody({
              text: "Prompt the client to adjust the settings on their phone or add Civil Legal Advice as a contact using 0345 345 4345.",
              classes: "govuk-!-margin-top-2",
            }),
          ],
        },
      ],
    }),

    GovUKTextInput({
      code: "email",
      label: {
        text: "Email (optional)",
        classes: GovUKUtilityClasses.Label.Small,
      },
      inputType: "email",
    }),

    GovUKButton({ text: "Save and continue" }),
  ],
});
