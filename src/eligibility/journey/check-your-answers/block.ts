import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
} from "@ministryofjustice/hmpps-forge/govuk-components";

export const checkYourAnswersHeadingBlock = HtmlBlock({
  tag: "h1",
  content: "Check your answers",
  classes: "govuk-heading-l",
});

export const checkYourAnswersSummaryBlock = HtmlBlock({
  tag: "div",
  content: "Please review the answers you have provided below.",
  classes: "govuk-body govuk-!-margin-bottom-7",
});

export const checkYourAnswersButtonBlock = CollectionBlock({
  collection: [
    GovUKButton({ text: "Accept and continue" }),
  ],
});
