import type { Locator, Page } from "@playwright/test";
import { TEST_CONFIG } from "../playwright.config.js";

export class CaseHomePageDetails {
  private readonly page: Page;

  // Interruption card
  readonly interruptionCard: Locator;
  readonly caseReference: Locator;
  readonly cardActions: Locator;
  readonly manageCaseButton: Locator;
  readonly arrangeCallbackButton: Locator;
  readonly signpostButton: Locator;

  /**
   * Creates a new CaseHomePageDetails object
   * @param {Page} page - The Playwright page instance
   */
  constructor(page: Page) {
    this.page = page;

    this.interruptionCard = page.locator(".moj-interruption-card");
    this.caseReference = this.interruptionCard.locator(
      ".card-header a.govuk-link",
    );
    this.cardActions = this.interruptionCard.locator(
      ".moj-interruption-card__actions",
    );

    this.manageCaseButton = this.cardActions.getByRole("button", {
      name: "Manage Case",
    });
    this.arrangeCallbackButton = this.cardActions.getByRole("button", {
      name: "Arrange CallBack",
    });
    this.signpostButton = this.cardActions.getByRole("button", {
      name: "Signpost to other help",
    });
  }

  get url(): string {
    return `${TEST_CONFIG.BASE_URL}/case/ED-0001-0002/case-homepage`;
  }

  get pageTitle(): string {
    return "Case Homepage";
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  async clickManageCase(): Promise<void> {
    await this.manageCaseButton.click();
  }

  async clickArrangeCallback(): Promise<void> {
    await this.arrangeCallbackButton.click();
  }

  async clickSignpostToOtherHelp(): Promise<void> {
    await this.signpostButton.click();
  }
}
