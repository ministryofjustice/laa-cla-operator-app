import eligibilityCopy from "../../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKSummaryList,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { Data } from "@ministryofjustice/hmpps-forge/core/authoring";

export const checkYourAnswersHeadingBlock = HtmlBlock({
  tag: "h1",
  content: eligibilityCopy.check_your_answers,
  classes: "govuk-heading-l",
});

export const checkYourAnswersSummaryBlock = HtmlBlock({
  tag: "div",
  content: eligibilityCopy.please_review_the_answers_you_have_provided_below,
  classes: "govuk-body govuk-!-margin-bottom-7",
});

export const checkYourAnswersButtonBlock = CollectionBlock({
  collection: [GovUKButton({ text: eligibilityCopy.accept_and_continue })],
});

export const checkYourAnswersListBlock = GovUKSummaryList({
  rows: Data("answerSummary"),
});
