import type { Locator, Page } from "@playwright/test";
import { TEST_CONFIG } from "../playwright.config.js";

export class CaseHomePageDetails {
  private readonly page: Page;

  // Interruption card
  readonly interruptionCard: Locator;
  readonly cardHeading: Locator;
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
   
    this.cardHeading = this.interruptionCard.locator(
      "h1.moj-interruption-card__heading",
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
    return `${TEST_CONFIG.BASE_URL}/case/ED-0001-0002/client-homepage`;
  }

  get pageTitle(): string {
    return "Client Homepage";
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  // ---- Card content ----

  /** Text of the card's h1 (the %1 placeholder) */
  async heading(): Promise<string> {
    return (await this.cardHeading.textContent())?.trim() ?? "";
  }

  /** Text of the header link (the %2 placeholder) */
  async linkText(): Promise<string> {
    return (await this.cardLink.textContent())?.trim() ?? "";
  }

  /** href of the header link */
  async linkHref(): Promise<string | null> {
    return this.cardLink.getAttribute("href");
  }

  async isCardVisible(): Promise<boolean> {
    return this.interruptionCard.isVisible();
  }

  // ---- Actions ----

  async clickCardLink(): Promise<void> {
    await this.cardLink.click();
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
