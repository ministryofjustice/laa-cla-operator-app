// Spike S4: do session writes made by Forge effects persist across a real
// Express POST -> redirect -> GET, using express-session as this app does?
//
// Answers are stored per check under req.session.eligibility[checkId], so two
// checks in the same browser session must not see each other's answers.
import { strict as assert } from "assert";
import path from "node:path";
import express from "express";
import session from "express-session";
import nunjucks from "nunjucks";
import request from "supertest";
import { Forge } from "@ministryofjustice/hmpps-forge/core";
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
import { createExpressRouter } from "@ministryofjustice/hmpps-forge/express-nunjucks";

type Answers = Record<string, unknown>;
type SpikeSession = { eligibility?: Record<string, Answers> };

function navFor(answers: Answers): Record<string, string | undefined> {
  return {
    "client-age": answers["client-age"] === "under_18" ? "under-18" : "summary",
    "under-18": "summary",
  };
}

function checkAnswers(context: EffectFunctionContext): Answers {
  const store = context.getSession() as SpikeSession;
  const checkId = context.getRequestParam("checkId") as string;
  store.eligibility ??= {};
  store.eligibility[checkId] ??= {};
  return store.eligibility[checkId];
}

const registry = new EffectRegistry();
const Effects = {
  LoadAnswers: registry.register(
    "SpikeS4LoadAnswers",
    () => async (context: EffectFunctionContext) => {
      const saved = checkAnswers(context);
      for (const [code, value] of Object.entries(saved)) {
        context.setAnswer(code, value);
      }
      context.setData("nav", navFor(saved));
    },
  ),
  SaveAnswers: registry.register(
    "SpikeS4SaveAnswers",
    () => async (context: EffectFunctionContext) => {
      const saved = checkAnswers(context);
      Object.assign(saved, context.getAllAnswers());
      context.setData("nav", navFor(saved));
    },
  ),
};

function radioStep(code: string, entry = false) {
  return step({
    code,
    path: `/${code}`,
    title: code,
    ...(entry ? { reachability: { entryWhen: true } } : {}),
    blocks: [
      CollectionBlock({
        collection: [
          GovUKRadioInput({
            code,
            fieldset: { legend: { text: code } },
            items: [
              { value: "under_18", text: "Under 18" },
              { value: "standard", text: "18 or over" },
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
  code: "eligibility-s4-spike",
  title: "Eligibility S4 spike",
  path: "/check/:checkId",
  view: { template: "spike.njk" },
  reachability: { unreachableRedirect: "frontier" },
  onAccess: [access({ effects: [Effects.LoadAnswers()] })],
  steps: [
    radioStep("client-age", true),
    radioStep("under-18"),
    step({ code: "summary", path: "/summary", title: "Summary", blocks: [] }),
  ],
});

function buildApp(): express.Express {
  const nunjucksEnv = new nunjucks.Environment(
    new nunjucks.FileSystemLoader([
      path.join(import.meta.dirname, "fixtures"),
      path.resolve("node_modules/govuk-frontend/dist"),
    ]),
  );
  const forge = new Forge({
    logger: {
      info() {},
      warn() {},
      error() {},
      debug() {},
    } as unknown as Console,
  })
    .registerGlobalComponents(govukComponents)
    .registerPackage(
      createForgePackage({ journey: spikeJourney, functions: [registry] }),
    );

  const app = express();
  // Same options as config.session, with the app's MemoryStore default.
  app.use(
    session({ secret: "spike", resave: false, saveUninitialized: false }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use("/", createExpressRouter(forge, { nunjucksEnv }));
  return app;
}

describe("Forge assumption S4: session writes persist across POST -> redirect", () => {
  let app: express.Express;

  beforeEach(() => {
    app = buildApp();
  });

  it("renders the next step after a POST, using answers saved in the session", async () => {
    const agent = request.agent(app);

    const post = await agent
      .post("/check/a/client-age")
      .type("form")
      .send({ "client-age": "under_18" });
    assert.equal(post.status, 302);
    assert.equal(post.headers.location, "/check/a/under-18");

    // Only reachable if client-age was persisted between requests.
    const next = await agent.get("/check/a/under-18");
    assert.equal(next.status, 200);
    assert.match(next.text, /<h1>under-18<\/h1>/);
  });

  it("pre-fills a previous answer when the user goes back", async () => {
    const agent = request.agent(app);
    await agent
      .post("/check/a/client-age")
      .type("form")
      .send({ "client-age": "under_18" });

    const back = await agent.get("/check/a/client-age");
    assert.equal(back.status, 200);
    assert.match(back.text, /value="under_18"\s+checked/);
  });

  it("persists answers across several steps", async () => {
    const agent = request.agent(app);
    await agent
      .post("/check/a/client-age")
      .type("form")
      .send({ "client-age": "under_18" });
    const post = await agent
      .post("/check/a/under-18")
      .type("form")
      .send({ "under-18": "no" });
    assert.equal(post.headers.location, "/check/a/summary");

    const summary = await agent.get("/check/a/summary");
    assert.equal(summary.status, 200);
  });

  it("does not share answers with a different browser session", async () => {
    await request
      .agent(app)
      .post("/check/a/client-age")
      .type("form")
      .send({ "client-age": "under_18" });

    const other = await request.agent(app).get("/check/a/under-18");
    assert.equal(other.status, 302);
    assert.equal(other.headers.location, "/check/a/client-age");
  });

  it("keeps two checks in the same browser session separate", async () => {
    const agent = request.agent(app);
    await agent
      .post("/check/a/client-age")
      .type("form")
      .send({ "client-age": "under_18" });
    await agent
      .post("/check/b/client-age")
      .type("form")
      .send({ "client-age": "standard" });

    assert.equal((await agent.get("/check/a/under-18")).status, 200);
    const b = await agent.get("/check/b/under-18");
    assert.equal(b.status, 302);
  });
});
