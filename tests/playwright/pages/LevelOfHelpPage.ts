import type { Page } from "@playwright/test";
import { EligibilityBasePage } from "./EligibilityBasePage.js";

/**
 * Page object for Level of Help step
 */
export class LevelOfHelpPage extends EligibilityBasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Select controlled work
   */
  async selectControlled(): Promise<void> {
    await this.selectRadio("Controlled legal representation");
  }

  /**
   * Select certificated work
   */
  async selectCertificated(): Promise<void> {
    await this.selectRadio("Certificated");
  }

  /**
   * Select not applicable
   */
  async selectNotApplicable(): Promise<void> {
    await this.selectRadio("Not applicable");
  }
}
