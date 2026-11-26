import type { Locator, Page } from "@playwright/test";
import { TEST_CONFIG } from "../playwright.config.js";

export class CaseHomePageDetails {
  private readonly page: Page;

  // Page header banner
  readonly pageHeaderBanner: Locator;
  readonly caseName: Locator;
  readonly caseReference: Locator;
  readonly bannerActions: Locator;
  readonly manageCaseButton: Locator;
  readonly arrangeCallbackButton: Locator;
  readonly signpostButton: Locator;

  /**
   * Creates a new CaseHomePageDetails object
   * @param {Page} page - The Playwright page instance
   */
  constructor(page: Page) {
    this.page = page;

    this.pageHeaderBanner = page.locator(".pageHeaderBanner");
    this.caseName = this.pageHeaderBanner.locator(".pageHeaderBanner__name");
    this.caseReference = this.pageHeaderBanner.locator(
      ".pageHeaderBanner__ref",
    );
    this.bannerActions = this.pageHeaderBanner.locator(
      ".pageHeaderBanner__actions",
    );

    this.manageCaseButton = this.bannerActions.getByRole("button", {
      name: "Manage case",
    });
    this.arrangeCallbackButton = this.bannerActions.getByRole("button", {
      name: "Arrange callback",
    });
    this.signpostButton = this.bannerActions.getByRole("button", {
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

  get caseSectionTabs(): Locator {
    return this.page
      .getByRole("navigation", { name: "Case sections" })
      .getByRole("link");
  }
}