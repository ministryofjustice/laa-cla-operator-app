import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";

/**
 * End-to-end tests for eligibility journey with under 18 clients
 */
test.describe("Eligibility journey - Under 18", () => {
  let checkId: string;

  test.beforeEach(async ({ page }) => {
    // Start a new eligibility check and capture the check ID from URL
    await page.goto("/eligibility/");
    checkId = page.url().split("/").pop() || "";
  });

  test("under 18 with controlled legal representation (no means test required)", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      under18ClrPage,
      checkYourAnswersPage,
    } = pages;

    // Level of help - select controlled
    await levelOfHelpPage.navigate(`/eligibility/${checkId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Under 18 CLR - select yes (has controlled legal representation)
    await under18ClrPage.navigate(`/eligibility/${checkId}/under-18-clr`);
    await expect(under18ClrPage.heading).toContainText("Controlled legal representation");
    await under18ClrPage.selectYes();
    await under18ClrPage.submit();

    // Should go to check your answers (no means test needed)
    await expect(page).toHaveURL(/check-your-answers/);
    await expect(checkYourAnswersPage.heading).toContainText("Check your answers");
  });

  test("under 18 without CLR - with aggregated means", async ({
    page,
    pages,
  }) => {
    const {
      levelOfHelpPage,
      under18ClrPage,
      aggregatedMeansPage,
    } = pages;

    // Level of help - select controlled
    await levelOfHelpPage.navigate(`/eligibility/${checkId}/level-of-help`);
    await levelOfHelpPage.selectControlled();
    await levelOfHelpPage.submit();

    // Under 18 CLR - select no
    await under18ClrPage.navigate(`/eligibility/${checkId}/under-18-clr`);
    await under18ClrPage.selectNo();
    await under18ClrPage.submit();

    // Aggregated means - select yes
    await aggregatedMeansPage.navigate(`/eligibility/${checkId}/aggregated-means`);
    await expect(aggregatedMeansPage.heading).toContainText("aggregated means");
    await aggregatedMeansPage.selectYes();
    await aggregatedMeansPage.submit();

    // Should continue to next step (how-to-aggregate or immigration)
    const url = page.url();
    expect(url).toMatch(/how-to-aggregate|immigration-or-asylum/);
  });
});
