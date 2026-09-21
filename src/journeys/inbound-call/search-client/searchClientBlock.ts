import { CollectionBlock, HtmlBlock } from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKPagination ,
  GovUKButton,
  GovUKDateInputFull,
  GovUKTextInput,
  GovUKTable,
  GovUKButtonGroup,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { Data, Item, Iterator, Generator, validation, Self, Condition, or, match, Format, Answer, Loop } from "@ministryofjustice/hmpps-forge/core/authoring";

export const searchClientBlock = CollectionBlock({
    classes: "search-client-box",
    collection: [
        GovUKTextInput({
        code: "fullName",
        label: {
            text: "What's your name?",
            classes: "govuk-label--s",
        },
        validWhen: [
            validation({
                condition: or(
                    Self().not.match(Condition.IsRequired()),
                    Self().match(Condition.String.LettersWithSpaceDashApostrophe())
                ),
                message: "Full name must only contain letters, spaces, hyphens and apostrophes",
            }),
        ]
        }),
        GovUKTextInput({
        code: "phone",
        label: {
            text: "What's your phone number?",
            classes: "govuk-label--s",
        },
        hint: {
            text: "If the client is uncomfortable sharing their number, explain they'll only be contacted when it is safe and convenient to do so.",
        },
        validWhen: [
            validation({
                condition: or(
                    Self().not.match(Condition.IsRequired()),
                    Self().match(Condition.Phone.IsValidPhoneNumber())
                ),
                message: "Phone number must be valid",
            })
        ]
        }),
        GovUKTextInput({
        code: "postcode",
        label: {
            text: "What's your postcode?",
            classes: "govuk-label--s",
        },
        validWhen: [
            validation({
                condition: or(
                    Self().not.match(Condition.IsRequired()),
                    Self().match(Condition.Address.IsValidPostcode())
                ),
                message: "Postcode must be valid",
            })
        ]
        }),
        GovUKDateInputFull({
        code: "dateOfBirth",
        fieldset: {
            legend: {
            text: "What's your date of birth?",
            classes: "govuk-fieldset__legend--s",
            },
        },
        hint: {
            text: "For example, 27 3 2007",
        },
        }),
        GovUKButtonGroup({
            buttons: [
                GovUKButton({
                text: "Search",
                name: "action",
                value: "search",
            }),
                HtmlBlock({
                        tag: 'a',
                        attributes: {
                            class: 'govuk-link',
                            href: "/receive-call/search-client?clear=1",
                        },
                        content: 'Clear form',
                    })
            ],
        })

    ],
});


export const createCaseButtonBlock = GovUKButton({
  text: match(Answer("fullName"))
    .branch(
      Condition.IsRequired(),
      Format("Start a new case for %1", Answer("fullName")),
    )
    .otherwise("Start a new case"),
  classes: "govuk-button--secondary",
  name: "action",
  value: "createCase",
});


export const displaySearchClientBlock = CollectionBlock({
    collection: [
        GovUKTable({
            head: [{ text: "Full Name" }, { text: "Phone" }, { text: "Postcode" }, { text: "Date of Birth" }],
            rows: Data('searchResults').path('results').each(
                Iterator.Map([
                // TODO: The full href for cases needs to be adjusted once its build
                    {html: Generator.FormatString(
                    '<a class="govuk-link" href="/case/ref=%1">%2</a>',
                    Item().path("reference"),
                    Item().path("full_name"),
                    )},
                    { text: Item().path('phone') },
                    { text: Item().path('postcode') },
                    { text: Item().path('date_of_birth') },
                ]),
            ),
        }),
        GovUKPagination({
            previous: {
                href: Generator.FormatString('/receive-call/search-client?page=%1', Data('searchPreviousPage')),
                visibleWhen: Data('searchHasPrevious'),
            },
            next: {
                href: Generator.FormatString('/receive-call/search-client?page=%1', Data('searchNextPage')),
                visibleWhen: Data('searchHasNext'),
            },
            items: Data('searchPages').each(
                Iterator.Map({
                    number: Loop.Index(),
                    href: Generator.FormatString('/receive-call/search-client?page=%1', Loop.Index()),
                    current: Loop.Index().match(Condition.Equals(Data('searchCurrentPage'))),
                    visuallyHiddenText: Generator.FormatString('Page %1', Loop.Index())
                }),
            ),
        })
    ],
});