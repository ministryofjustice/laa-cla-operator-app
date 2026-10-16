# Eligibility Journey E2E Tests

Comprehensive end-to-end tests for the eligibility journey using Playwright.

## Test Files

### `eligibility-journey-under-18.spec.ts`
Tests for under-18 client flows:
- Under 18 with controlled legal representation (no means test)
- Under 18 without CLR with aggregated means
- Tests for progression through various under-18 pathways

### `eligibility-journey-controlled.spec.ts`
Tests for controlled legal work:
- Adult with controlled work + immigration/asylum
- Adult with controlled work without immigration/asylum
- Backtracking and changing answers between steps

### `eligibility-journey-domestic-abuse.spec.ts`
Tests for domestic abuse and non-controlled pathways:
- Domestic abuse applicant flow
- Partner questions after domestic abuse
- Backtracking on partner questions

### `eligibility-journey-certificated.spec.ts`
Tests for certificated work flows:
- Certificated work without partner
- Certificated work with partner
- Certificated work with passporting
- Navigation to check answers

### `eligibility-journey-asylum-immigration.spec.ts`
Tests for asylum and immigration cases:
- Certificated work with immigration
- Certificated work with asylum
- Asylum support flow
- Immigration appeal types
- Multiple immigration/asylum type options

### `eligibility-journey-property.spec.ts`
Tests for property ownership scenarios:
- Property owned outright
- Property with mortgage
- Shared ownership property
- No property
- Backtracking and changing property answers

### `eligibility-journey-employment-assets.spec.ts`
Tests for employment status and assets:
- Employed client flow
- Self-employed client flow
- Unemployed client flow
- Assets collection
- Vehicle ownership

### `eligibility-journey-change-answers.spec.ts`
Tests for changing answers and backtracking:
- Change level of help during journey
- Change immigration answers
- Multiple backtrack cycles
- Change partner status
- Journey routing after changes

### `eligibility-journey-regression.spec.ts`
Regression tests for navigation loop bugs:
- Tests that steps have proper reachability conditions
- Tests that changing answers doesn't cause service errors
- Tests for multiple backtrack/forward cycles
- Prevents regression of the navigation loop issue

## Running Tests

### Run all eligibility tests
```bash
npm test -- tests/playwright/tests/eligibility-journey*.spec.ts
```

### Run a specific test file
```bash
npm test -- tests/playwright/tests/eligibility-journey-certificated.spec.ts
```

### Run tests in headed mode (see browser)
```bash
npm test -- --headed tests/playwright/tests/eligibility-journey-property.spec.ts
```

### Run a specific test
```bash
npm test -- --grep "certificated work without partner"
```

## Page Objects

### Base Page Object: `EligibilityBasePage.ts`
Base class for all eligibility step pages. Provides common methods:
- `navigate(path)` - Navigate to a specific eligibility step
- `selectRadio(label)` - Select a radio button by label text
- `selectCheckbox(label)` - Select a checkbox by label text
- `fillTextInput(label, value)` - Fill text input by label
- `submit()` - Click continue/submit button
- `clickBack()` - Click back button

### Page Objects Provided: `EligibilitySteps.ts`

#### Navigation & Level Selection
- `LevelOfHelpPage` - Controlled/Certificated/Not Applicable
- `Under18ClrPage` - Controlled Legal Representation (yes/no)
- `AggregatedMeansPage` - Aggregated means (yes/no)

#### Immigration & Asylum
- `ImmigrationOrAsylumPage` - Immigration/Asylum (yes/no)
- `ImmigrationOrAsylumTypePage` - Type selection (Immigration/Asylum/Appeals)
- `AsylumSupportPage` - Asylum support (yes/no)

#### Personal Information
- `DomesticAbuseApplicantPage` - Domestic abuse applicant (yes/no)
- `ApplicantPage` - Has partner (yes/no)

#### Property & Housing
- `PropertyPage` - Property ownership (outright/mortgage/shared/none)
- `PropertyEntryPage` - Property details (value/mortgage/percentage)
- `AdditionalPropertyPage` - Additional property (yes/no)

#### Employment & Assets
- `EmploymentStatusPage` - Employment status (employed/self-employed/unemployed/not working)
- `BenefitsPage` - Receives benefits (yes/no)
- `AssetsPage` - Investments and valuables
- `VehiclesPage` - Vehicle ownership (yes/no)

#### Summary
- `CheckYourAnswersPage` - Final check answers page

## Adding New Tests

### Adding a test for a new journey path

1. Create a new test file following the naming convention:
   ```typescript
   test.describe("Eligibility journey - [Path name]", () => {
     let caseId: string;

     test.beforeEach(async ({ page }) => {
       caseId = "ED-0001-0001";
       const detailsPath = `/case/${caseId}/add-client-details`;
       await page.goto(`/test-auth/login?next=${encodeURIComponent(detailsPath)}`);
       await page.getByRole("button", { name: "Check financial eligibility" }).click();
     });

     test("description of test case", async ({ page, pages }) => {
       const { levelOfHelpPage, immigrationOrAsylumPage } = pages;

       // Navigate and interact with pages
       await levelOfHelpPage.navigate(`/eligibility/${caseId}/level-of-help`);
       await levelOfHelpPage.selectControlled();
       await levelOfHelpPage.submit();

       // Verify navigation
       await expect(page).toHaveURL(/immigration-or-asylum/);
     });
   });
   ```

2. Use existing page objects or create new ones for steps not yet covered

### Adding a new page object

1. Add class to `EligibilitySteps.ts` extending `EligibilityBasePage`:
   ```typescript
   export class MyStepPage extends EligibilityBasePage {
     async selectOption(optionName: string): Promise<void> {
       await this.selectRadio(optionName);
     }
   }
   ```

2. Add to imports in `PageFactory.ts` and create getter:
   ```typescript
   get myStepPage(): MyStepPage {
     return new MyStepPage(this.page);
   }
   ```

3. Use in tests:
   ```typescript
   const { myStepPage } = pages;
   await myStepPage.navigate(`/eligibility/${caseId}/my-step`);
   ```

## Journey Paths Covered

### ✅ Completed Test Coverage

#### Controlled Work Flows
- [x] Controlled work with immigration/asylum
- [x] Controlled work without immigration/asylum
- [x] Backtracking and changing answers

#### Under 18 Flows
- [x] Under 18 + CLR (controlled legal representation)
- [x] Under 18 + aggregated means
- [x] Navigation and progression

#### Certificated Work Flows
- [x] Certificated work without partner
- [x] Certificated work with partner
- [x] Certificated work with passporting

#### Asylum & Immigration
- [x] Certificated work with immigration
- [x] Certificated work with asylum
- [x] Asylum support flow
- [x] Immigration appeal types

#### Property Flows
- [x] Property owned outright
- [x] Property with mortgage
- [x] Shared ownership property
- [x] No property

#### Employment & Assets
- [x] Employed client flow
- [x] Self-employed client flow
- [x] Unemployed client flow
- [x] Assets collection
- [x] Vehicle ownership

#### Domestic Abuse
- [x] Domestic abuse applicant flow
- [x] Partner questions after domestic abuse

#### Change Answers & Backtracking
- [x] Change level of help
- [x] Change immigration answers
- [x] Multiple backtrack cycles
- [x] Change partner status
- [x] Complete backtrack/forward flows

## Debugging Failed Tests

### Tests fail to navigate to a step
- Check that the step code in the URL matches the step filename
- Verify the step has proper `reachability` conditions
- Check that the navigation logic returns the expected steps

### Tests show 302 redirects
- Step is missing `reachability` condition
- Check `src/eligibility/journey/[step-name]/step.ts` has reachability config

### "Sorry, there is a problem with the service" errors
- Navigation state is inconsistent
- Verify all steps in the path have proper reachability conditions
- Check session state is being saved correctly

### URL doesn't match expected pattern
- The page might have navigated to a different step due to journey logic
- Check the domain navigation logic in `src/eligibility/domain/`
- Verify answer keys match between step field codes and domain logic

