# CFE eligibility implementation plan and agent handoff

## Instructions for the implementing agent

Implement **phase 2A only: the synthetic CFE integration proof** in
`laa-cla-operator-app`, on the existing
`eligibility-client-details-entry` branch. Read this plan and the repository's
instructions before editing. Inspect the actual worktree; the status below is
handoff context, not permission to overwrite existing changes.

Do not change `laa-manage-your-civil-cases` or `cla_backend`. Submit only
explicitly synthetic fixture data to CFE staging. Do not send real case data,
introduce backend storage, or invent a successful eligibility result.
Do not stage or commit changes unless requested.

Deliver working code, focused tests and updated documentation. Report exact
validation commands/results and outstanding business decisions.

## Agreed delivery order

1. **Journey:** start from client details, collect answers and reach a validated
   submission boundary.
2. **CFE integration and question redesign:**
   - **2A (next):** prove server-to-server submission and result display using a
     known-valid synthetic controlled-work request, independent of the questions.
   - **2B:** define and implement the intended Check Client Qualifies question
     flow, validated assessment data and exact request mapping.
   - **2C:** connect real journey answers to the proven CFE client and verify
     complete end-to-end assessments.
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

As of 5 November 2026, the user confirms that the journey works through to the
submission-ready page. The current question flow mirrors manage, but is not
the desired final flow: the operator flow must be redesigned against Check
Client Qualifies. Do not build a full mapper for the current questions first.

The desired separation is:

```text
Operator questions -> validated assessment data -> CFE request
                   -> CFE response -> result page
```

Different question flows may supply the same CFE request structure, but their
information completeness and semantics must be verified, not assumed.

The package has already been copied and renamed, and DOB-derived age answers
have been added. Client-details entry work exists on this branch.

Historical phase-one work included the following files (these are not a current
worktree status report):

- [README](../README.md)
- [Host journey effects](../src/journeys/effects.ts)
- [Client-details blocks](../src/journeys/inbound-call/client-details/block.ts)
- [Client-details step](../src/journeys/inbound-call/client-details/step.ts)
- [Playwright mock handlers](../tests/playwright/factories/handlers/index.ts)
- [Playwright configuration](../tests/playwright/playwright.config.ts)
- [Client-details service tests](../tests/unit/src/services/inboundCallWithDeps.spec.ts)
- New [eligibility end-to-end tests](../tests/playwright/tests/cfe-eligibility.spec.ts)

Preserve this work. DOB remains ISO internally, but the backend personal-details
endpoint requires `dob` as `{ day, month, year }`. That contract mismatch was
fixed and the mock corrected; do not revert it. Case reads supply ISO
`date_of_birth` for age derivation.

### Implementation surfaces to inspect

The table below records the original phase-one starting points. Phase one has
since changed the loading, review and submission behaviour; inspect the current
implementation rather than restoring the original legacy behaviour.

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

## Phase one: journey and submission boundary (delivered foundation)

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

## Phase 2A: synthetic CFE integration proof (next implementation stage)

### Objective

Prove that the operator server can submit a known-valid synthetic controlled-work
payload to CFE staging and display the genuine returned assessment. Keep this
independent of real case answers and the current manage-derived question flow.

### Implementation tasks

1. Inspect current configuration, routing, authentication, services, tests and
   the published CFE schema. Use v7 for the staging proof if the specification
   supports the fixture; document the choice without implying production approval.
2. Create a minimal, clearly synthetic request fixture based on the published
   schema/examples. Set controlled-work scope explicitly and document fixture
   proceeding/date choices. Do not treat those choices as business policy.
3. Implement a reusable, dedicated server-side CFE client with typed contracts,
   runtime response validation, a configured base URL and bounded timeout.
   Reuse existing HTTP/error-handling patterns without forwarding backend tokens.
4. Add a small development/test-only authenticated demonstration page and POST
   action using normal CSRF protection. Use a server-side fixture, not arbitrary
   browser-supplied payloads or destination URLs. Do not calculate on page GET.
5. Gate the page/action off by default and prevent production access even if the
   development flag is accidentally enabled. Verify the gate in tests.
   Keep it separate from the real case's submission-ready action.
6. Clearly label entry and result pages "Synthetic test assessment - not a client
   assessment". No real case identifier, DOB, answers or personal details may be
   included in the outgoing request or associated result.
7. Display the genuine overall financial eligibility, applicable reasons/warnings
   and gross/disposable income and capital breakdown returned by CFE. Do not
   invent reasons, recompute thresholds, or treat omitted components as zero.
8. Handle request validation failures, unexpected statuses, network failures,
   timeout and malformed responses explicitly. Never fall back to a fake success
   or the legacy calculator. Avoid automatic assessment-POST retries.
9. Keep any result in the current test session only; label it as not saved to
   the case. Refresh/result viewing must not silently submit another assessment.
10. Add focused client tests and mocked browser tests. Mocks must be distinguishable
    from evidence of a live staging response. Do not make external calls in CI.
11. Run an explicit synthetic staging smoke test if network/access permits.
    Record the command, HTTP outcome and high-level assessment result without
    credentials or financial payload dumps. If blocked, report the exact blocker
    and do not claim live connectivity is verified.
12. Document local configuration, demonstration route, how to run the synthetic
    check, safety gate and exact validation commands/results.

### Acceptance criteria

- An authenticated developer can run the synthetic assessment and view its
  genuine returned outcome and available financial breakdown.
- Only the documented synthetic fixture is sent, and only to staging for the proof.
- The demonstration is unavailable by default and in production.
- The actual client journey remains unchanged and makes no assessment call.
- No legacy eligibility endpoint or backend assessment persistence is used.
- Success/error, authentication/gating and result rendering tests pass.
- A live staging smoke test is evidenced, or its access blocker is explicit.

### Out of scope

- Changing questions to Check Client Qualifies.
- A full mapper from current journey answers to CFE.
- Production enablement or deployment, real-client submission and backend storage.
- History UI, save retries or changes to manage/cla_backend.

## Phase 2B: Check Client Qualifies questions and mapping

1. Identify and agree the exact Check Client Qualifies journey/version and
   controlled-work subset to use; obtain a reference from the user if unclear.
2. Map each question/branch to the information required by CFE, including
   amounts, frequencies, dates, partner details, dependants and exemptions.
3. Resolve missing inputs and business choices before implementing approximations.
4. Implement the revised standalone journey and a validated assessment-data
   contract independent of page/question codes.
5. Build the pure assessment-data-to-CFE mapper and test exact payload values
   and branch behaviour. Do not assume the previous questions are equivalent.

## Phase 2C: genuine journey assessment

1. Connect the validated journey snapshot and mapper to the proven CFE client.
2. Replace the real journey's preparation boundary with explicit assessment submission.
3. Render the real result and retain its dated input/request/response snapshot
   and application assessment identity in the session.
4. Clearly show that results are not saved to the case yet.
5. Test supported branches, request values, expected assessment outcomes,
   duplicate submissions, edits invalidating results, errors and accessibility.

Use a separate CFE HTTP client; never forward backend credentials to CFE or log
full financial answers/payloads.

Staging documentation:
https://cfe-civil-staging.cloud-platform.service.justice.gov.uk/api-docs/index.html

The documentation publishes v6 and v7. v7 is the proposed target, not yet an
approved production contract. Its `assessment.level_of_help` must explicitly be
`controlled`; omission defaults to `certificated`.

Phase 2C acceptance: a genuine controlled-work result from the revised journey
is displayed without legacy calculation or assessment persistence. Session loss
can still lose results. Phase 2A alone does not establish this.

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

> Work in laa-cla-operator-app on the existing eligibility-client-details-entry
> branch. Read docs/cfe-eligibility-implementation-plan.md and repository
> instructions, inspect current code/worktree and preserve existing changes.
> Implement phase 2A only: a development/test-only synthetic CFE integration proof.
>
> Phase one works through the submission-ready page. The questions currently
> mirror manage; they will later be redesigned against Check Client Qualifies.
> Do not change those questions or build a full mapper for them now.
>
> Use the CFE staging documentation at
> https://cfe-civil-staging.cloud-platform.service.justice.gov.uk/api-docs/index.html
> to build a known-valid synthetic controlled-work fixture and a reusable
> server-side client with typed contracts, runtime validation and timeout/error
> handling. Add an authenticated, CSRF-protected development demonstration page
> and POST action, off by default and inaccessible in production. Keep it separate
> from the client journey and label every demonstration result as synthetic,
> not a client assessment and not saved.
>
> Send only the synthetic fixture to staging; do not send real case data or
> backend credentials. Display the genuine returned eligibility, applicable
> reasons/warnings and available income/capital breakdown. Never invent results
> or silently substitute missing figures. No calculation on GET, no implicit
> repeat calculation on refresh and no automatic POST retries.
>
> Add focused mocked client/browser tests, verify safety gates and unchanged
> client-journey behaviour, and run a synthetic live staging smoke test if access
> permits. Distinguish mocked verification from live evidence and report exact
> blockers if connectivity cannot be verified. Document local usage and exact
> commands/results without logging sensitive payloads.
>
> Do not change manage or cla_backend, implement persistence/history, enable
> production use, or stage/commit. Stop after phase 2A and summarise the files
> changed, verification and decisions needed for phase 2B.
