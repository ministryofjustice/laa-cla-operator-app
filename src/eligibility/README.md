# Eligibility Module

A reusable financial eligibility (means test) journey built with HMPPS Forge.

## Usage

### Import

```typescript
import { createEligibilityPackage, CfeHttpClient, SessionAnswerStore } from "src/eligibility";
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

## Boundaries

The module is strictly bounded so it can be copied into another service:

- Code inside `src/eligibility/` may only import:
  - Other files in `src/eligibility/`
  - `@ministryofjustice/hmpps-forge/*`
  - Node built-ins

- Host code must import only from `src/eligibility/index.ts`
