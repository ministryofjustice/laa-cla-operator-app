import type { Locator, Page } from "@playwright/test";
import { TEST_CONFIG } from "../playwright.config.js";

export class supportNeeds {
  private readonly page: Page;
  private readonly supportNeedsurl: string;

  constructor(page: Page) {
    this.page = page;
    this.supportNeedsurl = `${TEST_CONFIG.BASE_URL}/receive-call/support-needs`;
  }


get url(): string {
    return "/receive-call/support-needs"; 
  }


get heading(): Locator {
    return this.page.getByRole("heading", {
      name: /Client’s support needs/i,
    });
  }

    get britishSignLanguageCheckBox(): Locator {
    return this.page.locator("");
  }

  get anyOtherLanguageCheckBox(): Locator {
    return this.page.locator("");
  }

}
