// Spike S1: does Forge reachability work when each step's `goto` is computed at
// runtime from the saved answers, rather than declared statically?
//
// The mini journey mirrors the planned design: a pure `stepsFor(answers)` decides
// which steps are relevant, a journey-level access effect hydrates all saved
// answers and publishes a per-step `nav` map, and each step redirects to
// `Data("nav.<code>")`.
import { strict as assert } from "assert";
import {
  journey,
  step,
  submit,
  access,
  redirect,
  validation,
  createForgePackage,
  EffectRegistry,
  Data,
  Self,
  Condition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKRadioInput,
  govukComponents,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { ForgeTestHarness } from "@ministryofjustice/hmpps-forge/core/testing";
import type { ForgeTestClient } from "@ministryofjustice/hmpps-forge/core/testing";

type Answers = Record<string, unknown>;
type SpikeSession = { eligibility?: Answers };

const ALL_STEPS = ["client-age", "under-18", "summary"] as const;

function stepsFor(answers: Answers): string[] {
  return ALL_STEPS.filter(
    (code) => code !== "under-18" || answers["client-age"] === "under_18",
  );
}

function navFor(answers: Answers): Record<string, string | undefined> {
  const steps = stepsFor(answers);
  return Object.fromEntries(steps.map((code, i) => [code, steps[i + 1]]));
}

const registry = new EffectRegistry();
const Effects = {
  LoadAnswers: registry.register(
    "SpikeLoadAnswers",
    () => async (context: EffectFunctionContext) => {
      const session = context.getSession() as SpikeSession;
      const saved = session.eligibility ?? {};
      for (const [code, value] of Object.entries(saved)) {
        context.setAnswer(code, value);
      }
      context.setData("nav", navFor(saved));
    },
  ),
  SaveAnswers: registry.register(
    "SpikeSaveAnswers",
    () => async (context: EffectFunctionContext) => {
      const session = context.getSession() as SpikeSession;
      session.eligibility = {
        ...session.eligibility,
        ...context.getAllAnswers(),
      };
      context.setData("nav", navFor(session.eligibility));
    },
  ),
};

function radioStep(code: string, entry = false) {
  return step({
    code,
    path: `/${code}`,
    title: code,
    ...(entry ? { reachability: { entryWhen: true } } : {}),
    view: { template: "spike.njk" },
    blocks: [
      CollectionBlock({
        collection: [
          GovUKRadioInput({
            code,
            fieldset: { legend: { text: code } },
            items:
              code === "client-age"
                ? [
                    { value: "under_18", text: "Under 18" },
                    { value: "standard", text: "18 or over" },
                  ]
                : [
                    { value: "yes", text: "Yes" },
                    { value: "no", text: "No" },
                  ],
            validWhen: [
              validation({
                condition: Self().match(Condition.IsRequired()),
                message: "Required",
              }),
            ],
          }),
          GovUKButton({ text: "Continue" }),
        ],
      }),
    ],
    onSubmission: [
      submit({
        validate: true,
        onValid: {
          effects: [Effects.SaveAnswers()],
          next: [redirect({ goto: Data(`nav.${code}`) })],
        },
      }),
    ],
  });
}

const spikeJourney = journey({
  code: "eligibility-spike",
  title: "Eligibility spike",
  path: "/eligibility",
  // Send users to the first unanswered relevant step rather than the entry step.
  reachability: { unreachableRedirect: "frontier" },
  onAccess: [access({ effects: [Effects.LoadAnswers()] })],
  steps: [
    radioStep("client-age", true),
    radioStep("under-18"),
    step({
      code: "summary",
      path: "/summary",
      title: "Summary",
      view: { template: "spike.njk" },
      blocks: [],
    }),
  ],
});

describe("Forge assumption S1: runtime-computed goto and reachability", () => {
  let client: ForgeTestClient;

  beforeEach(() => {
    client = new ForgeTestHarness()
      .registerGlobalComponents(govukComponents)
      .registerPackage(
        createForgePackage({ journey: spikeJourney, functions: [registry] }),
      )
      .createClient();
  });

  it("renders the entry step with an empty session", async () => {
    const result = await client.get("/eligibility/client-age", { session: {} });
    assert.equal(result.type, "render");
  });

  it("redirects to the conditional step when the answer makes it relevant", async () => {
    const session: SpikeSession = {};
    const result = await client.post("/eligibility/client-age", {
      session,
      body: { "client-age": "under_18" },
    });
    assert.equal(result.type, "redirect");
    assert.equal(
      result.type === "redirect" && result.url,
      "/eligibility/under-18",
    );
    assert.deepEqual(session.eligibility, { "client-age": "under_18" });
  });

  it("skips the conditional step when the answer makes it irrelevant", async () => {
    const session: SpikeSession = {};
    const result = await client.post("/eligibility/client-age", {
      session,
      body: { "client-age": "standard" },
    });
    assert.equal(
      result.type === "redirect" && result.url,
      "/eligibility/summary",
    );
  });

  it("re-renders with an error and does not save when invalid", async () => {
    const session: SpikeSession = {};
    const result = await client.post("/eligibility/client-age", {
      session,
      body: {},
    });
    assert.equal(result.type, "render");
    assert.equal(
      result.type === "render" &&
        result.getValidationErrorsByFieldCode("client-age").length > 0,
      true,
    );
    assert.equal(session.eligibility, undefined);
  });

  it("allows GET on a later step when saved answers make it reachable", async () => {
    const result = await client.get("/eligibility/under-18", {
      session: { eligibility: { "client-age": "under_18" } },
    });
    assert.equal(result.type, "render");
  });

  it("allows GET on the final step through the conditional branch", async () => {
    const result = await client.get("/eligibility/summary", {
      session: { eligibility: { "client-age": "under_18", "under-18": "no" } },
    });
    assert.equal(result.type, "render");
  });

  it("sends GET on a later step to the first unanswered relevant step", async () => {
    const result = await client.get("/eligibility/summary", {
      session: { eligibility: { "client-age": "under_18" } },
    });
    assert.equal(
      result.type === "redirect" && result.url,
      "/eligibility/under-18",
    );
  });

  it("blocks GET on a step the answers make irrelevant", async () => {
    const result = await client.get("/eligibility/under-18", {
      session: { eligibility: { "client-age": "standard" } },
    });
    assert.equal(
      result.type === "redirect" && result.url,
      "/eligibility/client-age",
    );
  });

  it("blocks GET on a later step with an empty session", async () => {
    const result = await client.get("/eligibility/summary", { session: {} });
    assert.equal(
      result.type === "redirect" && result.url,
      "/eligibility/client-age",
    );
  });

  it("re-routes when an earlier answer changes", async () => {
    const session: SpikeSession = {
      eligibility: { "client-age": "under_18", "under-18": "no" },
    };
    const post = await client.post("/eligibility/client-age", {
      session,
      body: { "client-age": "standard" },
    });
    assert.equal(post.type === "redirect" && post.url, "/eligibility/summary");
    const stale = await client.get("/eligibility/under-18", { session });
    assert.equal(
      stale.type === "redirect" && stale.url,
      "/eligibility/client-age",
    );
  });
});
