// Spike S2: can Forge handle CCQ's add-another lists (for example bank
// accounts), with a field per row and validation per row?
//
// Rows are generated with Iterator.Map over Data("bankAccountRows"). Field
// codes are flat (bank_accounts_0_amount) because Forge reads posted values by
// literal name, and this app's extended body parser turns bracket names
// (bank_accounts[0][amount], as CCQ uses) into nested objects Forge cannot see.
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
  Format,
  Item,
  Iterator,
  Loop,
  Post,
  Self,
  Condition,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";
import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import {
  GovUKButton,
  GovUKTextInput,
  govukComponents,
} from "@ministryofjustice/hmpps-forge/govuk-components";
import { ForgeTestHarness } from "@ministryofjustice/hmpps-forge/core/testing";
import type {
  ForgeTestClient,
  TestResult,
} from "@ministryofjustice/hmpps-forge/core/testing";

type BankAccount = { amount: unknown };
type SpikeSession = { eligibility?: { bank_accounts?: BankAccount[] } };

const FIELD = /^bank_accounts_(\d+)_amount$/;
const fieldCode = (index: number): string => `bank_accounts_${index}_amount`;

function postedRowCount(context: EffectFunctionContext): number {
  const indexes = Object.keys(context.getAllPostData())
    .map((key) => FIELD.exec(key)?.[1])
    .filter((index) => index !== undefined)
    .map(Number);
  return indexes.length ? Math.max(...indexes) + 1 : 0;
}

function rows(count: number): { code: string }[] {
  return Array.from({ length: Math.max(count, 1) }, (_, i) => ({
    code: fieldCode(i),
  }));
}

const registry = new EffectRegistry();
const Effects = {
  // On GET, one row per saved account. On POST, one row per posted account,
  // so rows added in the browser are prepared and validated.
  LoadAnswers: registry.register(
    "SpikeS2LoadAnswers",
    () => async (context: EffectFunctionContext) => {
      const saved =
        (context.getSession() as SpikeSession).eligibility?.bank_accounts ?? [];
      saved.forEach((account, i) =>
        context.setAnswer(fieldCode(i), account.amount),
      );
      const count = postedRowCount(context) || saved.length;
      context.setData("bankAccountRows", rows(count));
    },
  ),
  AddRow: registry.register(
    "SpikeS2AddRow",
    () => async (context: EffectFunctionContext) => {
      context.setData("bankAccountRows", rows(postedRowCount(context) + 1));
    },
  ),
  SaveAnswers: registry.register(
    "SpikeS2SaveAnswers",
    () => async (context: EffectFunctionContext) => {
      const answers = context.getAllAnswers();
      const session = context.getSession() as SpikeSession;
      session.eligibility = {
        ...session.eligibility,
        bank_accounts: Array.from(
          { length: postedRowCount(context) },
          (_, i) => ({
            amount: answers[fieldCode(i)],
          }),
        ),
      };
    },
  ),
};

const spikeJourney = journey({
  code: "eligibility-s2-spike",
  title: "Eligibility S2 spike",
  path: "/eligibility",
  onAccess: [access({ effects: [Effects.LoadAnswers()] })],
  steps: [
    step({
      code: "assets",
      path: "/assets",
      title: "Assets",
      reachability: { entryWhen: true },
      view: { template: "spike.njk" },
      blocks: [
        CollectionBlock({
          collection: Data("bankAccountRows").each(
            Iterator.Map(
              GovUKTextInput({
                code: Item().path("code"),
                label: { text: Format("Bank account %1", Loop.Index()) },
                validWhen: [
                  validation({
                    condition: Self().match(Condition.IsRequired()),
                    message: Format(
                      "Enter the amount in bank account %1",
                      Loop.Index(),
                    ),
                  }),
                ],
              }),
            ),
          ),
        }),
        GovUKButton({
          text: "Add another account",
          name: "action",
          value: "add",
        }),
        GovUKButton({ text: "Continue", name: "action", value: "continue" }),
      ],
      onSubmission: [
        submit({
          when: Post("action").match(Condition.Equals("add")),
          validate: false,
          onAlways: { effects: [Effects.AddRow()] },
        }),
        submit({
          validate: true,
          onValid: {
            effects: [Effects.SaveAnswers()],
            next: [redirect({ goto: "done" })],
          },
        }),
      ],
    }),
    step({
      code: "done",
      path: "/done",
      title: "Done",
      view: { template: "spike.njk" },
      blocks: [],
    }),
  ],
});

interface RenderedField {
  code: string;
  value?: unknown;
  label?: { text: string };
}

function textInputs(result: TestResult): RenderedField[] {
  assert.equal(result.type, "render");
  const found: RenderedField[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === "object") {
      const block = node as { variant?: string; properties?: RenderedField };
      if (block.variant === "govukTextInput" && block.properties) {
        found.push(block.properties);
      }
      Object.values(node).forEach(walk);
    }
  };
  walk(result.type === "render" ? result.context.blocks : []);
  return found;
}

function errors(result: TestResult, code: string): string[] {
  return result.type === "render"
    ? result.getValidationErrorsByFieldCode(code).map((e) => String(e.message))
    : [];
}

describe("Forge assumption S2: add-another lists", () => {
  let client: ForgeTestClient;

  beforeEach(() => {
    client = new ForgeTestHarness()
      .registerGlobalComponents(govukComponents)
      .registerPackage(
        createForgePackage({ journey: spikeJourney, functions: [registry] }),
      )
      .createClient();
  });

  it("renders one empty row when nothing is saved", async () => {
    const result = await client.get("/eligibility/assets", { session: {} });
    const fields = textInputs(result);
    assert.deepEqual(
      fields.map((f) => [f.code, f.label?.text]),
      [["bank_accounts_0_amount", "Bank account 1"]],
    );
  });

  it("renders a pre-filled row for each saved account", async () => {
    const result = await client.get("/eligibility/assets", {
      session: {
        eligibility: { bank_accounts: [{ amount: "100" }, { amount: "250" }] },
      },
    });
    assert.deepEqual(
      textInputs(result).map((f) => [f.code, f.value]),
      [
        ["bank_accounts_0_amount", "100"],
        ["bank_accounts_1_amount", "250"],
      ],
    );
  });

  it("saves every posted row, in order, as a list", async () => {
    const session: SpikeSession = {};
    const result = await client.post("/eligibility/assets", {
      session,
      body: {
        action: "continue",
        bank_accounts_0_amount: "100",
        bank_accounts_1_amount: "250",
        bank_accounts_2_amount: "3",
      },
    });
    assert.equal(result.type === "redirect" && result.url, "/eligibility/done");
    assert.deepEqual(session.eligibility?.bank_accounts, [
      { amount: "100" },
      { amount: "250" },
      { amount: "3" },
    ]);
  });

  it("validates each row and numbers the error by position", async () => {
    const session: SpikeSession = {};
    const result = await client.post("/eligibility/assets", {
      session,
      body: {
        action: "continue",
        bank_accounts_0_amount: "100",
        bank_accounts_1_amount: "",
      },
    });
    assert.deepEqual(errors(result, "bank_accounts_0_amount"), []);
    assert.deepEqual(errors(result, "bank_accounts_1_amount"), [
      "Enter the amount in bank account 2",
    ]);
    assert.equal(session.eligibility, undefined);
  });

  it("adds a row without JavaScript, keeping typed values and not validating", async () => {
    const result = await client.post("/eligibility/assets", {
      session: {},
      body: { action: "add", bank_accounts_0_amount: "100" },
    });
    assert.deepEqual(
      textInputs(result).map((f) => [f.code, f.value]),
      [
        ["bank_accounts_0_amount", "100"],
        ["bank_accounts_1_amount", undefined],
      ],
    );
    assert.deepEqual(errors(result, "bank_accounts_1_amount"), []);
  });

  it("does not read nested bodies, so bracket field names cannot be used", async () => {
    // What express.urlencoded({ extended: true }) makes of
    // bank_accounts[0][amount]=100. Tripwire: if Forge starts reading nested
    // bodies, this fails and bracket names can be reconsidered.
    const result = await client.post("/eligibility/assets", {
      session: {},
      body: { action: "continue", bank_accounts: [{ amount: "100" }] },
    });
    assert.equal(result.type, "render");
  });
});
