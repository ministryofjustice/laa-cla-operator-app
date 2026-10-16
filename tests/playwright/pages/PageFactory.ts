import type { Page } from "@playwright/test";
import { ReceiveCallPage } from "./ReceiveCallPage.js";
import { AddClientDetailsPage } from "./AddClientDetailsPage.js";
import { AddressPage } from "./addAddressPage.js";
import { SearchClientPage } from "./SearchClientPage.js";
import { AdaptationDetailPage } from "./adaptationDetailsPage.js";
import { LevelOfHelpPage } from "./LevelOfHelpPage.js";
import {
  Under18ClrPage,
  AggregatedMeansPage,
  ImmigrationOrAsylumPage,
  ImmigrationOrAsylumTypePage,
  AsylumSupportPage,
  DomesticAbuseApplicantPage,
  ApplicantPage,
  PropertyPage,
  PropertyEntryPage,
  AdditionalPropertyPage,
  EmploymentStatusPage,
  BenefitsPage,
  AssetsPage,
  VehiclesPage,
  CheckYourAnswersPage,
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
  get levelOfHelpPage(): LevelOfHelpPage {
    return new LevelOfHelpPage(this.page);
  }

  get under18ClrPage(): Under18ClrPage {
    return new Under18ClrPage(this.page);
  }

  get aggregatedMeansPage(): AggregatedMeansPage {
    return new AggregatedMeansPage(this.page);
  }

  get immigrationOrAsylumPage(): ImmigrationOrAsylumPage {
    return new ImmigrationOrAsylumPage(this.page);
  }

  get immigrationOrAsylumTypePage(): ImmigrationOrAsylumTypePage {
    return new ImmigrationOrAsylumTypePage(this.page);
  }

  get asylumSupportPage(): AsylumSupportPage {
    return new AsylumSupportPage(this.page);
  }

  get domesticAbuseApplicantPage(): DomesticAbuseApplicantPage {
    return new DomesticAbuseApplicantPage(this.page);
  }

  get applicantPage(): ApplicantPage {
    return new ApplicantPage(this.page);
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

  get employmentStatusPage(): EmploymentStatusPage {
    return new EmploymentStatusPage(this.page);
  }

  get benefitsPage(): BenefitsPage {
    return new BenefitsPage(this.page);
  }

  get assetsPage(): AssetsPage {
    return new AssetsPage(this.page);
  }

  get vehiclesPage(): VehiclesPage {
    return new VehiclesPage(this.page);
  }

  get checkYourAnswersPage(): CheckYourAnswersPage {
    return new CheckYourAnswersPage(this.page);
  }
}

