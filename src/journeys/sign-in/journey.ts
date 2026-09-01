import {
  journey,
  step,
} from "@ministryofjustice/hmpps-forge/core/authoring";

const loginStep = step({
  code: "sign-in",
  path: "/signin",
  title: "Taking calls from clients",
  reachability: { entryWhen: true },
  view: { template: "auth/login.njk" },
});

export const signInJourney = journey({
  code: "sign-in-journey",
  title: "Sign in",
  path: "/sign-in",
  view: {
    template: "partials/form-step",
  },
  steps: [loginStep],
});
