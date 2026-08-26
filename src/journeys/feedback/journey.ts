import {
  journey,
  step,
  submit,
  redirect,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  GovUKTextInput,
  GovUKTextareaInput,
  GovUKButton,
  GovUKPanel,
} from "@ministryofjustice/hmpps-forge/govuk-components";

// Step 1: entry page for the journey.
const nameStep = step({
  path: "/",
  title: "What is your name?",
  reachability: { entryWhen: true },
  blocks: [
    GovUKTextInput({
      code: "fullName",
      label: {
        text: "What is your name?",
        isPageHeading: true,
        classes: "govuk-label--l",
      },
    }),
    GovUKButton({ text: "Continue" }),
  ],
  onSubmission: [
    submit({
      validate: true,
      // On valid submit, move to the next step in this journey.
      onValid: {
        next: [redirect({ goto: "your-feedback" })],
      },
    }),
  ],
});

// Step 2: collect user feedback.
const feedbackStep = step({
  path: "/your-feedback",
  title: "Your feedback",
  blocks: [
    GovUKTextareaInput({
      code: "feedback",
      label: {
        text: "Your feedback",
        isPageHeading: true,
        classes: "govuk-label--l",
      },
      hint: { text: "Tell us what you think of this service." },
    }),
    GovUKButton({ text: "Send feedback" }),
  ],
  onSubmission: [
    submit({
      validate: true,
      // On valid submit, go to confirmation.
      onValid: {
        next: [redirect({ goto: "confirmation" })],
      },
    }),
  ],
});

// Step 3: simple confirmation screen.
const confirmationStep = step({
  path: "/confirmation",
  title: "Feedback sent",
  blocks: [GovUKPanel({ titleText: "Feedback sent" })],
});

// Journey definition: base route, template, and ordered step list.
export const feedbackJourney = journey({
  code: "feedback",
  title: "Give feedback",
  path: "/feedback",
  view: { template: "partials/form-step" },
  steps: [nameStep, feedbackStep, confirmationStep],
});
