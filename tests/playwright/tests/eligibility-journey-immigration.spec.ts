import { test, expect } from "../fixtures/index.js";

const matterTypes = [
  {
    value: "immigration_clr",
    label:
      "Immigration - controlled legal representation (CLR) in the First-tier Tribunal",
  },
  {
    value: "immigration_legal_help",
    label: "Immigration - legal help or help at court",
  },
  {
    value: "asylum",
    label:
      "Asylum - legal help, help at court, or controlled legal representation (CLR) in the First-tier Tribunal",
  },
];

test.describe("Eligibility journey - Immigration and asylum", () => {
  const caseId = "ED-0001-0004";

  test.beforeEach(async ({ page }) => {
    const detailsPath = `/case/${caseId}/add-client-details`;
    await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
    await page
      .getByRole("button", { name: "Check financial eligibility" })
      .click();
    await page.goto(`/eligibility/${caseId}/level-of-help`);
    await page
      .locator('input[name="level_of_help"][value="controlled"]')
      .check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Is this an immigration or asylum matter?",
      }),
    ).toBeVisible();
  });

  for (const matterType of matterTypes) {
    test(`${matterType.value} is asked before Asylum Support`, async ({
      page,
      checkAccessibility,
    }) => {
      await page.getByRole("radio", { name: "Yes", exact: true }).check();
      await page.getByRole("button", { name: "Continue" }).click();

      await expect(page).toHaveURL(/\/immigration-or-asylum-type$/);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "What type of immigration or asylum matter is this?",
        }),
      ).toBeVisible();
      await expect(page.getByRole("radio")).toHaveCount(3);
      for (const option of matterTypes) {
        await expect(
          page.getByRole("radio", { name: option.label, exact: true }),
        ).toHaveValue(option.value);
      }
      await checkAccessibility();

      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page).toHaveURL(/\/immigration-or-asylum-type$/);
      await expect(page.locator(".govuk-error-summary")).toContainText(
        "Select the type of immigration or asylum matter",
      );

      await page
        .getByRole("radio", { name: matterType.label, exact: true })
        .check();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page).toHaveURL(/\/asylum-support$/);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Does your client get Asylum Support?",
        }),
      ).toBeVisible();
      await checkAccessibility();

      await page.goto(`/eligibility/${caseId}/immigration-or-asylum-type`);
      await expect(
        page.getByRole("radio", { name: matterType.label, exact: true }),
      ).toBeChecked();
    });
  }

  test("No skips the matter type and Asylum Support questions", async ({
    page,
  }) => {
    await page.getByRole("radio", { name: "No", exact: true }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/applicant$/);
  });
});
