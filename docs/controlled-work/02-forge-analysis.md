# HMPPS Forge analysis for the controlled-work journey

## Scope

This analysis is based on the installed `@ministryofjustice/hmpps-forge` **0.4.5** API and the current application implementation. It does not change application behaviour. The Stage 01 journey analysis identifies the controlled-work question sequence and flags decisions about under-18 exemptions, immigration matter mapping, and CFE data that must be resolved before those branches are implemented.

## Existing files and responsibilities

| File | Responsibility |
|---|---|
| [`package.json`](../../package.json) | Pins HMPPS Forge and exposes unit, Playwright, build, and lint scripts. |
| [`packages/cfe-eligibility-journey/src/journey.ts`](../../packages/cfe-eligibility-journey/src/journey.ts) | Defines the existing case-scoped financial-eligibility Forge journey: code, route, access effects, view, and ordered step list. |
| [`packages/cfe-eligibility-journey/src/*Page/*Step.ts`](../../packages/cfe-eligibility-journey/src) | Defines individual question/review steps, their route paths, reachability, access hooks, submit validation, effects, and redirects. |
| [`packages/cfe-eligibility-journey/src/*Page/*Block.ts`](../../packages/cfe-eligibility-journey/src) | Composes question fields and display blocks, including labels, options, validation, conditional rows, and Change links. |
| [`packages/cfe-eligibility-journey/src/authoring.ts`](../../packages/cfe-eligibility-journey/src/authoring.ts) | Wraps Forge's `step()` to retain the application's required `code` typing. |
| [`packages/cfe-eligibility-journey/src/effects.ts`](../../packages/cfe-eligibility-journey/src/effects.ts) | Declares and registers custom Forge effects, including case loading, draft operations, age derivation, review validation, and repeating-field operations. |
| [`packages/cfe-eligibility-journey/src/context.type.ts`](../../packages/cfe-eligibility-journey/src/context.type.ts) | Extends Express `Session` with eligibility drafts, repeating-field drafts, review snapshots, errors, and discard return paths. |
| [`packages/cfe-eligibility-journey/src/casePatternDrafts.ts`](../../packages/cfe-eligibility-journey/src/casePatternDrafts.ts) | Stores/restores case-scoped repeating-field data used by the property collection. |
| [`packages/cfe-eligibility-journey/src/answerSnapshot.ts`](../../packages/cfe-eligibility-journey/src/answerSnapshot.ts) and [`draftState.ts`](../../packages/cfe-eligibility-journey/src/draftState.ts) | Types and filters active answers, checks required answers, builds a review snapshot, and invalidates prepared state when answers change. |
| [`packages/cfe-eligibility-journey/src/commonBlocks.ts`](../../packages/cfe-eligibility-journey/src/commonBlocks.ts) | Shares journey action buttons, discard link, and validation message blocks. |
| [`packages/cfe-eligibility-journey/src/moneyFieldHelpers.ts`](../../packages/cfe-eligibility-journey/src/moneyFieldHelpers.ts) and [`dependantsFieldHelpers.ts`](../../packages/cfe-eligibility-journey/src/dependantsFieldHelpers.ts) | Reusable field construction and domain validation rules; custom money conditions are registered by the host. |
| [`src/journeys/inbound-call/journey.ts`](../../src/journeys/inbound-call/journey.ts) and [`client-details/step.ts`](../../src/journeys/inbound-call/client-details/step.ts) | Defines the existing `/case/:caseId` client-details journey and its step that starts eligibility. |
| [`src/journeys/inbound-call/client-details/block.ts`](../../src/journeys/inbound-call/client-details/block.ts) | Configures the client name, DOB, contact inputs, validation, and the two submit actions. |
| [`src/journeys/effects.ts`](../../src/journeys/effects.ts) | Implements inbound-call effects. `saveClientDetails` updates the case API and invalidates an eligibility snapshot after a client detail change. |
| [`src/services/financialEligibilityWithDeps.ts`](../../src/services/financialEligibilityWithDeps.ts) | Implements eligibility effects using case details, request context, and the Express session. |
| [`src/services/api/caseDetailsService.ts`](../../src/services/api/caseDetailsService.ts) and [`types/api-types.ts`](../../types/api-types.ts) | Load/update case details and declare `CaseDetails`, the client-details response wrapper, and the existing call-centre eligibility data shape. |
| [`src/services/cfeClient.ts`](../../src/services/cfeClient.ts) and [`src/services/cfeSyntheticFixture.ts`](../../src/services/cfeSyntheticFixture.ts) | Define and exercise the application's current, limited synthetic CFE request type. |
| [`src/app.ts`](../../src/app.ts), [`src/journeys/inbound-call/index.ts`](../../src/journeys/inbound-call/index.ts), and [`src/journeys/index.ts`](../../src/journeys/index.ts) | Register Forge components, functions, packages, and effect dependencies; connect Forge's generated router to Express. |
| [`routes/index.ts`](../../routes/index.ts) | Provides application routes and redirects the non-`/change` CFE eligibility URL back to client details. |

The Forge API was inspected in the installed package's `forge-core` authoring types/builders, components types, and `forge-express-nunjucks` adapter. In version 0.4.5, a `JourneyDefinition` contains ordered `steps` (and optionally nested `children`); it has **no first-class section definition or `section()` builder**. `metadata` is generic data and does not by itself create a section or navigation group. Treat “section” as a content/navigation grouping in this application, not as a Forge structure.

## Forge patterns to reuse

### Journeys, steps, and sections

- The existing eligibility package exports one `journey()` definition with a stable code, title, parameterised case path, access effects, view, and ordered `steps`.
- Each page is a `step()` with its own code, path, title, blocks, and lifecycle hooks. The package's small `authoring.step` wrapper exists to retain the local `code` type; it is not a second routing abstraction.
- Use one existing eligibility journey/package for the controlled-work flow, with the controlled-work steps and any shared means-test steps in the appropriate sequence. Keep one step module and one block module per page, following the current naming/layout. Do not add a separate router or session framework.
- Group the pages by ordering and visible headings/summary cards. Use `metadata` only if a concrete template or navigation consumer needs a label; it does not replace a section implementation in the view.

### Questions, components, and validators

- Blocks use the registered Forge GovUK component set, e.g. `GovUKTextInput`, `GovUKDateInputFull`, `GovUKRadioInput`, `GovUKSelectInput`, headings, buttons, and summary lists. `CollectionBlock` composes ordered field and display blocks for a page.
- Each input's `code` is its answer key. Configure fieldset legends, hint text, radio/select items, formatting/parsing, and default values in the component props. Existing eligibility yes/no questions use `"yes"`/`"no"` string values.
- `validWhen` is a list of `validation({ condition, message, details? })` rules. Reuse built-in `Condition` predicates already used here (`IsRequired`, numeric bounds/integer/range, valid dates) and combinators such as `and`, `or`, and `not`. Error messages are declared with the field, not implemented in a separate controller.
- Reuse [`moneyFieldHelpers.ts`](../../packages/cfe-eligibility-journey/src/moneyFieldHelpers.ts) for the applicable shared money validation/formatting and [`dependantsFieldHelpers.ts`](../../packages/cfe-eligibility-journey/src/dependantsFieldHelpers.ts) for dependant maximum validation. The money helper's custom two-decimal predicate uses `ConditionRegistry` and is registered globally in [`app.ts`](../../src/app.ts); add no duplicate condition unless new controlled-work rules genuinely differ.
- `visibleWhen` controls whether a block is rendered. `dependentWhen` is for field state: when false it skips validation and clears the answer, but **does not hide the field**. Use both where the UI must hide an answer and its value must not remain active.
- Current `client-details/block.ts` demonstrates full DOB validation including field-specific error details. `under18Block.ts` and `benefitsBlock.ts` demonstrate required radio controls and inline validation messages. Preserve accessible legends, labels, and field-specific error details.

### Conditions, effects, and navigation

- `Answer(code)`, `Self()`, `Data(key)`, `Post(key)`, and `Params(key)` address answers, current fields, loaded data, submission data, and route parameters in Forge expressions. `Condition`, `and`/`or`/`not`, and registered custom functions express predicates.
- Put request-wide loading/restoration in journey `onAccess` effects, as `eligibilityJourney` does. Use step `onAccess` for a page-specific gate or redirect. Use `onSubmission` with `submit({ validate: true, onValid: { effects, next } })` to save answers and route only after valid input.
- `redirect({ when, goto })` outcomes are ordered; the first matching outcome is used. Current steps use this for yes/no branches and use a fallback redirect for unexpected/unanswered states. Forge's `reachability.entryWhen` identifies branch entry points and supports reachability/back-link calculations; a route redirect is still needed for a branch decision.
- Effects are declared through `EffectRegistry`, bundled with `createForgePackage`, and receive dependencies at registration in [`app.ts`](../../src/app.ts). Existing eligibility effect implementations delegate host work through the typed `FinancialEligibilityEffectsWithDeps` interface in [`api.ts`](../../packages/cfe-eligibility-journey/src/api.ts). Reuse this boundary for case API calls/session work instead of making UI blocks call services.
- Forge's Express adapter is mounted once with `createExpressRouter`. Journey and step paths generate routes; the application does not add a controller per Forge question. The existing client-details step is the exception only in the sense that it is another Forge step with an API-saving effect; it is not a separate Express controller.

## Connection to client details and session data

The existing client-details page is `/case/:caseId/add-client-details`. Its “Check financial eligibility” submit action validates the page, runs `saveClientDetails`, updates the case personal-details API, then redirects to `/cases/:caseId/cfe-eligibility/change`. The eligibility journey's `onAccess` chain loads the case, restores its case-scoped draft, derives age answers from the real DOB, and restores submission state. Preserve this hand-off: use the case reference in the path, and use the case API as the source of the current DOB rather than adding a duplicate DOB/age answer.

`CaseDetails` includes `reference`, `full_name`, `date_of_birth`, phone, and case `category`. The client-details effect sends the submitted name/DOB/contact values to the case API. Eligibility's `LoadCaseDetails` puts the case in Forge `Data`, sets the DOB data key, and normalizes `category` into an answer. The current client-details fields do not set `defaultValue` from the loaded case, so loading a `case` does not itself prepopulate those controls.

Forge's effect context provides `getAnswer`, `setAnswer`, `getAllAnswers`, and `clearAnswer`; the Express request also passes its session to Forge. In this application, however, cross-request eligibility answer persistence is implemented explicitly rather than assumed: `SaveNewAnswerIfAnswered` copies posted, allow-listed answers to `session.financialEligibilityDrafts[caseId]`, and `RestoreCaseDraft` clears the current eligibility answers then restores that case's draft into Forge. Repeating property fields use a separate case-scoped `casePatternDrafts` store. Review snapshots, validation errors, prepared state, and discard return paths are also case-scoped in the session.

For the new questions, add answer codes/types to the existing eligibility draft/snapshot handling and save/restore through those effects. Keep answers scoped to the current case, preserve values when a user revisits a question, and exclude answers made inactive by branch changes from review/submission. Check `answerSnapshot.ts` before changing the allow-list or active-branch logic. Use Forge `defaultValue` for actual defaults or values derived from loaded `Data`; do not use it as a substitute for restoring a previously saved answer.

## Check answers and Change links

The existing `checkAnswersStep` uses `GovUKSummaryList` blocks with direct Change links to step paths (for example `href: 'under-18'`) and `visibleWhen` predicates for conditional rows/cards. On access, it validates required answers and redirects to the first missing step; submission prepares a typed session snapshot and checks validity again.

This is not a pending-copy change-answer workflow: accepted answers are saved to the session draft as each step is submitted. A Change link opens that question, after which the normal step submission redirects according to its usual branch logic; there is no general “return to check answers after editing” loop. Changes invalidate prepared state, and the snapshot builder filters inactive branch answers. If the controlled-work UX requires Change to return directly to review, implement that as an explicit, tested navigation path rather than assuming Forge supplies it.

## Recommended controlled-work structure

1. Keep the existing package and `eligibilityJourney` route. Add controlled-work step/block pairs under the package, and place the ordered controlled-work and shared means-test steps in that journey's existing `steps` list. Keep the existing application registration and its dependency/effect boundary.
2. Make the first controlled-work step the immigration/asylum matter question required by Stage 01. Then apply the under-18 screening and later matter/type/support rules in the agreed order. Do not simply copy the current age-question redirects: today DOB-derived age steps can be skipped directly to the under-18 follow-up or partner question.
3. Use page-local `validWhen` rules for required answers and component-level `visibleWhen`/`dependentWhen` for conditional fields. Use step submission redirects for conditional next-page paths. Build check-answer cards from the same answer codes and predicates as the question flow.
4. Reuse session effects, case loading, answer snapshot machinery, shared blocks and helpers. Extend an existing helper only where multiple controlled-work pages share a concrete rule (for example common CFE money constraints or a repeated fieldset). Avoid a general “section engine”, a second draft store, or a duplicate validator layer: Forge already provides steps, blocks, conditions, validation, navigation, and effects, and the app already provides session persistence.
5. Keep the client-details entry point responsible for saving the authoritative case details before it redirects. Load them in the eligibility journey's access effect and make DOB/other case values available through Forge `Data`. Add explicit defaults only where a new question actually needs an existing case value.

## Client/CFE data and integration gaps

- [`types/api-types.ts`](../../types/api-types.ts) models both the call-centre `CaseDetails`/`ClientDetailsApiResponse` and the older `FinancialEligibilityData` saved by the call-centre eligibility-check API. The latter is a camelCase/legacy screen-oriented structure; it is not a Forge session answer schema.
- [`src/services/cfeClient.ts`](../../src/services/cfeClient.ts) declares `CfeAssessmentRequest` using the CFE snake_case contract (`assessment`, `applicant`, `proceeding_types`, `capitals.bank_accounts`, and `cash_transactions`). Its current shape is deliberately limited and used by [`cfeSyntheticFixture.ts`](../../src/services/cfeSyntheticFixture.ts) for synthetic CFE requests, not a mapper for the full eligibility journey.
- The eligibility package currently prepares a typed answer snapshot; this analysis found no adapter that turns its full answer snapshot into a complete CFE request. Do not treat either the old `FinancialEligibilityData` or the synthetic request type as the target model for all new controlled-work fields without confirming the consuming API contract. A typed adapter/mapping is required when the journey is wired to submit the full controlled-work assessment; its necessity is to keep answer/session types separate from the CFE wire format and to test field names, units, conditional omissions, and proceeding codes at one boundary.
- Confirm with the product/API owners how the controlled matter selection maps to `proceeding_types[].ccms_code`, how level of help is supplied, and which under-18 exempt cases still need a matter type. Stage 01 records inconsistencies in immigration legal-help mapping and the under-18 no-means-test branch. These are policy/API decisions, not safe defaults for journey routing.
- The route's existing case `category` describes case category and is not, by itself, a reliable level-of-help selector. Decide how the controlled-work entry is identified from trusted route/context data before branching; do not infer it from an unrelated answer.

## Testing approach

- Add unit tests beside the current package tests under [`tests/unit/packages/cfe-eligibility-journey`](../../tests/unit/packages/cfe-eligibility-journey). Use `ForgeTestHarness` with strict registration, registered GovUK components/functions, and stubbed effect dependencies to exercise GET/POST routing, validation failures, effects, and conditional visibility.
- Add focused tests for any shared predicate, answer snapshot/branch filter, or CFE mapping helper. Assert exact answer codes, required/error behavior, first missing step, filtered inactive answers, and outbound wire payload—not only the number of redirects.
- Extend [`financialEligibilityJourneyRouting.spec.ts`](../../tests/unit/packages/cfe-eligibility-journey/financialEligibilityJourneyRouting.spec.ts) for branch destinations, and [`answerSnapshot.spec.ts`](../../tests/unit/packages/cfe-eligibility-journey/answerSnapshot.spec.ts) for new active/inactive answer combinations.
- Extend [`tests/playwright/tests/cfe-eligibility.spec.ts`](../../tests/playwright/tests/cfe-eligibility.spec.ts) for the end-to-end entry from client details, DOB-derived under-18 behavior, conditional branches, validation, session revisit, and Change/review navigation. Keep [`add-client-details.spec.ts`](../../tests/playwright/tests/add-client-details.spec.ts) covering its existing validation and save/address behavior so the hand-off does not regress.
- Run the targeted Mocha unit tests and the relevant Playwright spec when implementing the journey; use the repository scripts `yarn test:unit` and `yarn test:e2e` as the available suite commands. This documentation-only change does not require application tests.

## Decisions required before implementation

1. Resolve the Stage 01 policy questions for under-18 clients: the matter question is first, but the existing CFE age logic skips to an under-18 follow-up and the current no-means-test branch omits the matter type/support pages.
2. Confirm the authoritative branch/level-of-help source and CFE proceeding-code mapping, particularly `immigration_legal_help`.
3. Confirm whether Change links should follow the current normal branch flow or return to Check answers after editing.
4. Confirm the complete CFE request contract and whether a full request should be submitted/prepared in this journey or through another existing boundary.

No new abstraction is recommended for the journey structure or session store. A focused CFE payload adapter is warranted only at the eventual API boundary because the existing Forge answer snapshot, legacy call-centre data model, and synthetic CFE request are distinct representations.
