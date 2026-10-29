import { strict as assert } from "assert";
import {
  collapseLists,
  describeRows,
  formAnswersFor,
  rowCountFor,
  withBlankRow,
  withoutRow,
  type AddAnotherList,
} from "./add-another.js";
import {
  BANK_ACCOUNTS_LIST,
  ADDITIONAL_PROPERTIES_LIST,
  INCOMES_LIST,
  PARTNER_ADDITIONAL_PROPERTIES_LIST,
  PARTNER_INCOMES_LIST,
} from "./index.js";

const lists = [
  BANK_ACCOUNTS_LIST,
  INCOMES_LIST,
  PARTNER_INCOMES_LIST,
  ADDITIONAL_PROPERTIES_LIST,
  PARTNER_ADDITIONAL_PROPERTIES_LIST,
];
const list: AddAnotherList = INCOMES_LIST;

describe("lists/add-another", () => {
  it("collapses flat row fields into a rows array, reading amounts as numbers", () => {
    const answers = collapseLists(lists, {
      level_of_help: "controlled",
      incomes_0_income_type: "employment",
      incomes_0_gross_income: "1000.50",
      incomes_1_income_type: "self_employment",
      incomes_1_gross_income: "oops",
    });

    assert.deepEqual(answers, {
      level_of_help: "controlled",
      incomes: [
        { income_type: "employment", gross_income: 1000.5 },
        { income_type: "self_employment", gross_income: "oops" },
      ],
    });
  });

  it("does not mistake the partner's rows for the client's", () => {
    const answers = collapseLists(lists, {
      partner_incomes_0_gross_income: "500",
    });

    assert.deepEqual(answers, {
      partner_incomes: [{ gross_income: 500 }],
    });
  });

  it("reads a ticked checkbox as true and an unticked one as absent", () => {
    const answers = collapseLists(lists, {
      bank_accounts_0_amount: "10",
      bank_accounts_0_account_in_dispute: ["true"],
      bank_accounts_1_amount: "20",
    });

    it("preserves boolean answers on additional-property rows", () => {
      const answers = collapseLists(lists, {
        additional_properties_0_house_value: "150000",
        additional_properties_0_inline_owned_with_mortgage: "false",
        additional_properties_0_percentage_owned: "50",
        partner_additional_properties_0_inline_owned_with_mortgage: "true",
      });

      assert.deepEqual(answers.additional_properties, [
        {
          house_value: 150000,
          inline_owned_with_mortgage: false,
          percentage_owned: 50,
        },
      ]);
      assert.deepEqual(answers.partner_additional_properties, [
        { inline_owned_with_mortgage: true },
      ]);
      assert.deepEqual(
        formAnswersFor(ADDITIONAL_PROPERTIES_LIST, {
          additional_properties: [
            { inline_owned_with_mortgage: false, house_value: 150000 },
          ],
        }),
        {
          additional_properties_0_house_value: "150000",
          additional_properties_0_inline_owned_with_mortgage: "false",
        },
      );
    });

    assert.deepEqual(answers.bank_accounts, [
      { amount: 10, account_in_dispute: true },
      { amount: 20 },
    ]);
  });

  it("leaves answers without row fields alone", () => {
    const answers = { level_of_help: "controlled", incomes: [{}] };

    assert.deepEqual(collapseLists(lists, answers), answers);
  });

  it("pre-fills row fields from saved rows as strings", () => {
    assert.deepEqual(
      formAnswersFor(list, {
        incomes: [{ income_type: "employment", gross_income: 1000.5 }],
      }),
      {
        incomes_0_income_type: "employment",
        incomes_0_gross_income: "1000.5",
      },
    );
  });

  it("pre-fills a ticked checkbox as the list of its ticked options", () => {
    assert.deepEqual(
      formAnswersFor(BANK_ACCOUNTS_LIST, {
        bank_accounts: [
          { amount: 10, account_in_dispute: true },
          { amount: 20, account_in_dispute: false },
        ],
      }),
      {
        bank_accounts_0_amount: "10",
        bank_accounts_0_account_in_dispute: ["true"],
        bank_accounts_1_amount: "20",
      },
    );
  });

  it("always shows at least one row, then one per saved row", () => {
    assert.equal(rowCountFor(list, {}), 1);
    assert.equal(rowCountFor(list, { incomes: [{}, {}, {}] }), 3);
    assert.equal(describeRows(list, { incomes: [{}, {}] }).length, 2);
  });

  it("names a row in its messages only when there are several", () => {
    const [only] = describeRows(list, {}) as {
      messages: Record<string, Record<string, string>>;
    }[];
    const [, second] = describeRows(list, { incomes: [{}, {}] }) as {
      messages: Record<string, Record<string, string>>;
    }[];

    assert.equal(
      only.messages.income_tax.required,
      "Enter the income tax amount",
    );
    assert.equal(
      second.messages.income_tax.required,
      "Enter the income tax amount for employment income 2",
    );
  });

  it("only lets rows after the first be removed", () => {
    const rows = describeRows(list, { incomes: [{}, {}] }) as {
      removable: boolean;
    }[];

    assert.deepEqual(
      rows.map((row) => row.removable),
      [false, true],
    );
  });

  it("adds a blank row, using the list's own blank row", () => {
    assert.deepEqual(withBlankRow(list, { incomes: [{ income_type: "x" }] }), [
      { income_type: "x" },
      {},
    ]);
    assert.deepEqual(withBlankRow(BANK_ACCOUNTS_LIST, {}), [{ amount: "" }]);
  });

  it("removes a row, but never the first", () => {
    const answers = { incomes: [{ income_type: "a" }, { income_type: "b" }] };

    assert.deepEqual(withoutRow(list, answers, 1), [{ income_type: "a" }]);
    assert.deepEqual(withoutRow(list, answers, 0), answers.incomes);
  });
});
