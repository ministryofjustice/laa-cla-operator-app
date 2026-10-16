import { strict as assert } from "assert";
import { summaryRows } from "./summary.js";
import { levelOfHelpStep } from "../level-of-help/step.js";
import { applicantStep } from "../applicant/step.js";
import { assetsStep } from "../assets/step.js";
import { propertyEntryStep } from "../property-entry/step.js";
import { outgoingsStep } from "../outgoings/step.js";
import { partnerIncomeStep } from "../partner-income/step.js";

const steps = [
  levelOfHelpStep,
  applicantStep,
  assetsStep,
  propertyEntryStep,
  outgoingsStep,
  partnerIncomeStep,
];

describe("check your answers summary", () => {
  it("uses actual form questions and choice labels, not the CFE answer-key mapping", () => {
    const rows = summaryRows(steps, ["level_of_help", "applicant"], {
      level_of_help: "controlled",
      applicant: false,
      passporting: true,
      date_of_birth: "1990-01-01",
    });

    assert.deepEqual(rows, [
      {
        key: { text: "What type of legal aid is needed?" },
        value: { text: "Controlled work (advice only)" },
        actions: {
          items: [
            {
              href: "level-of-help#level_of_help",
              text: "Change",
              visuallyHiddenText: "What type of legal aid is needed?",
            },
          ],
        },
      },
      {
        key: { text: "Does your client have a partner?" },
        value: { text: "No" },
        actions: {
          items: [
            {
              href: "applicant#applicant",
              text: "Change",
              visuallyHiddenText: "Does your client have a partner?",
            },
          ],
        },
      },
      {
        key: { text: "Does your client receive a passporting benefit?" },
        value: { text: "Yes" },
        actions: {
          items: [
            {
              href: "applicant#passporting",
              text: "Change",
              visuallyHiddenText:
                "Does your client receive a passporting benefit?",
            },
          ],
        },
      },
    ]);
  });

  it("omits unanswered optional fields and answers on obsolete branches", () => {
    const rows = summaryRows(steps, ["assets"], {
      partner_income: "1000",
      investments_relevant: false,
      investments: "",
      investments_in_dispute: [],
      valuables_relevant: null,
      valuables: undefined,
    });

    assert.deepEqual(
      rows.map((row) => [row.key.text, row.value?.text]),
      [["Does your client have any investments?", "No"]],
    );
  });

  it("preserves zero and free-text answers", () => {
    const rows = summaryRows(steps, ["property_entry", "partner_income"], {
      house_value: 0,
      partner_income: "1234.56",
    });

    assert.deepEqual(
      rows.map((row) => row.value?.text),
      ["0", "1234.56"],
    );
  });

  it("formats checkbox selections and payment frequencies using option labels", () => {
    const rows = summaryRows(steps, ["assets", "outgoings"], {
      investments_in_dispute: ["true"],
      childcare_payments_frequency: "four_weekly",
    });

    assert.deepEqual(
      rows.map((row) => row.value?.text),
      ["This asset is a subject matter of dispute", "Every 4 weeks"],
    );
  });

  it("keeps user-entered markup as text for the summary component to escape", () => {
    const rows = summaryRows(steps, ["partner_income"], {
      partner_income: "<script>alert('test')</script>",
    });
    assert.deepEqual(rows[0].value, {
      text: "<script>alert('test')</script>",
    });
  });

  it("fails explicitly if a relevant step has no registered definition", () => {
    assert.throws(
      () => summaryRows(steps, ["missing"], {}),
      /Missing eligibility step: missing/u,
    );
  });
});
