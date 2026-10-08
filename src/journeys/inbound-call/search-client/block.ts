import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKPagination,
  GovUKButton,
  GovUKDateInputFull,
  GovUKTextInput,
  GovUKTable,
  GovUKButtonGroup,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import {
  Data,
  Item,
  Iterator,
  Generator,
  validation,
  Self,
  Condition,
  or,
  match,
  Format,
  Answer,
  Loop,
  and,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const searchClientIntroBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "div",
      classes: "govuk-inset-text taking-call-inset govuk-!-margin-bottom-7",
      content: Format(
        `<p class="govuk-body">Thank you for calling the Civil Legal Advice helpline, my name is %1.</p>
        <p class="govuk-body">I'm going to ask you some questions about your legal problem and your financial situation to check if you are eligible for legal aid.</p>
        <p class="govuk-body">I am not trained to give legal advice. If you are likely to be eligible for legal aid, I'll refer you to a legal professional at the end of this call. Depending on your problem, they may need to complete further checks before they can help.</p>
        <p class="govuk-body">If you are not eligible for legal aid, I'll try to direct you to someone else who can help you.</p>
        <p class="govuk-body">As a first step, I'm going to take a few details from you. The information you give me will be stored on our system to help us assess your case.</p>`,
        match(Data("userName"))
          .branch(Condition.IsRequired(), Data("userName"))
          .otherwise("[agent's name]"),
      ),
    }),
    HtmlBlock({
      tag: "h2",
      content: "Search for client’s details",
      classes: "govuk-heading-l govuk-!-margin-bottom-6",
    }),
    HtmlBlock({
      tag: "div",
      content: `<p class="govuk-body">Ask the caller if they are phoning on their own behalf, or acting as a third party for another person (the ‘client’).</p>
        <p class="govuk-body">Then, take the client’s details and search for any existing records before starting a new case.</p>`,
      classes: "govuk-!-margin-bottom-7",
    }),
    HtmlBlock({
      tag: "div",
      classes: "govuk-!-margin-bottom-7",
      content: `<p class="govuk-body govuk-!-font-weight-bold">Find a client using one or more of the search terms below.</p>`,
    }),
  ],
});

export const searchClientFormBlock = CollectionBlock({
  classes: "search-client-box",
  collection: [
    GovUKTextInput({
      code: "fullName",
      classes: "govuk-input--width-30",
      label: {
        text: "Client's name",
        classes: "govuk-label--s",
      },
      validWhen: [
        validation({
          condition: or(
            Self().not.match(Condition.IsRequired()),
            Self().match(Condition.String.LettersWithSpaceDashApostrophe()),
          ),
          message: "Full name must be valid",
        }),
      ],
    }),
    GovUKTextInput({
      code: "phone",
      classes: "govuk-input--width-20",
      label: {
        text: "Client's phone number",
        classes: "govuk-label--s",
      },
      hint: {
        text: "You can explain the client will only be contacted when it’s safe to do so.",
      },
      validWhen: [
        validation({
          condition: or(
            Self().not.match(Condition.IsRequired()),
            Self().match(Condition.Phone.IsValidPhoneNumber()),
          ),
          message: "Phone number must be valid",
        }),
      ],
    }),
    GovUKTextInput({
      code: "postcode",
      classes: "govuk-input--width-10",
      label: {
        text: "Client's postcode",
        classes: "govuk-label--s",
      },
      validWhen: [
        validation({
          condition: or(
            Self().not.match(Condition.IsRequired()),
            Self().match(Condition.Address.IsValidPostcode()),
          ),
          message: "Postcode must be valid",
        }),
      ],
    }),
    GovUKDateInputFull({
      code: "dateOfBirth",
      fieldset: {
        legend: {
          text: "Client's date of birth",
          classes: "govuk-fieldset__legend--s",
        },
      },
      hint: {
        text: "For example, 27 3 2007",
      },
      validWhen: [
        validation({
          condition: or(
            and(
              Self().match(Condition.Object.IsObject()),
              Self().not.match(Condition.Object.PropertyHasValue("day")),
              Self().not.match(Condition.Object.PropertyHasValue("month")),
              Self().not.match(Condition.Object.PropertyHasValue("year")),
            ),
            Self().match(Condition.Date.IsValid()),
          ),
          message: "Date of birth must be valid",
        }),
      ],
    }),
    GovUKButtonGroup({
      buttons: [
        GovUKButton({
          text: "Search",
          name: "action",
          value: "search",
        }),
        HtmlBlock({
          tag: "a",
          attributes: {
            class: "govuk-link",
            href: "/receive-call/search-client?clear=1",
          },
          content: "Clear form",
        }),
      ],
    }),
  ],
});

export const createCaseButtonBlock = GovUKButton({
  text: match(Answer("fullName"))
    .branch(
      Condition.IsRequired(),
      Format("Start a new case for %1", Answer("fullName")),
    )
    .otherwise("Start a new case using the details entered"),
  classes: "govuk-button--secondary",
  name: "action",
  value: "createCase",
});

export const displaySearchClientBlock = CollectionBlock({
  collection: [
    GovUKTable({
      head: [
        { text: "Name" },
        { text: "Phone number" },
        { text: "Postcode" },
        { text: "Date of Birth" },
      ],
      rows: Data("searchResults")
        .path("results")
        .each(
          Iterator.Map([
            // TODO: The full href for cases needs to be adjusted once its build
            {
              html: Generator.FormatString(
                '<a class="govuk-link" href="/case/%1">%2</a>',
                Item().path("reference"),
                Item().path("full_name"),
              ),
            },
            { text: Item().path("mobile_phone") },
            { text: Item().path("postcode") },
            { text: Item().path("date_of_birth") },
          ]),
        ),
    }),
    GovUKPagination({
      previous: {
        href: Generator.FormatString(
          "/receive-call/search-client?page=%1&q=%2",
          Data("searchPreviousPage"),
          Data("searchParam"),
        ),
        visibleWhen: Data("searchHasPrevious"),
      },
      next: {
        href: Generator.FormatString(
          "/receive-call/search-client?page=%1&q=%2",
          Data("searchNextPage"),
          Data("searchParam"),
        ),
        visibleWhen: Data("searchHasNext"),
      },
      items: Data("searchPages").each(
        Iterator.Map({
          number: Loop.Index(),
          href: Generator.FormatString(
            "/receive-call/search-client?page=%1&q=%2",
            Loop.Index(),
            Data("searchParam"),
          ),
          current: Loop.Index().match(
            Condition.Equals(Data("searchCurrentPage")),
          ),
          visuallyHiddenText: Generator.FormatString("Page %1", Loop.Index()),
        }),
      ),
    }),
  ],
});
