import type { Page } from "@playwright/test";
import { ReceiveCallPage } from "./ReceiveCallPage.js";
import { AddClientDetailsPage } from "./AddClientDetailsPage.js";
import { AddressPage } from "./addAddressPage.js";
import { SearchClientPage } from "./SearchClientPage.js";
import { AdaptationDetailPage } from "./adaptationDetailsPage.js";
import {
  EmploymentStatusPage,
  IncomePage,
  BenefitDetailsPage,
  OtherIncomePage,
  BenefitsPage,
  PropertyPage,
  PropertyEntryPage,
  AdditionalPropertyPage,
  AdditionalPropertyDetailsPage,
} from "./EligibilitySteps.js";

/**
 * Factory class for creating page objects
 */
export class PageFactory {
  private readonly page: Page;

  /**
   * Creates a new page factory instance
   * @param {Page} page - The Playwright page instance
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Gets an instance of the receive-call journey page
   * @returns {ReceiveCallPage} The receive-call page object
   */
  get receiveCallPage(): ReceiveCallPage {
    return new ReceiveCallPage(this.page);
  }

  get searchClientPage(): SearchClientPage {
    return new SearchClientPage(this.page);
  }

  /**
   * Gets an instance of the add client details page
   * @returns {AddClientDetailsPage} The add client details page object
   */
  get addClientDetailsPage(): AddClientDetailsPage {
    return new AddClientDetailsPage(this.page);
  }

  get AddAddressPage(): AddressPage {
    return new AddressPage(this.page);
  }

  get AdaptationDetailPage(): AdaptationDetailPage {
    return new AdaptationDetailPage(this.page);
  }

  // Eligibility journey pages
  get employmentStatusPage(): EmploymentStatusPage {
    return new EmploymentStatusPage(this.page);
  }

  get benefitsPage(): BenefitsPage {
    return new BenefitsPage(this.page);
  }

  get incomePage(): IncomePage {
    return new IncomePage(this.page);
  }

  get benefitDetailsPage(): BenefitDetailsPage {
    return new BenefitDetailsPage(this.page);
  }

  get otherIncomePage(): OtherIncomePage {
    return new OtherIncomePage(this.page);
  }

  get propertyPage(): PropertyPage {
    return new PropertyPage(this.page);
  }

  get propertyEntryPage(): PropertyEntryPage {
    return new PropertyEntryPage(this.page);
  }

  get additionalPropertyPage(): AdditionalPropertyPage {
    return new AdditionalPropertyPage(this.page);
  }

  get additionalPropertyDetailsPage(): AdditionalPropertyDetailsPage {
    return new AdditionalPropertyDetailsPage(this.page);
  }
}
