# CFE eligibility implementation plan and phase-one handoff

## Instructions for the implementing agent

Implement **phase one only** in `laa-cla-operator-app`, on the existing
`eligibility-client-details-entry` branch. Read this plan and the repository's
instructions before editing. Inspect the actual worktree; the status below is
handoff context, not permission to overwrite existing changes.

Do not change `laa-manage-your-civil-cases` or `cla_backend`. Do not submit to
CFE, introduce backend storage, or invent an eligibility result in phase one.
Do not stage or commit changes unless requested.

Deliver working code, focused tests and updated documentation. Report exact
validation commands/results and outstanding business decisions.

## Agreed delivery order

1. **Journey:** start from client details, collect answers and reach a validated
   submission boundary.
2. **CFE integration:** submit directly from the operator server and display the
   genuine returned result.
3. **Persistence:** add backend storage for multiple dated assessments, then wire
   operator saving, reopening and history.

The assessment scope is **controlled work only**. The eventual result page must
show overall financial eligibility, reasons/warnings and a financial breakdown.
If CFE succeeds but backend saving fails, show the result as unsaved and offer
a retry of saving only, not a second CFE calculation.

The operator journey must remain a standalone package, distinct from manage's
journey. Manage's owners will implement support for the operator version later.
Legacy frontend calculation must remain unchanged.

## Current foundation

The package has already been copied and renamed, and DOB-derived age answers
have been added. Client-details entry work exists on this branch.

At handoff, the following existing changes were uncommitted:

- [README](../README.md)
- [Host journey effects](../src/journeys/effects.ts)
- [Client-details blocks](../src/journeys/inbound-call/client-details/block.ts)
- [Client-details step](../src/journeys/inbound-call/client-details/step.ts)
- [Playwright mock handlers](../tests/playwright/factories/handlers/index.ts)
- [Playwright configuration](../tests/playwright/playwright.config.ts)
- [Client-details service tests](../tests/unit/src/services/inboundCallWithDeps.spec.ts)
- New [eligibility end-to-end tests](../tests/playwright/tests/cfe-eligibility.spec.ts)

Preserve and integrate these changes. In particular, client-details saving now
converts DOB into the ISO date string rather than sending the raw date object.

### Implementation surfaces to inspect

| Surface                                                                                     | Current role / required attention                                                                 |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [Standalone package](../packages/cfe-eligibility-journey/src/)                              | Questions, branches, review, authoring and effect contracts                                       |
| [Journey definition](../packages/cfe-eligibility-journey/src/journey.ts)                    | Runs case loading, legacy eligibility loading and DOB injection on access                         |
| [Client age helper](../packages/cfe-eligibility-journey/src/clientAge.ts)                   | DOB-derived answers and age boundaries                                                            |
| [Package effects](../packages/cfe-eligibility-journey/src/effects.ts)                       | Keep host dependencies injected; use existing Forge conventions                                   |
| [Host eligibility service](../src/services/financialEligibilityWithDeps.ts)                 | Legacy loading/mapping/persistence and case-specific session drafts                               |
| [Backend API service](../src/services/api/caseDetailsService.ts)                            | Existing legacy eligibility read/write functions                                                  |
| [Review step](../packages/cfe-eligibility-journey/src/checkAnswersPage/checkAnswersStep.ts) | Currently submits without full-journey validation, saves legacy data, clears drafts and redirects |
| [Shared actions](../packages/cfe-eligibility-journey/src/commonBlocks.ts)                   | Current review button says Submit                                                                 |
| [Legacy API types](../types/api-types.ts)                                                   | Do not use legacy FinancialEligibilityData as the new canonical answer contract                   |
| [End-to-end tests](../tests/playwright/tests/cfe-eligibility.spec.ts)                       | Existing save/reload expectations must change to draft-only preparation                           |

The journey route is `/cases/:caseId/cfe-eligibility/change`.
The entry screen is `/case/:caseId/add-client-details`.
Confirm route registration, templates, authentication and return paths in the
actual code before making changes.

## Phase one: journey and submission boundary

### 1. Finish client-details entry

- Preserve the secondary Check financial eligibility button.
- Validate and save client details before redirecting into the journey.
- Keep ordinary Save and continue leading to address lookup.
- On client-save failure, surface the error and do not enter eligibility.
- Supply saved DOB to the journey; skip only age questions that DOB answers.

Normal client/case saving remains allowed. The bypass applies to financial
eligibility reads/writes, not all backend calls.

### 2. Make financial answers session-draft-driven

- Keep authenticated case and DOB loading.
- Replace legacy eligibility hydration with initialisation/restoration of a
  draft for the current case.
- Do not import legacy financial data as if it were answers to the new journey.
- Preserve answers during navigation, refresh and re-entry within the session.
- Prevent case-to-case leakage and stale derived DOB values after case changes.
- Preserve drafts for inactive branches where useful for editing, but exclude
  those answers from the active submission snapshot.
- Use existing draft/property collection helpers where appropriate.

Session drafts are temporary. Durable recovery after session expiry is excluded.

### 3. Audit questions and define the answer contract

- Introduce a typed, versioned answer snapshot distinct from the legacy backend
  payload. Do not add unnecessary abstractions or placeholder backend APIs.
- Compare current questions with required and conditional controlled-work CFE
  inputs: applicant/partner, DOB, benefits, income and frequencies, capital,
  properties/mortgages/ownership/disputes, dependants, expenses and disregards.
- Record missing or ambiguous inputs and resolve essential question changes
  with the user before locking the contract.
- Do not fabricate dates, zero missing values to imply completeness, or assume
  legacy shortcuts match CFE rules.
- Keep HTTP, credentials and backend persistence in the host, outside the
  standalone authoring package.

This audit is phase-one preparation. The exact CFE payload mapper and HTTP
submission belong to phase two.

### 4. Implement the validated submission boundary

- Retain the final Check your answers review and working change links.
- Validate required answers across the active journey, not just review fields.
- Incomplete drafts must return to the appropriate question with an explicit
  validation message, including direct review/preparation URL access.
- Replace legacy Submit/save-and-exit with a clearly labelled preparation
  action and submission-ready screen.
- The screen must explicitly say that no financial eligibility calculation has
  run and no assessment has been saved.
- Provide return-to-review and return-to-client-details actions.
- Keep the draft available; preparation must not call PersistSavedAnswers or
  ClearDraftAnswers.
- Editing answers must invalidate/rebuild any prepared snapshot.
- Preserve explicit discard confirmation and its correct return path.
- Use Forge's supported authoring/effect patterns. In particular, prior work
  found Answer() cannot be used inside onAccess hooks; retain the established
  Data/effect pattern for DOB-derived navigation.

### 5. Update tests and documentation

Use the existing tooling and patterns. Add focused coverage for:

- Client-details validation, successful saving and save failure.
- DOB age boundaries and partner questions that cannot be inferred from client DOB.
- Adult, child, partner, benefits and financial branches.
- Properties/repeating collections and inactive-branch filtering.
- Incomplete drafts and direct review/preparation access.
- Change answers after preparation, back, refresh, session resume and discard.
- Case isolation.
- Accessibility of entry, review and submission-ready screens.
- Absence of legacy eligibility reads/writes and CFE assessment calls.

Assert absence of those calls explicitly; a passing mocked UI flow alone does
not prove the legacy path has been bypassed.

Inspect [package scripts](../package.json), test configuration and existing test
selectors before running commands. Start with focused tests, then use the
existing checks as appropriate:

```sh
yarn eslint .
yarn format:check
yarn tsc
yarn test:unit
yarn test:e2e
```

Use targeted test selectors where possible. `yarn lint` currently runs ESLint
with `--fix`; avoid unintended broad formatting changes. Run broader coverage
only when justified, and report failures or validation limitations explicitly.

### Phase-one acceptance criteria

- Valid client details lead to the first unanswered eligibility question.
- All initially supported branches reach review and a validated submission-ready
  screen with a complete, active-branch answer snapshot.
- DOB skips only questions it answers.
- Missing answers cannot bypass validation through direct URLs or submission.
- Existing normal client-details Save and continue behaviour is preserved.
- No legacy financial eligibility read/write or CFE assessment call occurs.
- No calculated/saved financial result is implied by the UI.
- Drafts survive preparation and editing within the session.
- Discard, return routes, accessibility and case isolation work.
- Relevant unit/E2E tests and type/lint checks pass.

### Explicit phase-one exclusions

- CFE HTTP calls, calculation/result display and deployment connectivity changes.
- cla_backend code, database migrations or assessment save endpoints.
- Assessment history and current-assessment selection.
- Durable draft/result storage.
- Fake eligibility responses or fallback to the legacy calculator.
- Changes to manage or its deployment configuration.

## Phase two: CFE submission and result display

After phase one is reviewed:

1. Confirm the approved API version, proceeding mapping, assessment date policy,
   exemption rules and legal help versus controlled legal representation.
2. Build a tested exact request mapper with explicit controlled-work scope.
3. Add a dedicated server-side CFE client, runtime validation, environment
   configuration and explicit error handling.
4. Replace the preparation boundary with genuine assessment submission.
5. Display overall result, reasons/warnings, gross/disposable income and capital
   breakdown using CFE output rather than locally duplicated eligibility rules.
6. Keep a dated answer/request/response snapshot and application assessment
   identity in the session. New calculations create new snapshots.
7. Clearly label results as not saved to the case while backend persistence
   is unavailable. Do not offer a save retry before the API exists.
8. Test service failures, malformed responses, duplicate submissions,
   out-of-date results after editing, accessibility and synthetic staging calls.

Use a separate CFE HTTP client; never forward backend credentials to CFE or log
full financial answers/payloads.

Staging documentation:
https://cfe-civil-staging.cloud-platform.service.justice.gov.uk/api-docs/index.html

The documentation publishes v6 and v7. v7 is the proposed target, not yet an
approved production contract. Its `assessment.level_of_help` must explicitly be
`controlled`; omission defaults to `certificated`.

Acceptance: a genuine controlled-work CFE response is displayed without legacy
calculation or assessment persistence. Session loss can still lose results.

## Phase three: backend persistence and multiple dated results

Backend work will be separately agreed and implemented later.

Recommended design: one case linked to many immutable CFE assessment records.
Each record stores:

- Unique assessment identity and case relationship.
- Assessment date separately from creation timestamp.
- Operator attribution, journey/schema and CFE API versions.
- Answer snapshot, exact request, validated response and overall result.

Requirements:

- New calculation creates a new record; save retries are idempotent.
- Multiple assessments on the same date are allowed.
- Historical records remain unchanged when answers are corrected.
- Agree explicit current-assessment selection rather than assuming newest
  creation time or assessment date always determines the current result.
- Add authorised save/list/read APIs.
- Leave legacy frontend calculation unchanged.
- Wire operator saving, reopening, history and saved/unsaved status.
- On persistence failure, retry saving the same response without rerunning CFE.
- Clear completed drafts only after confirmed persistence.
- Test concurrent saves, retries, history, current selection and legacy regression.

Alternatives considered: reuse legacy calculations JSON or add fields to the
legacy eligibility model. Neither naturally provides safe assessment history;
a separate case-linked model is preferred. Storage design is not phase-one work.

## Outstanding decisions and implementation stop points

Ask the user when needed about:

- Approved CFE API version and proceeding-type mapping.
- Legal help versus controlled legal representation.
- Assessment date and supported exemption policy.
- Required question changes where existing inputs are insufficient.

These do not block entry/draft/navigation implementation, but must be resolved
before claiming the answers can produce a complete and accurate CFE request.
Do not silently drop supported branches or approximate missing inputs.

## Suggested prompt for the next agent

> Read docs/cfe-eligibility-implementation-plan.md and implement phase one only
> on the existing eligibility-client-details-entry branch in
> laa-cla-operator-app. Preserve the current uncommitted changes. Complete
> client-details entry, session-only eligibility drafts, active-journey
> validation and the submission-ready boundary. Remove legacy financial
> eligibility reads/writes from this journey. Do not call CFE, change
> cla_backend/manage, or stage/commit. Ask about essential unresolved business
> inputs; run focused tests and report validation results.
