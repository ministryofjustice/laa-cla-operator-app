# Eligibility Module

A reusable financial eligibility (means test) journey built with HMPPS Forge.

## Usage

### Import

```typescript
import {
  createEligibilityPackage,
  CfeHttpClient,
  SessionAnswerStore,
} from "src/eligibility";
```

### Create and Register Package

```typescript
const eligibilityPkg = createEligibilityPackage({
  path: "eligibility",
  onAccess: [requireSilasAuth],
  checkId: Params("caseId"),
  presetAnswers: { level_of_help: "controlled" },
  onComplete: Format("/case/%1/eligibility-result", Params("caseId")),
  template: { layout: "layouts/operator.njk" },
});

forge.registerPackage<EligibilityDeps>(eligibilityPkg, {
  assessor: new CfeHttpClient(config.cfe),
  resultHandler: new YourResultHandler(),
  answerStore: new SessionAnswerStore(),
});
```

## Dependencies

The module requires an `EligibilityDeps` object with:

- **assessor** (Assessor): Calls CFE API. Use `CfeHttpClient` or implement your own.
- **resultHandler** (ResultHandler): Handles the eligibility result. Must be implemented by the host.
- **answerStore** (AnswerStore, optional): Persists answers. Defaults to `SessionAnswerStore`.

## Checking answers

Before an assessment is sent to CFE, the check your answers page displays the
answered questions on the client's current journey route. Question text and option
labels come from the original form definitions; unanswered optional fields and
answers from branches that no longer apply are omitted.

Each answer has a Change link to its original, pre-filled form. Continuing from
that form follows the current journey, including any questions required by the
changed answer, and returns to check your answers. CFE is called only when the
operator selects **Accept and continue** on the review page.

## Subject matter of dispute

The SMOD checkboxes for property, investments, and valuable items are optional.
Leave a checkbox unchecked when the asset is not a subject matter of dispute;
no explicit answer is required to continue.

## Boundaries

The module is strictly bounded so it can be copied into another service:

- Code inside `src/eligibility/` may only import:
  - Other files in `src/eligibility/`
  - `@ministryofjustice/hmpps-forge/*`
  - Node built-ins

- Host code must import only from `src/eligibility/index.ts`
