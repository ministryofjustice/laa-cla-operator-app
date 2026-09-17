import type { Page, Locator } from "@playwright/test";
import { TEST_CONFIG } from "../playwright.config.js";
const MAIN_HEADING_LEVEL = 1;

/**
 * Page object for the "Add new client" page (/receive-call/add-client-details)
 */
export class AddClientDetailsPage {
  private readonly page: Page;
  private readonly url: string;

  /**
   * Creates a new AddClientDetailsPage object
   * @param {Page} page - The Playwright page instance
   */
  constructor(page: Page) {
    this.page = page;
    this.url = TEST_CONFIG.BASE_URL + "/receive-call/add-client-details";
  }

  /**
   * Gets the main page heading
   * @returns {Locator} The heading locator
   */
  get heading(): Locator {
    return this.page.getByRole("heading", {
      name: "Add new client",
      level: MAIN_HEADING_LEVEL,
    });
  }

  /**
   * Gets the back link
   * @returns {Locator} The back link locator
   */
  get backLink(): Locator {
    return this.page.getByRole("link", { name: "Back", exact: true });
  }

  /**
   * Gets the full name input
   * @returns {Locator} The name input locator
   */
  get fullNameInput(): Locator {
    return this.page.getByLabel("Name");
  }

  /**
   * Gets the date of birth day input
   * @returns {Locator} The day input locator
   */
  get dateOfBirthDayInput(): Locator {
    return this.page.getByLabel("Day");
  }

  /**
   * Gets the date of birth month input
   * @returns {Locator} The month input locator
   */
  get dateOfBirthMonthInput(): Locator {
    return this.page.getByLabel("Month");
  }

  /**
   * Gets the date of birth year input
   * @returns {Locator} The year input locator
   */
  get dateOfBirthYearInput(): Locator {
    return this.page.getByLabel("Year");
  }

  /**
   * Gets the phone number input
   * @returns {Locator} The phone number input locator
   */
  get phoneNumberInput(): Locator {
    return this.page.getByLabel("Phone number");
  }

  /**
   * Gets a radio group fieldset scoped by its legend text
   * @param {string} legendText - The exact legend text for the fieldset
   * @returns {Locator} The fieldset locator scoped to that group
   */
  radioGroup(legendText: string): Locator {
    return this.page.locator("fieldset").filter({ hasText: legendText });
  }

  /**
   * Gets the "Yes" radio within a given radio group
   * @param {string} legendText - The exact legend text for the fieldset
   * @returns {Locator} The "Yes" radio locator
   */
  radioYes(legendText: string): Locator {
    return this.radioGroup(legendText).getByLabel("Yes");
  }

  /**
   * Gets the "No" radio within a given radio group
   * @param {string} legendText - The exact legend text for the fieldset
   * @returns {Locator} The "No" radio locator
   */
  radioNo(legendText: string): Locator {
    return this.radioGroup(legendText).getByLabel("No");
  }

  /**
   * Gets the email input
   * @returns {Locator} The email input locator
   */
  get emailInput(): Locator {
    return this.page.getByLabel("Email (optional)");
  }

  /**
   * Gets the "Save and continue" button
   * @returns {Locator} The submit button locator
   */
  get saveAndContinueButton(): Locator {
    return this.page.getByRole("button", { name: "Save and continue" });
  }

  /**
   * Gets the GOV.UK error summary box
   * @returns {Locator} The error summary locator
   */
  get errorSummary(): Locator {
    return this.page.locator(".govuk-error-summary");
  }

  /**
   * Gets all error summary link texts
   * @returns {Locator} The error summary list item links locator
   */
  get errorSummaryLinks(): Locator {
    return this.errorSummary.locator("a");
  }

  /**
   * Gets all inline field error messages
   * @returns {Locator} The inline error message locators
   */
  get inlineErrorMessages(): Locator {
    return this.page.locator(".govuk-error-message");
  }

  /**
   * Gets the prompt shown when withheld-number calls are accepted
   * @returns {Locator} The withheld-number prompt locator
   */
  get withheldNumberPrompt(): Locator {
    return this.page.getByText(
      "Prompt the client to add Civil Legal Advice as a contact using 0345 345 4345 'just in case'",
    );
  }

  /**
   * Gets the callback text shown when withheld-number calls are not accepted
   * @returns {Locator} The withheld-number callback locator
   */
  get withheldNumberCallback(): Locator {
    return this.page.getByText(
      "We will try to call you back 3 times but if we can't get through you will have to contact us again to continue your case.",
    );
  }

  /**
   * Navigates directly to the add new client page
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
  }

  /**
   * Fills in all fields with valid data
   */
  async fillValidForm(): Promise<void> {
    await this.fullNameInput.fill("Jane Doe");
    await this.dateOfBirthDayInput.fill("27");
    await this.dateOfBirthMonthInput.fill("3");
    await this.dateOfBirthYearInput.fill("1990");
    await this.phoneNumberInput.fill("07123456789");
    await this.radioYes("Is it safe to call this number?").check();
    await this.radioYes("Is it safe to leave a message?").check();
    await this.radioYes(
      "If safe to call, does your phone accept calls from a withheld number?",
    ).check();
  }

  /**
   * Submits the form
   */
  async submit(): Promise<void> {
    await this.saveAndContinueButton.click();
  }
}
