import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";
import { AddClientDetailsPage } from "../pages/AddClientDetailsPage.js";

const detailsPath = (caseId: string): string =>
  `/case/${caseId}/add-client-details`;
const journeyPath = (caseId: string): string =>
  `/cases/${caseId}/cfe-eligibility/change`;

async function login(page: Page, path: string): Promise<void> {
  await page.goto(`/test-auth/login?next=${encodeURIComponent(path)}`);
}

async function startFromDetails(
  page: Page,
  caseId: string,
  birthYear = "1990",
): Promise<void> {
  await login(page, detailsPath(caseId));
  const details = new AddClientDetailsPage(page);
  await details.fillValidForm();
  await details.dateOfBirthYearInput.fill(birthYear);
  await page
    .getByRole("button", { name: "Check financial eligibility" })
    .click();
}

async function answerYesNo(page: Page, answer: "Yes" | "No"): Promise<void> {
  await page.getByRole("radio", { name: answer, exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

async function completeBenefits(
  page: Page,
  passported: boolean,
): Promise<void> {
  for (const benefit of [
    "Universal Credit",
    "Income Support",
    "Income-based Job Seekers",
    "Guarantee State Pension Credit",
    "Income-related Employment and",
  ]) {
    await page
      .getByRole("group", { name: benefit })
      .getByLabel(passported && benefit === "Universal Credit" ? "Yes" : "No")
      .check();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

async function fillZeroAmounts(page: Page): Promise<void> {
  const amounts = page.getByRole("spinbutton");
  await expect(amounts.first()).toBeVisible();
  for (const amount of await amounts.all()) {
    await amount.fill("0");
  }
}

async function continueJourney(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test.describe("Client details eligibility entry", () => {
  test("opens the matter question with the question left and guidance right", async ({
    page,
    checkAccessibility,
  }) => {
    await startFromDetails(page, "EL-MATTER-PAGE");
    await expect(page).toHaveURL(
      `${journeyPath("EL-MATTER-PAGE")}/immigration-or-asylum`,
    );

    const question = page
      .locator("h2")
      .filter({ hasText: "Is this an immigration or asylum matter?" });
    const guidance = page.locator("h2").filter({ hasText: "Guidance" });
    const leftColumn = page.locator(".govuk-grid-column-two-thirds");
    const rightColumn = page.locator(".govuk-grid-column-one-third");

    await expect(question).toBeVisible();
    await expect(guidance).toBeVisible();
    await expect(
      leftColumn.getByRole("radio", { name: "Yes", exact: true }),
    ).toBeVisible();
    await expect(
      rightColumn.getByRole("link", { name: "Controlled work (PDF, 599KB)" }),
    ).toHaveAttribute(
      "href",
      "https://assets.publishing.service.gov.uk/media/684ff44229fb1002010c4e6c/LC_s_guidance_on_determining_financial_eligibility__controlled_and_mediation_.pdf",
    );

    const submitButton = leftColumn.getByRole("button", {
      name: "Save and continue",
    });
    await expect(submitButton).toBeVisible();
    const questionBottom = await page
      .locator("#immigration-or-asylum")
      .evaluate((element) => element.getBoundingClientRect().bottom);
    const buttonTop = await submitButton.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    expect(buttonTop).toBeGreaterThan(questionBottom);
    await checkAccessibility();
  });

  test("validates details before starting eligibility", async ({ page }) => {
    const path = detailsPath("EL-INVALID");
    await login(page, path);
    await expect(
      page.getByRole("button", { name: "Check financial eligibility" }),
    ).toHaveClass(/govuk-button--secondary/u);
    await page
      .getByRole("button", { name: "Check financial eligibility" })
      .click();
    await expect(page).toHaveURL(path);
    await expect(page.locator(".govuk-error-summary")).toContainText(
      "Enter a valid date of birth",
    );
    await expect(page.locator(".govuk-error-summary")).toContainText(
      "Enter the client’s name",
    );
  });

  test("still saves and continues to address lookup", async ({ page }) => {
    await login(page, detailsPath("EL-ADDRESS"));
    const details = new AddClientDetailsPage(page);
    await details.fillValidForm();
    await details.submit();
    await expect(page).toHaveURL("/case/EL-ADDRESS/address-lookup");
    await page.goto(journeyPath("EL-ADDRESS"));
    await expect(page).toHaveURL(`${journeyPath("EL-ADDRESS")}/has-partner`);
  });

  test("does not enter eligibility if saving client details fails", async ({
    page,
  }) => {
    await startFromDetails(page, "EL-SAVE-FAIL");
    await expect(page).toHaveURL(detailsPath("EL-SAVE-FAIL"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("500");
  });

  test("saves a child's DOB and starts at regular payments", async ({
    page,
  }) => {
    await startFromDetails(
      page,
      "EL-CHILD",
      String(new Date().getFullYear() - 10),
    );
    await expect(page).toHaveURL(
      `${journeyPath("EL-CHILD")}/under-18-receives-regular-payment`,
    );
    await expect(
      page.getByRole("heading", {
        name: "Do you receive any money on a regular basis?",
      }),
    ).toBeVisible();
    await answerYesNo(page, "No");
    await expect(page).toHaveURL(
      `${journeyPath("EL-CHILD")}/under-18-has-valuables`,
    );
    await answerYesNo(page, "No");
    await expect(page).toHaveURL(`${journeyPath("EL-CHILD")}/check-answers`);
    await page.getByRole("button", { name: "Prepare submission" }).click();
    await expect(page).toHaveURL(`${journeyPath("EL-CHILD")}/submission-ready`);
    await expect(
      page.getByText(/No financial eligibility calculation has run/u),
    ).toBeVisible();
    await expect(page.getByText(/no assessment has been saved/u)).toBeVisible();
    await page
      .getByRole("link", { name: "Return to check your answers" })
      .click();
    await expect(page).toHaveURL(`${journeyPath("EL-CHILD")}/check-answers`);
    await expect(page.getByText("Are you aged 17 or under?")).toBeVisible();
    await expect(
      page.locator(".govuk-summary-list__row").filter({
        hasText: "Are you aged 17 or under?",
      }),
    ).toContainText("Yes");
    await expect(
      page.locator(".govuk-summary-list__row").filter({
        hasText: "Do you receive any money on a regular basis?",
      }),
    ).toContainText("No");
  });

  test("adult entry skips client age but still asks about a partner's age", async ({
    page,
    checkAccessibility,
  }) => {
    await startFromDetails(page, "EL-ADULT");
    await expect(page).toHaveURL(`${journeyPath("EL-ADULT")}/has-partner`);
    await checkAccessibility();
    await answerYesNo(page, "Yes");
    await expect(page).toHaveURL(
      `${journeyPath("EL-ADULT")}/60-or-over-with-partner`,
    );
    await answerYesNo(page, "No");
    await expect(page).toHaveURL(`${journeyPath("EL-ADULT")}/benefits`);
  });

  for (const partner of ["Yes", "No"] as const) {
    test(`a saved 60+ DOB skips over-60 questions (partner: ${partner})`, async ({
      page,
    }) => {
      const caseId = `EL-OLDER-${partner}`;
      await startFromDetails(page, caseId, "1950");
      await expect(page).toHaveURL(`${journeyPath(caseId)}/has-partner`);
      await answerYesNo(page, partner);
      await expect(page).toHaveURL(`${journeyPath(caseId)}/benefits`);
    });
  }

  test("missing DOB falls back to asking age questions", async ({ page }) => {
    const path = journeyPath("EL-NO-DOB");
    await login(page, path);
    await expect(
      page.getByRole("heading", { name: "Are you aged 17 or under?" }),
    ).toBeVisible();
    await answerYesNo(page, "No");
    await expect(page).toHaveURL(`${path}/has-partner`);
    await answerYesNo(page, "No");
    await expect(page).toHaveURL(`${path}/60-or-over`);
    await answerYesNo(page, "No");
    await expect(page).toHaveURL(`${path}/benefits`);
  });

  test("requires an explicit property answer and validates property details when Yes is selected", async ({
    page,
  }) => {
    const path = journeyPath("EL-PROPERTY-ANSWER");
    await startFromDetails(page, "EL-PROPERTY-ANSWER");
    await answerYesNo(page, "No");
    await completeBenefits(page, false);

    await expect(page).toHaveURL(`${path}/properties`);
    await continueJourney(page);
    await expect(page.locator(".govuk-error-summary")).toContainText(
      "Select yes if you own or part-own any property",
    );

    await page.getByRole("radio", { name: "Yes", exact: true }).check();
    await continueJourney(page);
    await expect(page.locator(".govuk-error-summary")).toContainText(
      "Add at least one property",
    );

    await page.getByRole("button", { name: "Add property" }).click();
    await page
      .getByRole("spinbutton", {
        name: "What is the current market value of the property?",
      })
      .fill("100000");
    await page
      .getByRole("spinbutton", {
        name: "How much is left to pay on the mortgage?",
      })
      .fill("50000");
    await page
      .getByRole("group", { name: "Is this your main property?" })
      .getByLabel("Yes")
      .check();
    await page
      .getByRole("spinbutton", {
        name: "What percentage of the property do you own?",
      })
      .fill("100");
    await continueJourney(page);
    await expect(page).toHaveURL(`${path}/your-savings`);
  });

  test("an incomplete direct review returns to the first missing question", async ({
    page,
  }) => {
    const path = journeyPath("EL-INCOMPLETE");
    await login(page, `${path}/check-answers`);
    await expect(page).toHaveURL(`${path}/has-partner`);
    await expect(
      page.getByText(
        "Complete or correct this answer before preparing the submission.",
      ),
    ).toBeVisible();
  });

  test("direct access to preparation cannot bypass draft validation", async ({
    page,
  }) => {
    const path = journeyPath("EL-PREPARE-DIRECT");
    await login(page, `${path}/submission-ready`);
    await expect(page).toHaveURL(`${path}/has-partner`);
    await expect(
      page.getByText(
        "Complete or correct this answer before preparing the submission.",
      ),
    ).toBeVisible();
  });

  test("discard confirmation returns to the journey or discards to client details", async ({
    page,
  }) => {
    const caseId = "EL-DISCARD";
    await startFromDetails(page, caseId);
    await answerYesNo(page, "Yes");
    await page.getByRole("link", { name: "Discard changes" }).click();
    await expect(page).toHaveURL(`${journeyPath(caseId)}/discard`);
    await page
      .getByRole("link", { name: "Return to means assessment" })
      .click();
    await expect(page).toHaveURL(
      `${journeyPath(caseId)}/60-or-over-with-partner`,
    );
    await page.getByRole("link", { name: "Discard changes" }).click();
    await page.getByRole("button", { name: "Discard changes" }).click();
    await expect(page).toHaveURL(detailsPath(caseId));
    await page.goto(`${journeyPath(caseId)}/has-partner`);
    await expect(
      page.getByRole("radio", { name: "Yes", exact: true }),
    ).not.toBeChecked();
  });
});

test.describe("CFE eligibility financial questions", () => {
  for (const partner of ["Yes", "No"] as const) {
    test(`completes finances, saves and updates answers (partner: ${partner})`, async ({
      page,
      browser,
      checkAccessibility,
    }) => {
      const caseId = `EL-FINANCES-${partner}`;
      const path = journeyPath(caseId);
      await startFromDetails(page, caseId);
      await answerYesNo(page, partner);
      if (partner === "Yes") {
        await answerYesNo(page, "No");
      }
      await expect(page).toHaveURL(`${path}/benefits`);
      await checkAccessibility();
      await completeBenefits(page, false);
      await expect(page).toHaveURL(
        `${path}/${partner === "Yes" ? "client-partner-properties" : "properties"}`,
      );
      await page.getByRole("radio", { name: "No", exact: true }).check();
      await continueJourney(page);
      await expect(page).toHaveURL(`${path}/your-savings`);
      await fillZeroAmounts(page);
      await page
        .getByRole("spinbutton", { name: "How much was in your bank" })
        .fill("125");
      await continueJourney(page);
      if (partner === "Yes") {
        await expect(page).toHaveURL(`${path}/partner-savings`);
        await fillZeroAmounts(page);
        await continueJourney(page);
      }
      await expect(page).toHaveURL(`${path}/disregards`);
      await page.getByRole("checkbox", { name: "None", exact: true }).check();
      await continueJourney(page);
      await expect(page).toHaveURL(`${path}/your-income`);
      await page.getByRole("radio", { name: "No", exact: true }).check();
      await fillZeroAmounts(page);
      await continueJourney(page);
      if (partner === "Yes") {
        await expect(page).toHaveURL(`${path}/partner-income`);
        await page.getByRole("radio", { name: "No", exact: true }).check();
        await fillZeroAmounts(page);
        await continueJourney(page);
      }
      await expect(page).toHaveURL(
        `${path}/${partner === "Yes" ? "partner-dependants" : "dependants"}`,
      );
      await fillZeroAmounts(page);
      await continueJourney(page);
      await expect(page).toHaveURL(`${path}/your-expenses`);
      await fillZeroAmounts(page);
      await continueJourney(page);
      if (partner === "Yes") {
        await expect(page).toHaveURL(`${path}/partner-expenses`);
        await fillZeroAmounts(page);
        await continueJourney(page);
      }
      await expect(page).toHaveURL(`${path}/check-answers`);
      await expect(
        page.getByRole("heading", { name: "Check your answers", exact: true }),
      ).toBeVisible();
      await checkAccessibility();
      await page.getByRole("button", { name: "Prepare submission" }).click();
      await expect(page).toHaveURL(`${path}/submission-ready`);
      await expect(
        page.getByText(/No financial eligibility calculation has run/u),
      ).toBeVisible();
      await expect(
        page.getByText(/no assessment has been saved/u),
      ).toBeVisible();
      await checkAccessibility();
      await page
        .getByRole("link", { name: "Return to check your answers" })
        .click();
      await expect(page).toHaveURL(`${path}/check-answers`);

      // Draft answers remain available during this session but do not persist across sessions.
      const reloaded = await browser.newPage();
      try {
        await login(reloaded, `${path}/has-partner`);
        await reloaded.goto(`${path}/your-savings`);
        const bankBalance = reloaded.getByRole("spinbutton", {
          name: "How much was in your bank",
        });
        await expect(bankBalance).toHaveValue("");
      } finally {
        await reloaded.close();
      }
    });
  }

  test("passporting benefits skip income and expenses", async ({ page }) => {
    const path = journeyPath("EL-PASSPORTED");
    await startFromDetails(page, "EL-PASSPORTED");
    await answerYesNo(page, "No");
    await expect(page).toHaveURL(`${path}/benefits`);
    await completeBenefits(page, true);
    await expect(page).toHaveURL(`${path}/properties`);
    await page.getByRole("radio", { name: "No", exact: true }).check();
    await continueJourney(page);
    await expect(page).toHaveURL(`${path}/your-savings`);
    await fillZeroAmounts(page);
    await continueJourney(page);
    await expect(page).toHaveURL(`${path}/disregards`);
    await page.getByRole("checkbox", { name: "None", exact: true }).check();
    await continueJourney(page);
    await expect(page).toHaveURL(`${path}/check-answers`);
    await expect(
      page.locator(".govuk-summary-list__row").filter({
        hasText: "Universal Credit",
      }),
    ).toContainText("Yes");
  });
});
