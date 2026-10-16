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
npm test -- tests/playwright/tests/eligibility-journey-controlled.spec.ts
```

### Run tests in headed mode (see browser)
```bash
npm test -- --headed tests/playwright/tests/eligibility-journey-under-18.spec.ts
```

### Run a specific test
```bash
npm test -- --grep "under 18 with controlled legal representation"
```

## Page Objects

### `EligibilityBasePage.ts`
Base class for all eligibility step pages. Provides common methods:
- `navigate(path)` - Navigate to a specific eligibility step
- `selectRadio(label)` - Select a radio button by label text
- `fillTextInput(label, value)` - Fill text input by label
- `submit()` - Click continue/submit button
- `clickBack()` - Click back button

### `LevelOfHelpPage.ts`
Specific page object for the level-of-help step.

### `EligibilitySteps.ts`
Page objects for other key steps:
- `Under18ClrPage`
- `AggregatedMeansPage`
- `ImmigrationOrAsylumPage`
- `DomesticAbuseApplicantPage`
- `ApplicantPage`
- `CheckYourAnswersPage`

## Adding New Tests

### Adding a test for a new journey path

1. Create a new test file following the naming convention:
   ```typescript
   test.describe("Eligibility journey - [Path name]", () => {
     let checkId: string;

     test.beforeEach(async ({ page }) => {
       await page.goto("/eligibility/");
       checkId = page.url().split("/").pop() || "";
     });

     test("description of test case", async ({ page, pages }) => {
       const { levelOfHelpPage, immigrationOrAsylumPage } = pages;

       // Navigate and interact with pages
       await levelOfHelpPage.navigate(`/eligibility/${checkId}/level-of-help`);
       await levelOfHelpPage.selectControlled();
       await levelOfHelpPage.submit();

       // Verify navigation
       await expect(page).toHaveURL(/immigration-or-asylum/);
     });
   });
   ```

2. Use existing page objects or create new ones for steps not yet covered

### Adding a new page object

1. Create a new class extending `EligibilityBasePage`:
   ```typescript
   import { EligibilityBasePage } from "./EligibilityBasePage.js";

   export class MyStepPage extends EligibilityBasePage {
     async selectOption(optionName: string): Promise<void> {
       await this.selectRadio(optionName);
     }
   }
   ```

2. Add to `PageFactory.ts`:
   ```typescript
   get myStepPage(): MyStepPage {
     return new MyStepPage(this.page);
   }
   ```

3. Use in tests:
   ```typescript
   const { myStepPage } = pages;
   await myStepPage.navigate(`/eligibility/${checkId}/my-step`);
   ```

## Journey Paths to Test

### Controlled Work Flows (for under 18)
- [ ] Under 18 + CLR (controlled legal representation) - no means test
- [ ] Under 18 + no CLR + aggregated means
- [ ] Under 18 + regular income
- [ ] Under 18 + assets
- [ ] Under 18 + immigration/asylum (controlled route)

### Controlled Work Flows (for adults)
- [ ] Adult + immigration/asylum (controlled)
- [ ] Adult + no immigration/asylum

### Non-Controlled/Non-Certificated Flows
- [ ] Domestic abuse + partner
- [ ] Domestic abuse + no partner
- [ ] Immigration/asylum type upper tribunal + asylum support

### Backtracking/Regression Tests
- [x] Backtracking and changing answers
- [x] Multiple cycles of backtrack-forward
- [x] Partner question accessibility
- [x] Service error prevention

## Debugging Failed Tests

### Tests fail to navigate to a step
- Check that the step code in the URL matches the step filename
- Verify the step has proper `reachability` conditions
- Check that the navigation logic (`stepsFor()`) returns the expected steps

### Tests show 302 redirects
- Step is missing `reachability` condition
- Check `src/eligibility/journey/[step-name]/step.ts` has:
  ```typescript
  reachability: {
    entryWhen: EligibilityConditions.StepIsRelevant(STEP_CODE),
  }
  ```

### "Sorry, there is a problem with the service" errors
- Navigation state is inconsistent
- Verify all steps in the path have proper reachability conditions
- Check session state is being saved correctly
