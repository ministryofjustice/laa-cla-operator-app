# Controlled-work implementation specification

## Status and scope

This is the implementation handoff for the controlled-work journey in `laa-cla-operator-app`. It specifies the page set, route rules, session contract, change-answer and check-answers behaviour, CFE mapping, and parity tests. It does not authorize changes to the existing Forge package or CFE client in this documentation stage.

This specification uses both [`01-journey-analysis.md`](./01-journey-analysis.md) and [`02-forge-analysis.md`](./02-forge-analysis.md), and verifies target implementation details against the current Forge package and CFE client. CCQ source paths refer to the sibling repository `laa-check-client-qualifies`; target paths are relative to `laa-cla-operator-app`.

The task-specific ordering applies: `immigration_or_asylum` is first, before under-18 screening. The implementation target is the existing `packages/cfe-eligibility-journey`, not `laa-manage-your-civil-cases` and not a new journey/router. It otherwise retains CCQ controlled-work content and route dependencies, except where an explicit decision is still required.

## 1. Controlled-work page inventory and order

There are **37 distinct controlled-work page IDs** in the CCQ step inventory. The user sees the applicable subset only. `housing_costs`, `mortgage_or_loan_payment`, and `shared_ownership_housing_costs` are mutually exclusive alternatives. The `vehicle` and `vehicles_details` steps in the CCQ master inventory are not controlled-work pages.

| Journey position | Page ID(s) | Applicability and implementation dependency |
|---|---|---|
| 1 | `immigration_or_asylum` | Always first under the new journey requirement. Independent page once the shared radio, validation, and navigation components exist. |
| 2 | `under_18_clr` | DOB-derived age < 18. Depends on DOB being available before this route is evaluated. |
| 3 | `aggregated_means` | Under 18 and CLR = No. |
| 4 | `how_to_aggregate` | Under 18, CLR = No, aggregation = Yes. Informational; no answer value. |
| 5 | `regular_income` | Under 18, CLR = No, aggregation = No. |
| 6 | `under_eighteen_assets` | Under 18, CLR = No, aggregation = No, regular income = No. |
| 7–8 | `immigration_or_asylum_type`, `asylum_support` | Matter answer = Yes and subject to the under-18 route decision in §2. Type precedes support. |
| 9 | `applicant` | Means-tested route only. |
| 10–12 | `dependant_details`, `dependant_income`, `dependant_income_details` | `dependant_details` on means-tested, non-passported route; income gate/details depend on selected dependants and the income answer. |
| 13–17 | `employment_status`, `income`, `benefits`, `benefit_details`, `other_income` | Means-tested and not passported. Employment detail and benefit detail are conditional; `other_income` is required on this branch. |
| 18–23 | `partner_details`, `partner_employment_status`, `partner_income`, `partner_benefits`, `partner_benefit_details`, `partner_other_income` | Partner present. `partner_details` remains on passported checks; remaining partner financial questions do not. |
| 24–25 | `outgoings`, `partner_outgoings` | Means-tested and not passported; partner page additionally requires partner. Childcare fields within each page are separately conditional. |
| 26–29 | `property`, `property_landlord`, one of `housing_costs` / `mortgage_or_loan_payment` / `shared_ownership_housing_costs`, `property_entry` | Non-means-tested routes skip capital questions. Passported routes retain the property selection/equity pages but skip the housing-cost page. |
| 30–33 | `additional_property`, `additional_property_details`, `partner_additional_property`, `partner_additional_property_details` | Capital questions apply; partner pages additionally require partner. Shared ownership of additional property exits to cannot-use-service before a details page. |
| 34–35 | `assets`, `partner_assets` | Capital questions apply. Client assets always precede partner assets; partner assets additionally require partner. |

### Dependency graph

```text
immigration_or_asylum [always first]
├─ DOB < 18 → under_18_clr
│  ├─ Yes → under-18 CLR exemption route (financial pages currently skipped in CCQ)
│  └─ No → aggregated_means
│     ├─ Yes → how_to_aggregate → means-check route
│     └─ No → regular_income
│        ├─ Yes → means-check route
│        └─ No → under_eighteen_assets
│           ├─ Yes → means-check route
│           └─ No → under-18 no-means-test route
├─ matter answer = Yes → immigration_or_asylum_type → asylum_support
│  ├─ Yes → no income/capital assessment
│  └─ No → continue to the applicable means route
└─ matter answer = No → omit type and asylum-support pages

Means route:
applicant (partner? + passporting?)
├─ passporting = Yes → omit dependants, income, benefits, other income, outgoings
│                       retain property/equity, additional property, assets
└─ passporting = No → dependants → client income/benefits/other income
                       → partner section if partner → outgoings
property:
├─ outright → property_entry
├─ mortgage/loan → mortgage_or_loan_payment → property_entry
├─ shared ownership → property_landlord
│  ├─ No → cannot-use-service
│  └─ Yes → shared_ownership_housing_costs → property_entry
└─ No → housing_costs
additional property:
├─ No → omit details
└─ owned outright / with mortgage → details
   └─ shared ownership → cannot-use-service
assets → partner_assets if partner
```

`asylum_support = Yes` suppresses the applicant, dependant, income, outgoings, property, additional-property, and asset pages in current CCQ. The under-18 screening gate can also suppress the means branch. The first matter question is nevertheless required at position 1 by the new requirement; exact interaction with the under-18 no-means-test route must be settled as listed in §10 before implementing the branch.

## 2. Route and applicability rules

Derive `isUnder18` from the client’s actual date of birth; do not add CCQ’s age-band question. Do not retain client age in the draft as a substitute for DOB. The target loads client DOB in `LoadCaseDetails`, stores it in Forge `Data` under `CLIENT_DATE_OF_BIRTH_DATA_KEY`, and derives the current age answers in `ApplyClientAgeFromDob`. Reuse this source and derivation; add no duplicate DOB input or age store.

Express branch conditions with the existing Forge `Answer`, `Data`, `Condition`, `and`/`or`/`not`, and ordered `redirect` patterns. Reuse shared predicates only when multiple pages/check-answer blocks need the same condition; do not add a separate route engine:

1. `matter = Yes` makes the matter-type page eligible; `matter = No` makes both matter-type and asylum-support pages inapplicable.
2. `isUnder18` makes `under_18_clr` eligible. CLR Yes bypasses aggregation, regular-income and asset-threshold questions. CLR No makes `aggregated_means` eligible.
3. With CLR No, aggregation Yes makes `how_to_aggregate` eligible and starts a means assessment. Aggregation No makes `regular_income` eligible. Regular income Yes starts a means assessment; No makes `under_eighteen_assets` eligible. Assets Yes starts a means assessment; No is the under-18 no-means-test route.
4. The route is non-means-tested when asylum support is Yes, or the applicable under-18 rule classifies it as exempt. Non-means-tested routes omit `applicant` and every financial/property/asset question.
5. On the means-tested route, `applicant` is required. `partner` and `passporting` are independent required Yes/No answers on that page.
6. Passporting omits dependants and all income/outgoings pages. It does **not** omit property selection/equity, additional-property questions, or assets.
7. Any selected child/adult dependant makes `dependant_income` eligible. That answer Yes makes `dependant_income_details` eligible.
8. Employment status `in_work` makes the associated income details page eligible. Benefit answer Yes makes benefit details eligible.
9. A partner answer Yes makes `partner_details` eligible. If not passported, it also makes partner employment, benefits, other income, and partner outgoings pages eligible. Partner employment status `in_work` makes `partner_income` eligible; partner benefits Yes makes partner benefit details eligible.
10. Main-home ownership selects at most one housing-cost page. A shared-ownership landlord answer No is an exit condition. An owned home gets `property_entry` after the selected housing-cost page, if any.
11. Additional-property details are eligible only for a positive ownership choice other than `shared_ownership`; partner details use the same rule and require partner.
12. `assets` is required on any means-tested route, including passported. `partner_assets` requires partner.
13. Controlled work has no vehicle questions.

Every branch and snapshot validation must distinguish **not answered** from `"no"`. A missing value is not false and cannot be used to calculate route eligibility. For a route to be complete, every gate on the selected branch must have a valid explicit answer.

## 3. Session state and answer types

Use the case-scoped answer-draft mechanism already present in the target application (`FinancialEligibilitySession.financialEligibilityDrafts`) rather than creating a parallel global answer store. Repeating property rows must remain case-scoped using `casePatternDrafts` / `getOrMigrateCasePatternDrafts`; use the established pattern approach if additional repeating page types require it. The draft is intentionally generic (`Record<string, unknown>`); extend the existing `EligibilityAnswers`, `isEligibilityAnswerCode`, and snapshot validation/filtering rather than adding a second competing draft model. Validate unknown session values at the answer/snapshot boundary.

Recommended logical model (domain names below group the answers; implementation must use the exact Forge answer codes in the existing snapshot, in kebab-case where appropriate):

```ts
type YesNo = 'yes' | 'no'
type MoneyAnswer = string | number
type CountAnswer = string | number
type EmploymentStatus = 'in_work' | 'unemployed'
type EmploymentIncomeType = 'employment' | 'statutory_pay' | 'self_employment'
type IncomeFrequency =
  | 'every_week'
  | 'every_two_weeks'
  | 'every_four_weeks'
  | 'monthly'
  | 'three_months'
type RegularFrequency =
  | 'every_week'
  | 'every_two_weeks'
  | 'every_four_weeks'
  | 'monthly'
type HousingFrequency = RegularFrequency | 'total'
type MatterType = 'immigration_clr' | 'immigration_legal_help' | 'asylum'
type PropertyOwnership = 'outright' | 'with_mortgage' | 'shared_ownership' | 'none'

interface ConditionalMoney {
  relevant?: YesNo
  conditional_value?: MoneyAnswer
  frequency?: RegularFrequency
}
interface OtherIncomeAnswers {
  friends_or_family: ConditionalMoney
  maintenance: ConditionalMoney
  property_or_lodger: ConditionalMoney
  pension: ConditionalMoney
  student_finance: Pick<ConditionalMoney, 'relevant' | 'conditional_value'>
  other: Pick<ConditionalMoney, 'relevant' | 'conditional_value'>
}
interface OutgoingsAnswers {
  childcare_payments: ConditionalMoney
  maintenance_payments: ConditionalMoney
  legal_aid_payments: ConditionalMoney
}
interface HousingBenefitAnswers {
  housing_benefit_relevant?: YesNo
  housing_benefit_value?: MoneyAnswer
  housing_benefit_frequency?: RegularFrequency
}
type HousingCostAnswers =
  | (HousingBenefitAnswers & { housing_payments?: MoneyAnswer; housing_payments_frequency?: HousingFrequency })
  | (HousingBenefitAnswers & { housing_loan_payments?: MoneyAnswer; housing_payments_loan_frequency?: RegularFrequency })
  | (HousingBenefitAnswers & { rent?: MoneyAnswer; shared_ownership_mortgage?: MoneyAnswer; combined_frequency?: HousingFrequency })

interface IncomeItem {
  income_type: EmploymentIncomeType
  income_frequency: IncomeFrequency
  gross_income: MoneyAnswer
  income_tax: MoneyAnswer
  national_insurance: MoneyAnswer
}
interface BenefitItem {
  benefit_name: string
  benefit_amount: MoneyAnswer
  benefit_frequency: RegularFrequency
}
interface PropertyItem {
  house_value: MoneyAnswer
  has_mortgage?: YesNo
  mortgage?: MoneyAnswer
  percentage_owned: CountAnswer
  house_in_dispute?: YesNo
}
interface ControlledWorkAnswers {
  immigration_or_asylum?: YesNo
  immigration_or_asylum_type?: MatterType
  asylum_support?: YesNo
  controlled_legal_representation?: YesNo
  aggregated_means?: YesNo
  regular_income?: YesNo
  under_eighteen_assets?: YesNo
  partner?: YesNo
  passporting?: YesNo
  child_dependants?: YesNo
  child_dependants_count?: CountAnswer
  adult_dependants?: YesNo
  adult_dependants_count?: CountAnswer
  dependants_get_income?: YesNo
  dependant_incomes?: Array<{ amount: MoneyAnswer; frequency: RegularFrequency }>
  employment_status?: EmploymentStatus
  incomes?: IncomeItem[]
  receives_benefits?: YesNo
  benefits?: BenefitItem[]
  other_income?: OtherIncomeAnswers
  partner_over_60?: YesNo
  partner_employment_status?: EmploymentStatus
  partner_incomes?: IncomeItem[]
  partner_receives_benefits?: YesNo
  partner_benefits?: BenefitItem[]
  partner_other_income?: OtherIncomeAnswers
  outgoings?: OutgoingsAnswers
  partner_outgoings?: OutgoingsAnswers
  property_owned?: PropertyOwnership
  property_landlord?: YesNo
  housing_costs?: HousingCostAnswers
  house_value?: MoneyAnswer
  mortgage?: MoneyAnswer
  percentage_owned?: CountAnswer
  house_in_dispute?: YesNo
  additional_property_owned?: PropertyOwnership
  additional_properties?: Array<PropertyItem & { inline_owned_with_mortgage?: YesNo }>
  partner_additional_property_owned?: PropertyOwnership
  partner_additional_properties?: Array<PropertyItem & { inline_owned_with_mortgage?: YesNo }>
  bank_accounts?: Array<{ amount: MoneyAnswer; account_in_dispute?: YesNo }>
  investments_relevant?: YesNo
  investments?: MoneyAnswer
  valuables_relevant?: YesNo
  valuables?: MoneyAnswer
  investments_in_dispute?: YesNo
  valuables_in_dispute?: YesNo
  partner_bank_accounts?: Array<{ amount: MoneyAnswer }>
  partner_investments_relevant?: YesNo
  partner_investments?: MoneyAnswer
  partner_valuables_relevant?: YesNo
  partner_valuables?: MoneyAnswer
}
```

`OtherIncomeAnswers` and `OutgoingsAnswers` above describe logical page groups. CCQ persists each member as flat keys: `<category>_relevant`, `<category>_conditional_value`, and, for regular categories, `<category>_frequency`; outgoings also declare `<category>_value`. The partner concern prefixes each key with `partner_`. The actual category keys are `friends_or_family`, `maintenance`, `property_or_lodger`, `pension`, `student_finance`, `other` for other income and `childcare_payments`, `maintenance_payments`, `legal_aid_payments` for outgoings. Income collections use `incomes` and `partner_incomes`; benefit collections use `benefits` and `partner_benefits`; client and partner bank-account collections use `bank_accounts` and `partner_bank_accounts`; additional property collections use `additional_properties` and `partner_additional_properties`.

Housing session keys are `housing_payments`, `housing_payments_frequency`, `housing_loan_payments`, `housing_payments_loan_frequency`, `rent`, `shared_ownership_mortgage`, `combined_frequency`, and shared `housing_benefit_relevant`, `housing_benefit_value`, `housing_benefit_frequency`. Main-home fields are `property_owned`, `property_landlord`, `house_value`, `mortgage`, `percentage_owned`, and `house_in_dispute`. Each additional-property item has `house_value`, optional `inline_owned_with_mortgage`, optional `mortgage`, `percentage_owned`, and optional `house_in_dispute`. Client asset fields are `investments_relevant`, `investments`, `valuables_relevant`, `valuables`, `investments_in_dispute`, `valuables_in_dispute`; each bank row has `amount` and, where SMOD applies, `account_in_dispute`. Partner session keys use the `partner_` prefix and partner assets omit dispute fields.

This interface is a contract sketch, not a request to add a parallel implementation model. Preserve the target’s exact Forge answer codes and collection convention when implementing. Forge text/money values may be stored as strings or numbers, as reflected by the existing snapshot's `MoneyAnswer`; validate and parse them before arithmetic or CFE mapping. Each optional member means “not yet answered or not applicable”; it does not permit silently defaulting a required field. Repeatable answer collections are arrays and must not be encoded as comma-separated strings.

The session should contain answer drafts, not a second authoritative set of route flags. Route state is recomputed from DOB and currently valid answers on every request. Answers are saved to the case-scoped draft after each valid page submission; a Change edit is not held in a separate pending copy. Use the existing case-scoped draft and pattern-draft semantics described in `packages/cfe-eligibility-journey/src/context.type.ts`, `casePatternDrafts.ts`, `journey.ts`, and `src/services/financialEligibilityWithDeps.ts`. Existing answer snapshots use `yes`/`no` strings and preserve the client DOB separately as `clientDateOfBirth`.

## 4. Shared navigation, validation, and session behaviour

### Navigation and answer persistence

- Every page uses the shared Forge/GOV.UK page shell, error summary, field-level error rendering, and primary action. Reuse registered components, `commonBlocks.ts`, existing `Condition` helpers and step patterns; do not add a per-question controller, router, general section engine, second draft store, or duplicate validator layer.
- Declare page requiredness with field-level `validWhen` validation. Use `visibleWhen` to hide conditional fields; pair with `dependentWhen` when a hidden value must also be cleared and excluded from validation. Use step `onSubmission` with `submit({ validate: true, onValid: { effects, next } })` to save valid answers and redirect according to the newly selected branch.
- On a valid Continue, `SaveNewAnswerIfAnswered` persists allow-listed posted values to the case-scoped draft and Forge answers. Route using the submitted answer and the current `Data`/`Answer` conditions; do not compute the next page from pre-submit answers.
- On validation failure, remain on the same page, preserve entered values, render the CCQ-equivalent field errors and error summary, and do not advance or discard other answer drafts.
- Back navigation and direct revisits must load the current draft values. A page is reachable only if it is in the applicable route (or is reached through the controlled change-answer loop); an inapplicable route must not be made valid merely by a stale session value.
- The confirmation page is reachable only after all applicable pages have valid answers. Retain the existing `ValidateDraftAnswers` check on review access and `PrepareSubmission` check on review submit; both use the same required-answer/snapshot rules.
- Persist draft state across page requests and refreshes. Scope all draft and repeating-row state by case ID, matching the target’s current case-keyed session convention.

### Recompute, invalidate, and preserve answers when a gate changes

Implement one reconciliation operation, invoked after a gate answer changes and before routing, check answers, or payload construction:

1. Merge the new valid answer into the existing draft.
2. Recompute the applicable ordered page IDs from the current DOB and merged answers.
3. Compare the old and new applicable page sets.
4. Preserve answers for pages still applicable, including answers on later pages that remain on the route.
5. Delete answers and repeatable collections belonging solely to pages that have become inapplicable. Also delete conditional subfields no longer applicable within an otherwise applicable page (for example employment details after status changes to unemployed, a benefit collection after benefits becomes No, or a conditional amount/frequency after its relevance answer becomes No).
6. Keep values for newly applicable pages unset. Route the user to the earliest newly required unanswered/invalid page before returning to check answers.
7. Revalidate downstream answers against the current gates and cross-field constraints. Do not treat presence of a stale value as completion.

Do not delete unrelated answers when editing a gate. For example, changing `partner` from Yes to No must clear only partner-specific answers/collections and preserve client income, assets, and shared household values that remain applicable. Changing passporting from Yes to No reveals new income/expense questions and leaves them unanswered until collected; changing it to Yes prunes those values. Changing main-home ownership must clear only the old housing branch, its conditional Housing Benefit fields, and any newly inapplicable equity fields. Changing `immigration_or_asylum` to No prunes matter type/support values and changes the proceeding payload.

Use Forge `dependentWhen` clearing for conditional fields and extend the target’s existing `answerSnapshot.ts` active-code filtering for branch-level data. Because drafts are saved after each valid page submission, explicitly delete answers and repeating data that become inapplicable when a controlling answer changes; preserve other saved answers. Snapshot preparation remains a final defense: only active, validated answers are included. Do not rely on `visibleWhen` alone, because it only hides a block.

### Shared validation rules

- Validate type/range at the field boundary and route-level requiredness from the same route definition.
- Yes/No radio controls use the existing Forge answer values `"yes"` and `"no"` and are validated as an explicit two-value set. Do not use booleans or truthiness to interpret these answer strings. Other radio/select values must match the exact allowed set.
- Required positive money fields reject blank, non-numeric and `<= 0`; where CCQ explicitly allows zero (bank account, housing payment, mortgage balance) accept zero and reject negatives. Client/partner asset amounts and repeating records use their per-field constraints in §7.
- Employment gross must be greater than zero; income tax and National Insurance may be zero but not negative at the form boundary; gross must exceed their sum.
- Integer counts and ownership percentages must be whole numbers, with count > 0 and ownership 1–100 inclusive.
- Validate all repeating rows independently and report row-specific errors; do not silently drop malformed rows.
- Match CCQ’s exact English field labels, choice labels, help content, and validation copy from `config/locales/en.yml` and the page/form/view source listed for each page. Error text quoted below is the CCQ message; for repeated fields use its numbered/position-specific variant.
- Follow `02-forge-analysis.md`: make this a sequence in the existing `cfe-eligibility` journey, with `immigration_or_asylum` as the first controlled-work step. The default DOB-derived age redirect must not bypass that first page.

## 5. Change-answer and check-answers behaviour

### Change answers

Use the target’s existing draft / change / discard architecture, including `financialEligibilityDrafts`, `casePatternDrafts`, `SaveDiscardReturnPath`, `RestoreCaseDraft`, `SaveNewAnswerIfAnswered`, and the pattern-draft helper. The journey restores drafts on access. Check-answer Change links are direct links to step paths.

- A Change link returns to the relevant page with its saved answer prepopulated from Forge’s restored case draft.
- This is not a pending-copy change-answer workflow. A valid edit is saved immediately to the session draft; the step's normal conditional redirects determine what follows. The snapshot is invalidated when an answer changes and filters inactive answers when next prepared.
- If an edit introduces a required question, route through that question before review can be prepared. If an edit removes pages, prune those answers/collections as described above.
- If a changed answer causes a cannot-use-service result, do not allow review preparation or CFE submission.
- Preserve the existing discard return-path behavior. Do not promise that saving a Change answer returns directly to check answers; CCQ has a return-to-review loop, but Forge currently does not. Confirm this UX decision in §10 and implement an explicit, tested return path only if required.

### Check answers

Create a controlled-work check-answers page with one summary row per applicable question/collection and Change links to the owning page. Show only the current route’s applicable answers; never render irrelevant stale rows. Group content consistently with CCQ’s sections:

1. Case details / matter and under-18 route.
2. Client and dependant details.
3. Client income and benefits.
4. Partner details and income.
5. Outgoings.
6. Housing and property.
7. Client assets and partner assets.

Render repeated income, benefit, dependant-income, bank-account, and property records as individual readable rows. Render explicit No answers as No; do not omit a meaningful false answer. For zero-allowed inputs display `£0.00` (or the established currency formatter), rather than “not answered.” A field that is not applicable is absent from the summary, not displayed as No or zero.

On check-answers access and submit, reuse `ValidateDraftAnswers` and `PrepareSubmission` (or extend their shared validator) to verify route completeness. If incomplete, redirect to the earliest applicable missing/invalid page with the draft preserved. Submit is enabled only for a complete, internally consistent assessment. `PrepareSubmission` creates the case-scoped typed answer snapshot and routes to the existing `submission-ready` page. That page explicitly states that no calculation has run and no assessment has been saved. Do not describe this as CFE submission or clear the draft as if a live assessment succeeded; any future CFE submission must be wired and tested at its agreed boundary.

Target references: `packages/cfe-eligibility-journey/src/checkAnswersPage/checkAnswersStep.ts`, `checkAnswersBlock.ts`, `journey.ts`, `answerSnapshot.ts`, `draftState.ts`, `src/services/financialEligibilityWithDeps.ts`, and `submissionReadyPage/submissionReadyStep.ts`. CCQ references: `app/views/checks/_check_answers_table.html.slim`, `app/controllers/concerns/change_answers_methods.rb`, `app/controllers/change_answers_controller.rb`, `app/models/check.rb`, `app/lib/steps/helper.rb`.

## 6. Page-by-page specification

The content below is the controlled-work English content described by CCQ. “Parity test” is the minimum page acceptance test: assert exact copy/options, applicability/order, value round-trip, validation, and the CFE mapping when there is one. Cross-reference source and existing CCQ test files in every row; add target unit/Forge integration tests for the listed behaviours. Page order here is journey order, not a list of independent implementation tasks.

### Case details

| Page | CCQ content and inputs | Validation and applicability / next page | Session and CFE | Revisit and required parity test |
|---|---|---|---|---|
| `immigration_or_asylum` | “Is this an immigration or asylum matter?” Required Yes/No radio; values `true` / `false`; controlled-work guidance link; no inline hint. | Required boolean. CCQ error: “Select yes if this is an immigration or asylum matter”. Always first under the new journey. Yes → type page, subject to the unresolved under-18 rule; No → skip type/support and continue to under-18 screening or the selected means route. | `immigration_or_asylum`. Controls `proceeding_types[0]`; code `IM030` for `immigration_clr`, `IA031` for other Yes/type combinations, `SE003` for No; involvement `A`. | Reopening restores Yes/No. Test first-page ordering, Yes/No branch, exact error, and changing Yes→No removes type/support and remaps proceeding. CCQ: `app/lib/steps/non_financial_section.rb`, `logic.rb`, `app/forms/immigration_or_asylum_form.rb`, view, locale; specs `spec/forms/immigration_or_asylum_form_spec.rb`, `spec/flows/controlled_work_spec.rb`, `spec/services/cfe/proceedings_payload_service_spec.rb`. |
| `under_18_clr` | “Is the work controlled legal representation (CLR)?” Required Yes/No. Help text defines CLR for the Health, Education and Social Care Chamber/First-tier Tribunal, Mental Health Review Tribunal for Wales, or Immigration and Asylum Chamber of the First-tier Tribunal. | Required boolean; error: “Select yes if the work is controlled legal representation (CLR)”. DOB <18. Yes bypasses aggregation/regular-income/assets screening; No → `aggregated_means`. | `controlled_legal_representation`; `assessment.controlled_legal_representation`. | Restore answer on revisit; changing it recalculates the entire under-18 branch. Test DOB boundary, both choices, exact help/error, and suppression of stale later screening answers. CCQ: `non_financial_section.rb`, `logic.rb`, form/view/locale; `spec/forms/controlled_legal_representation_form_spec.rb`, `spec/flows/under_eighteen_flow_spec.rb`. |
| `aggregated_means` | “Will you aggregate your client's means with another person's means?” Required Yes/No. Help explains maintaining adult, full means test, examples, and exceptions (conflict, financial independence, local-authority/foster care). | Required boolean; error: “Select yes if you will aggregate your client’s means with another person’s means”. Under 18 + CLR No. Yes → informational `how_to_aggregate`, then means route; No → `regular_income`. | `aggregated_means`; individual answer routes; derive `assessment.not_aggregated_no_income_low_capital` from aggregation, regular income and asset screen. | Restore choice. Change Yes↔No reconciles info page and downstream branch. Test exact supporting text, gate, branch, derived CFE flag including false, and no submission with a missing answer. CCQ: `non_financial_section.rb`, `logic.rb`, form/view/locale, `app/services/cfe/assessment_payload_service.rb`; `spec/forms/aggregated_means_form_spec.rb`, `spec/flows/under_eighteen_flow_spec.rb`. |
| `how_to_aggregate` | Heading: “You are going to aggregate your client's means with another person's means”. Informational panel explains full means test; combine client/maintaining adult income and spending; include maintaining adult’s partner only if permitted under regulation 16; maintaining-adult definition and examples. Continue action, no input. | No validation. Under 18, CLR No, aggregation Yes. Continue → `applicant`/means route. | No answer; previous `aggregated_means` controls applicability. Subsequent ordinary answers represent combined means as instructed. | Revisit shows same static content; no stale answer is created. Test no answer required, exact content/links and Continue route. CCQ: `non_financial_section.rb`, view/locale; `spec/flows/under_eighteen_flow_spec.rb`. |
| `regular_income` | “Does your client get regular income?” Required Yes/No. Examples: full-time job or local-authority support for care leaver; excludes <16-hours part-time earnings, holiday jobs, pocket money and maintenance paid for child. | Required boolean; error: “Select yes if your client gets regular income”. Under 18, CLR No, aggregation No. Yes → means route; No → `under_eighteen_assets`. | `regular_income`; routing only. | Restore answer; changing Yes/No removes or adds asset threshold question. Test copy, excluded examples, error, branch and stale-value pruning. CCQ: `non_financial_section.rb`, `logic.rb`, form/view/locale; `spec/forms/regular_income_form_spec.rb`, `spec/flows/under_eighteen_flow_spec.rb`. |
| `under_eighteen_assets` | “Does your client have assets worth £2,500 or more?” Required Yes/No. Examples: bank money, investments, valuables, property/land; Yes requires full means test. | Required boolean; error: “Select yes if your client has assets worth £2,500 or more”. Under 18, CLR No, aggregation No, regular income No. Yes → means route; No → under-18 non-means-tested route. | `under_eighteen_assets`; contributes to derived under-18 CFE assessment flag. | Restore choice; when changed, recompute means route and all financial pages. Test threshold wording and branch/derived flag. CCQ: `non_financial_section.rb`, `logic.rb`, form/view/locale; `spec/forms/under_eighteen_assets_form_spec.rb`, `spec/flows/under_eighteen_flow_spec.rb`. |
| `immigration_or_asylum_type` | “What type of immigration or asylum matter is this?” Required single-choice radio: `immigration_clr` (“Immigration - controlled legal representation (CLR) in the First-tier Tribunal”); `immigration_legal_help` (“Immigration - legal help or help at court”); `asylum` (“Asylum - legal help, help at court, or controlled legal representation (CLR) in the First-tier Tribunal”). Hint cites LASPO Schedule 1 paragraphs 24–30, 32(1), 32A(1) with legislation link. | Required enum; error: “Select what type of immigration or asylum matter this is”. Matter Yes. In current CCQ, suppressed for an under-18 exempt result. Yes → `asylum_support`. | `immigration_or_asylum_type`; CFE proceeding mapping in §8. | Revisit selected value; matter Yes→No prunes it. Test all three values, hint/link, required error, next page, code mapping and the unresolved exempt-child behavior. CCQ: `non_financial_section.rb`, handler, form/view/locale; `spec/forms/immigration_or_asylum_type_form_spec.rb`, `spec/flows/controlled_work_spec.rb`, `spec/services/cfe/proceedings_payload_service_spec.rb`. |
| `asylum_support` | “Does your client get Asylum Support?” Required Yes/No; labels “Yes” / “No, continue with the means check”. Defines Section 4/95 support; says no income/capital assessment if received and select Yes if named on partner’s claim. Expandable evidence guidance says consider No rather than waiting if evidence unavailable. | Required boolean; error: “Select if your client receives section 4 or section 95 Asylum Support”. In CCQ, follows any matter Yes regardless of matter type, if matter group applies. Yes → non-means-tested result; No → means route. | `asylum_support`; `applicant.receives_asylum_support`. | Restore answer. Yes→No exposes the full applicable financial route; remove irrelevant financial data if switching to Yes. Test both outcomes and exact evidence guidance. CCQ: section/logic, form/view/locale; `spec/forms/asylum_support_form_spec.rb`, `spec/services/cfe/applicant_payload_service_spec.rb`, `spec/flows/controlled_work_spec.rb`. |

### Client, dependants, and client income

| Page | CCQ content and inputs | Validation and applicability / next page | Session and CFE | Revisit and required parity test |
|---|---|---|---|---|
| `applicant` | “Tell us about your client”. Required Yes/No “Does your client have a partner?” and “Does your client receive a passporting benefit?” Help defines spouse/civil partner/cohabiting-as-married partner, exclusions (permanently separated, opponent, contrary interest), passporting benefits (UC, Income Support, income-based JSA, income-related ESA, Guarantee Credit), and named partner claim. | Both booleans required. Errors: “Select yes if the client has a partner”; “Select yes if your client receives a passporting benefit or if they are named on their partner's passporting benefit”. Means-tested only. Partner Yes → partner section; passporting No → dependants/income/outgoings; both choices still continue to property/assets. | `partner`, `passporting`; `applicant.receives_qualifying_benefit`; partner gate. | Revisit both answers. Toggle partner/passporting and prune only newly inapplicable data. Test partner definition, benefit list, independent required validation, routing, and false mapping. CCQ: non-financial section/logic, handler, form/view/locale; `spec/forms/applicant_form_spec.rb`, `spec/flows/change_answers_flow_spec.rb`. |
| `dependant_details` | “Tell us about your client's dependants”; partner-aware heading and child/adult question wording when partner exists. Required Yes/No for child and adult dependants; each Yes reveals required count. Help defines child/adult dependant and exclusions; warn not to include a dependant with the displayed monthly-limit amount or more. | Yes/No required; child/adult-specific required, numeric, whole, >0 count errors. Counts only required on Yes. Means-tested, not passported. Any Yes → `dependant_income`. | `child_dependants`, `adult_dependants`, their counts; CFE `dependants[]` generated records. | Restore values; No removes its count; toggling partner changes wording, not dependant answers. Test partner copy, both counts, exact boundary/exclusion text, all count errors, generated number and CFE mapping. CCQ: section/logic, form/view/locale, `app/services/cfe/dependants_payload_service.rb`, builder; `spec/forms/dependant_details_form_spec.rb`, `spec/services/cfe/dependants_payload_service_spec.rb`. |
| `dependant_income` | “Do any of the dependants aged 16 or over get regular income?” Required Yes/No. Examples: 16+ education/training grant, apprentice wage, adult benefit, part-time work >16 hours/week. | Required boolean; error: “Select yes if any dependants aged 16 or over get income”. At least one dependant selected. Yes → `dependant_income_details`; No → employment status. | `dependants_get_income`; gate only. No individual amount sent when No. | Restore choice; No prunes details. Test exact help/examples, required error, both branches and no payload income on No. CCQ: section/logic/form/view/locale; `spec/forms/dependant_income_form_spec.rb`. |
| `dependant_income_details` | “Add income for dependants aged 16 or over”; hint says income is deducted from client’s dependant allowance. Repeatable amount plus frequency (“When does the dependant normally get this income?”); Every week, Every 2 weeks, Every 4 weeks, Every month, Total in last 3 months; “Add another dependant's income”. | Every amount required, numeric, >0; frequency required/allowed. Exact messages include “Enter income the dependant gets”, “Income for the dependant must be more than 0”, “Income for the dependant must be a number”, “Select when the dependant normally gets this income”. Reject monthly equivalent at/above the dependant limit and direct user to remove that dependant. Depends on gate Yes. | `dependant_incomes[]`; each applicable CFE dependant may have `{frequency, amount}`. | Restore each row; add/remove row preserves other rows. Test all frequency choices, row errors, monthly limit rejection, count-to-income pairing, and CFE output. CCQ: section/handler, form/model/view/locale; `spec/forms/dependant_income_details_form_spec.rb`, `spec/services/cfe/dependants_payload_service_spec.rb`. |
| `employment_status` | “What is your client's employment status?” Required radio: `in_work` (“Employed or self-employed”), `unemployed` (“Unemployed”). Hints include cash pay, sole trader/company director/partnership, SSP/SMP; unemployed includes retired clients. | Required enum; error: “Select an employment status”. Not non-means-tested or passported. `in_work` → `income`; unemployed → benefits. | `employment_status`; routes income details. | Restore choice; unemployed prunes `incomes`; in_work adds required detail page. Test values, help, required validation and branch. CCQ: income section/logic, form/view/shared status partial/locale; `spec/forms/employment_status_form_spec.rb`, `spec/flows/controlled_work_spec.rb`. |
| `income` | “Your client's employment income”; payslip hint. Repeatable employment type (`employment`, `statutory_pay`, `self_employment`), frequency (week, two weeks, four weeks, month, last 3 months), gross, tax, National Insurance. Add another employment income. Includes controlled guidance for frequency, director/partnership salary, self-employment drawings/dividends/benefits in kind, cash drawings, police/prison/overseas/HM Forces. | Each row: type/frequency required; gross required numeric >0; tax and NI required numeric >=0; gross must exceed tax+NI. Preserve exact CCQ messages, including “Select the employment income type”, “Select when your client normally gets this income”, “Enter the income before any deductions”, “Income before any deductions must be more than 0”, “Income before any deductions must be a number”, and “Income before any deductions must be more than income tax and National Insurance combined”; corresponding tax/NI errors. | `incomes[]`; CFE `employment_details[]` and `self_employment_details[]`; frequency translation; tax and NI become negative. | Restore/repeat rows; when employment changes to unemployed, remove all income rows. Test all employment types/frequencies, net-positive and field-boundary errors, repeated-row errors, and both CFE arrays. CCQ: income section/handler, `IncomeForm`, `IncomeModel`, income view/partial/locale, CFE employment and self-employment builders; `spec/forms/income_form_spec.rb`, `spec/services/cfe/employment_income_payload_service_spec.rb`. |
| `benefits` | “Does your client get any non-passporting benefits?” Required Yes/No. Examples include Child Benefit, tax credits and Asylum Support payments. Excludes Housing Benefit, State Pension, PIP, Carer’s Allowance, Community Care direct payments, Fostering allowance, Cost of Living Payments. | Required boolean; error: “Select yes if your client gets any benefits”. Not non-means-tested or passported. Yes → `benefit_details`; No → `other_income`. | `receives_benefits`; gate. | Restore choice; No prunes `benefits[]`. Test benefit inclusions/exclusions, error, both branches, and not confusing this with passporting benefits. CCQ: income section/form/view/partial/locale; `spec/forms/benefits_form_spec.rb`. |
| `benefit_details` | “Add benefit details”. Repeatable type-ahead/datalist benefit name, amount, frequency (week, two weeks, four weeks, month), “Add another benefit”; same excluded-benefit guidance. | Name required (“Enter the benefit name”); amount required numeric >0 (“Enter benefit amount”, “Benefit amount must be more than 0”, “Benefit amount must be a number”); frequency required/allowed (“Select when your client normally gets this benefit”). | `benefits[]`; CFE `regular_transactions[]`, credit, category `benefits`, amount/frequency. Name is not included in the CFE transaction. | Restore row names/amount/frequency; No gate prunes collection. Test repeated entries, type-ahead and exact errors, benefit credit mapping, name omitted from CFE. CCQ: income section/handler, form/model/views/locale, regular transaction builder; `spec/forms/benefit_details_form_spec.rb`. |
| `other_income` | “Your client's other income”. Six required Yes/No questions: financial help from friends/family; maintenance from former partner; property/lodger; pensions; student finance; other sources. Hints cover examples, pensions total, student grants/loans excluding tuition-fee loans, other sources/disregarded payments. Yes reveals conditional values. | Every Yes/No required. Friends/family, maintenance, property/lodger, pension: amount >0 and frequency required (week, two weeks, four weeks, month). Student finance: annual amount, no frequency. Other: last-month amount, no frequency. Conditional amounts required, numeric, >0; preserve category-specific “Enter amount…”/numeric/>0/frequency messages. | `*_relevant`, `*_conditional_value`, `*_frequency`; regular items → CFE regular-transaction credits; student finance → `student_loan` annual irregular income; other → `unspecified_source`, monthly controlled irregular income. | Restore individual answers; each No prunes only its own conditional fields; passporting removes the whole page data. Test all six controls, conditional visibility/validation, frequencies, and regular/irregular mapping. CCQ: income section/handler, form/view/partial/locale and CFE irregular/regular builders; `spec/forms/other_income_form_spec.rb`, `spec/services/cfe/irregular_income_payload_service_spec.rb`. |

### Partner and outgoings

| Page | CCQ content and inputs | Validation and applicability / next page | Session and CFE | Revisit and required parity test |
|---|---|---|---|---|
| `partner_details` | “Tell us about the partner”. Required Yes/No “Is the partner aged 60 or over?” Help: age 60+ may mean some capital is excluded. | Required boolean; error: “Select yes if the partner is aged 60 or over”. Partner Yes on `applicant`, not non-means-tested. Partner not passported → partner employment status; passported → property flow. | `partner_over_60`; CFE currently synthesizes `partner.date_of_birth` as 70 or 50 years before current date. Target source of actual partner DOB is unresolved. | Restore answer. Test wording/error and CFE age derivation contract; do not claim a synthetic DOB is the actual DOB. CCQ: partner section/form/view/locale, partner payload service; `spec/forms/partner_details_form_spec.rb`, `spec/flows/change_answers_flow_spec.rb`. |
| `partner_employment_status` | “What is the partner's employment status?” Required `in_work` / `unemployed`; controlled hints match client, partner-worded. | Required enum; error: “Select an employment status”. Partner present and client not passported. `in_work` → `partner_income`; unemployed → partner benefits. | `partner_employment_status`; nested CFE `partner.partner.employed`. | Restore; unemployed prunes partner income rows. Test partner copy, enum, branch and nested employed value. CCQ: partner section/logic/form/shared status view/locale, partner payload; `spec/forms/partner_employment_status_form_spec.rb`. |
| `partner_income` | “The partner's employment income”; partner payslip hint; repeatable type/frequency/gross/tax/NI fields identical to client income, with partner wording and controlled self-employment/employment guidance. | Same rules as `income`; frequency error e.g. “Select when the partner normally gets this income”. Partner present, not passported, partner status `in_work`. | Partner-prefixed income collection; nested partner CFE employment/self-employment arrays; tax/NI negative. | Restore rows; gate changes remove only partner income. Test all client-income cases plus partner-specific labels/errors and nested mapping. CCQ: partner section/form/shared form/view/CFE builders/locale; `spec/forms/partner_income_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`. |
| `partner_benefits` | “Does the partner get any benefits?” Required Yes/No. | Required boolean; error: “Select yes if the partner gets any benefits”. Partner present, not passported. Yes → `partner_benefit_details`; No → `partner_other_income`. | `partner_receives_benefits`; nested partner detail gate. | Restore; No prunes partner benefit rows. Test exact question/error, route and nested CFE exclusion/inclusion. CCQ: partner section/form/view/locale; `spec/forms/partner_benefits_form_spec.rb`. |
| `partner_benefit_details` | “Add benefit details”. Repeatable partner benefit name, amount, frequency and “Add another benefit”; exclusions match client benefits. | Same positive/name/frequency requirements as client; partner frequency error: “Select when the partner normally gets this benefit”. Gate Yes. | Partner benefit collection; CFE `partner.regular_transactions[]` credits category `benefits`. | Restore and repeat rows; test partner-specific labels/error, all allowed frequencies, and nested credits. CCQ: partner section/form/model/shared views/regular builder/locale; `spec/forms/partner_benefit_details_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`. |
| `partner_other_income` | Partner wording for the six other-income questions; caption “Do not include income already entered for your client.” Hints and conditional inputs mirror `other_income`. | Same required Yes/No and conditional amount/frequency rules as client, including monthly last-month amount for other sources; partner-specific copy. Partner present and not passported. | Partner-prefixed relevance/value/frequency fields; nested partner regular transactions and irregular income. | Restore; No per category removes only that category’s conditional fields; partner gate/passporting prunes all partner other-income. Test all six categories, partner caption and wording, and nested regular/irregular mappings. CCQ: partner section/form/shared view/CFE partner and builders/locale; `spec/forms/partner_other_income_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`. |
| `outgoings` | “Your client's outgoings and deductions”. Required Yes/No for childcare, maintenance to former partner, criminal legal-aid payments. Childcare hint examples childminder/nanny/nursery; maintenance includes child maintenance and former matrimonial-home costs. Yes reveals amount/frequency. | Yes/No required; childcare omitted unless `eligible_for_childcare_costs?`. Conditional amounts >0, numeric; frequency required, allowed week/two weeks/four weeks/month. Exact category-specific “Select yes…”, “Enter amount…”, numeric, >0 and “Select frequency…” messages. Not non-means-tested or passported. | `*_relevant`, `*_conditional_value`, `*_frequency`; CFE debits categories `child_care`, `maintenance_out`, `legal_aid`. | Restore; no clears conditional value; ineligible childcare control is absent and not validated/submitted. Test each category, childcare eligibility gate, errors and transaction mapping. CCQ: outgoings section/form/view/partial/regular builder/locale; `spec/forms/outgoings_form_spec.rb`, `spec/lib/steps/outgoings_section_spec.rb`, `spec/flows/outgoings_flow_spec.rb`. |
| `partner_outgoings` | Partner-worded versions of childcare, maintenance and criminal legal-aid questions; caption “Do not include any outgoings already entered for your client.” | Same conditional validations as client with partner-specific messages. Partner present; income questions not skipped. | Partner-prefixed conditional fields; nested CFE partner regular-transaction debits. | Restore; partner No or passporting prunes partner values; childcare gate mirrors eligibility. Test partner wording, errors, route and nested mapping. CCQ: outgoings section/form/shared view/partner payload/regular builder/locale; `spec/forms/partner_outgoings_form_spec.rb`, `spec/lib/steps/outgoings_section_spec.rb`, `spec/flows/outgoings_flow_spec.rb`. |

### Housing, property, and assets

| Page | CCQ content and inputs | Validation and applicability / next page | Session and CFE | Revisit and required parity test |
|---|---|---|---|---|
| `property` | “Does your client own the home they usually live in?” Partner version asks if client or partner owns the home client usually lives in. Options/values: Yes, owned outright (`outright`); Yes, through a shared ownership scheme (`shared_ownership`); Yes, with a mortgage or loan (`with_mortgage`); No (`none`). Partner-prison guidance included. | Required enum; error: “Select if your client owns the home they live in”. Means-tested, including passported. `none` → housing costs if not passported; `outright` → entry; mortgage → mortgage payment then entry; shared ownership → landlord gate. | `property_owned`; leads to `properties.main_home`. | Restore choice; changing ownership removes the previous housing branch and any invalid equity values. Test exact choices/partner hint, all four route outcomes, passporting, and pruned payload. CCQ: property section/logic/form/view/locale; `spec/forms/property_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`, `spec/flows/change_answers_flow_spec.rb`. |
| `property_landlord` | “Is the landlord the only other joint-owner?” Required Yes/No. | Required boolean; error: “Select yes if the landlord is the only other joint-owner”. Main home shared ownership. No → cannot-use-service, not submission; Yes → shared ownership housing costs. | `property_landlord`; routing/eligibility only, no CFE field. | Restore answer. Test No exit, no payload/submission, Yes continuation, and edit from Yes to No. CCQ: property section/helper/form/view/locale; `spec/forms/property_landlord_form_spec.rb`, property/flow specs, `spec/flows/cannot_use_service_flow_spec.rb`. |
| `housing_costs` | “Housing costs”; hint enter housing costs for home client lives in; excludes separated partner’s costs. Amount “Enter amount” (0 allowed) and frequency when >0. Required Housing Benefit Yes/No; Yes reveals amount/frequency. Guidance covers rent/mortgage/board, 50% share assumptions, former partner costs, third-party contributions/evidence. Frequencies week, two weeks, four weeks, month, last 3 months. | Payment required numeric >=0; frequency if >0. Housing Benefit Yes/No required; if Yes amount >0 and frequency; Housing Benefit cannot exceed housing costs. Exact errors include “Enter the housing payments amount. Enter 0 if this does not apply.”, numeric, frequency, Yes/No, amount, >0, frequency and “Housing Benefit cannot be higher than housing costs”. Home not owned, not passported. | `housing_payments`, frequency, Housing Benefit fields; regular transaction debit `rent_or_mortgage`, benefit credit `housing_benefit`. | Restore. Changing ownership branch prunes these keys. Test zero and positive values, total-in-3-months option, housing-benefit bound, guidance and mapping. CCQ: property section, form/base form/view/locale; `spec/models/housing_costs_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`. |
| `mortgage_or_loan_payment` | “What are the mortgage or loan payments for the home your client usually lives in?” Amount “Enter full amount due”, “Enter 0 if this does not apply”; guidance for shared liability and contributions. Frequencies week/two weeks/four weeks/month. | Amount required numeric >=0; frequency when >0. Errors: “Enter the mortgage or loan payments amount.”, “Mortgage or loan payments must be a number.”, “Mortgage or loan payments must be 0 or more.”, “Select frequency of mortgage payments.” Main home `with_mortgage`, not passported. | `housing_loan_payments`, `housing_payments_loan_frequency`; CFE debit `rent_or_mortgage`. | Restore. Changing ownership removes this branch. Test allowed frequency set (no total-last-3-months), 0/positive handling, errors and CFE category. CCQ: property section/form/view/locale; `spec/forms/mortgage_or_loan_payment_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`. |
| `shared_ownership_housing_costs` | Heading “Housing costs”; shared-ownership home hint; partner living separately guidance. Rent and mortgage values (each can be zero), combined frequency, required Housing Benefit Yes/No and conditional amount/frequency. Shared-cost guidance explains aligning frequencies, liability and contributions. | Rent/mortgage required numeric >=0; combined frequency when total >0; Housing Benefit Yes/No required, amount >0/frequency if Yes, cannot exceed combined costs. Frequencies include week, two weeks, four weeks, month, total last 3 months. Main home shared ownership and landlord answer Yes; not passported. | Rent, shared mortgage, combined frequency and Housing Benefit keys; CFE rent/mortgage debit plus Housing Benefit credit. | Restore. Edit loop returns to property entry after completing shared ownership costs; switching property branch prunes all shared values. Test combined cost, frequencies, 0 boundaries, benefit limit, required fields and route. CCQ: property section/form/base form/view/locale; `spec/models/shared_ownership_housing_costs_form_spec.rb`, property specs, `spec/flows/change_answers_flow_spec.rb`. |
| `property_entry` | “The home your client usually lives in”. Deed/lease/freehold/mortgage ownership hint, client/partner-aware. Inputs home value; mortgage left when mortgage/shared ownership; percentage owned; subject-matter-of-dispute checkbox when applicable. Valuation evidence/mortgage guidance; partner version uses combined ownership share. | Home value required numeric >0. Mortgage required numeric >0 if applicable. Percentage required whole 1–100. Dispute boolean required only when rendered. After owned property and any selected housing/landlord page; remains on passported route. | `house_value`, `mortgage`, `percentage_owned`, `house_in_dispute`; CFE `properties.main_home` with value, outstanding mortgage, percentage, dispute, shared-association flag. | Restore each field. Ownership changes remove now-inapplicable mortgage/dispute values. Test all fields, conditional mortgage, SMOD gate, partner text, and exact nested property mapping. CCQ: property section/form/view/locale, `cfe/assets_payload_service.rb`; `spec/forms/property_entry_form_spec.rb`, property specs. |
| `additional_property` | “Does your client own any other property, a holiday home or land?” Hint includes sole property abroad/non-income property and shared client/partner property. Same four ownership choices as main property. | Required enum; error: “Select if your client owns any other property”. Capital questions apply, including passported. No → partner additional property/assets; outright or mortgage → details; shared ownership → cannot-use-service. | `additional_property_owned`; gates `properties.additional_properties[]`. | Restore. No prunes detail array; shared ownership exits and does not send details. Test options, hint, all branches, exit and payload. CCQ: property section/form/view/locale; `spec/forms/additional_property_form_spec.rb`, property and cannot-use-service specs. |
| `additional_property_details` | “Client’s other property, holiday home or land”; hint says include property shared with partner. Repeatable value; where mortgage not predetermined, Yes/No outstanding-mortgage control and conditional amount; client ownership percentage; “Add another property, holiday home or land”. Dispute checkbox only if applicable. | Value required numeric >0. Conditional mortgage choice required; mortgage amount required numeric >0 if Yes. Percentage whole 1–100. Applicable dispute boolean. Only owned outright/with mortgage; shared ownership exits before this page. | `additional_properties[]`; CFE property records: value, mortgage or zero, percentage, dispute, `shared_with_housing_assoc: false`. | Restore each row; add/remove preserves others; gate No clears entire collection. Test repeated records, mortgage condition, percentage, SMOD, errors and mapping. CCQ: property section/form/model/view/partial/locale, assets payload; `spec/forms/additional_property_details_form_spec.rb`, `spec/services/cfe/assets_payload_service_spec.rb`. |
| `partner_additional_property` | “Does the partner own any other property, a holiday home or land?” Hint includes property abroad/non-income and says not to include client-entered property. Same four ownership choices. | Required enum; error: “Select if the partner owns any other property”. Partner present and capital questions apply. No → assets; outright/mortgage → details; shared ownership → cannot-use-service. | `partner_additional_property_owned`; gates `partner.additional_properties`. | Restore. Partner No/pruning must clear only partner property details. Test options/hint, partner gate, all routes, shared ownership exit and nested mapping. CCQ: property section/form/view/locale; `spec/forms/partner_additional_property_form_spec.rb`, property, cannot-use-service specs. |
| `partner_additional_property_details` | “The partner's other property, holiday home or land”; “Do not include any property or land already entered for your client.” Repeatable value, conditional outstanding mortgage and amount, partner percentage. | Value/mortgage applicable numeric >0; mortgage Yes/No required when shown; percentage whole 1–100. Partner-specific copy including “Enter the percentage share the partner owns”. Shared ownership exits before this page. | Partner additional-property array; nested `partner.additional_properties` with value, mortgage or zero, percentage, `shared_with_housing_assoc: false`. | Restore repeated records; partner gate change prunes these only. Test every validation, partner-specific messages, repetition and nested mapping. CCQ: property section/form/models/shared partial/partner payload/locale; `spec/forms/partner_additional_property_details_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`. |
| `assets` | Heading “Client assets”. At least one bank-account amount, hint “Enter 0 if this does not apply”, examples/exclusions, repeat “Add another bank account”. Required investments Yes/No and amount on Yes. Required valuables worth £500 or more Yes/No and amount on Yes; controlled include/exclude lists and highest-valuation/evidence hint. Client SMOD checkboxes when applicable; false for immigration/asylum. | Bank amounts required numeric >=0; Yes/No relevance gates required. Investment amount >0 if Yes. Valuables amount >=£500 if Yes. Exact errors include “Enter total money in bank account. Enter 0 if this does not apply.”, numeric equivalent, “Select yes if client has any investments”, “Select yes if client has any valuables worth more than £500”, plus field amount errors. Non-means-tested skips; passported retains. | `bank_accounts[]`, relevance flags, amounts and dispute flags; CFE `capitals.bank_accounts`, `capitals.non_liquid_capital`. | Restore rows/answers. A No gate removes its conditional amount; non-means-tested prunes all capital data. Test zero bank balance, £500 boundary, repeat rows, SMOD visibility, evidence hint and CFE capital records. CCQ: assets section/logic/client and assets forms/bank model/views/locale, capitals builder/assets payload; `spec/forms/assets_form_spec.rb`, `spec/services/cfe/assets_payload_service_spec.rb`, `spec/views/check_answers_page/client_content/assets_spec.rb`. |
| `partner_assets` | Heading “Partner assets”; “Do not include any assets already entered for your client.” Repeatable bank amounts excluding joint accounts already entered; investments Yes/No and amount; valuables Yes/No and amount with included/excluded list and highest-valuation/evidence hint. No partner SMOD checkboxes. | Bank amount numeric >=0; required investment/valuable booleans; investment >0 if Yes; valuables >=£500 if Yes. Partner present and capital route applies. | Partner bank accounts, relevance/amounts; nested `partner.capitals.bank_accounts`, `partner.capitals.non_liquid_capital`. | Restore. Partner No or non-means-tested prunes partner capital; passporting still retains it. Test partner exclusion hint, no SMOD controls, thresholds, repeated accounts and nested mapping. CCQ: assets section/partner and shared forms/views/partner payload/capitals builder/locale; `spec/forms/partner_assets_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`. |

## 7. CFE payload specification

### Boundary and target integration distinction

CCQ constructs an assessment request through `CfeService.call(session_data, relevant_steps)`, invoking assessment, dependants, proceedings, employment, irregular income, assets, regular transactions, applicant, and partner payload services before `CfeConnection.assess(payload)`. The equivalent controlled-work mapping from CCQ is specified below and is the parity reference for fields that CCQ actually sends.

The target already has `src/services/cfeClient.ts`: `CfeClient.submitAssessment()` posts a typed `CfeAssessmentRequest` to the CFE v7 staging `/v7/assessments` endpoint and validates a typed response. Its current request contract is deliberately limited to assessment metadata, applicant, proceeding type, `capitals.bank_accounts`, and `cash_transactions` income/outgoings. `cfeSyntheticFixture.ts` creates fixed synthetic values; no controlled-work answer snapshot or Forge page currently calls that client. The target contract therefore exists but does not yet represent the full CCQ payload: CCQ's `regular_transactions`, `employment_details`, `self_employment_details`, `irregular_incomes`, `properties`, partner details/capitals and dependant arrays are not present in the current target request type, and CCQ's transaction schema differs from target `cash_transactions`. The target fixture also requires `section_gross_income`, `section_disposable_income`, and `section_capital` `"complete"` values that are not emitted by the CCQ payload services.

For the current target request, `assessment` requires `submission_date`, `level_of_help: "controlled"`, Boolean `controlled_legal_representation`, and `"complete"` statuses for gross income, disposable income, and capital. `applicant` requires a DOB string and both qualifying-benefit/asylum-support Booleans. Each cash transaction is grouped by an allowed income/outgoing category and contains payments with `date`, numeric `amount`, and `client_id`. The existing CFE client is restricted to the configured staging origin, posts JSON without retry, and validates the v7 response; the synthetic fixture uses a fixed DOB/proceeding and empty cash transactions. These are facts about the current, limited client contract, not defaults approved for real controlled-work answers.

Do not modify `cfeClient.ts`, its endpoint/restrictions, response validation, or synthetic fixture in this documentation stage. Do not claim that preparing a snapshot submits to CFE. Before any future submission work, resolve whether the agreed wire contract is the current CFE v7 target request, a fuller contract matching CCQ, or an adapter/endpoint change. A typed adapter from the validated active-answer snapshot to the accepted wire contract will be required; it must not treat the session snapshot or the synthetic fixture as a full CFE payload.

Target references: `src/services/cfeClient.ts`, `src/services/cfeSyntheticFixture.ts`, `tests/unit/src/services/cfeClient.spec.ts`, `packages/cfe-eligibility-journey/src/answerSnapshot.ts`, `submissionReadyPage/submissionReadyStep.ts`, `src/services/financialEligibilityWithDeps.ts`. CCQ references: `app/services/cfe_service.rb`, `app/services/cfe/*_payload_service.rb`, `app/services/cfe_param_builders/*`, `app/lib/steps/helper.rb`, `app/models/check.rb`.

### CFE top-level and nested mapping

The following describes the CCQ controlled-work request. Fields are included only when their relevant page/form applies unless a row explicitly identifies a required default.

| CFE location | Shape, types, and permitted values | Source answers / conditions |
|---|---|---|
| `assessment` | Object: `submission_date` ISO date; `level_of_help: "controlled"`; optional `controlled_legal_representation: boolean`; optional `not_aggregated_no_income_low_capital: boolean`. | Level is controlled-work context, not a page answer. CLR included when its step applies. Under-18 flag is derived from aggregation/income/assets, not copied from one answer. |
| `proceeding_types` | One-element array of `{ ccms_code: string, client_involvement_type: "A" }`. CCQ codes: `IM030`, `IA031`, `SE003`. | Matter answer and type. Mapping caveat in §10: CCQ currently maps `immigration_clr`→`IM030`, both `immigration_legal_help` and `asylum`→`IA031`; No→`SE003`. |
| `applicant` | Object: `date_of_birth` ISO date; optional `receives_qualifying_benefit: boolean`; optional `receives_asylum_support: boolean`. | DOB is synthesized by CCQ from age band (17/50/70 years ago); the new journey must use the actual client DOB from target case data. Qualifying benefit maps from passporting. Asylum Support appears when its page applies, including explicit false. |
| `dependants` | Array of objects `{ date_of_birth: ISO date, in_full_time_education: boolean, relationship: "adult_relative" \| "child_relative", assets_value: number, income?: { frequency, amount } }`. | Count answers create records. CCQ adult DOB age is 21; child is 17 when income is supplied, otherwise 11; assets default `0`; child education is true. These dates/flags are builder conventions, not additional user answers. Income uses frequency enum below. |
| `employment_details` | Array of `{ income: { frequency, gross: number, benefits_in_kind: 0, tax: number, national_insurance: number, receiving_only_statutory_sick_or_maternity_pay: boolean } }`. `frequency` is `weekly`, `two_weekly`, `four_weekly`, `monthly`, or `three_monthly`. Tax and NI are negative values. | Non-self-employment rows from client/partner employment pages. Gross > 0; tax/NI >=0 on input; builders negate tax/NI. Statutory flag true only for `statutory_pay`. |
| `self_employment_details` | Array of `{ income: { frequency, gross: number, tax: negative number, national_insurance: negative number } }`; frequency as above. | Self-employment rows only; no `benefits_in_kind` or statutory-pay flag in the CCQ self-employment builder. |
| `irregular_incomes` | Client object `{ payments: Array<{ income_type: "student_loan" \| "unspecified_source", frequency: "annual" \| "monthly", amount: number }> }`; nested partner uses partner service conventions. | Student finance → `student_loan`, `annual`. Other sources → `unspecified_source`, `monthly` for controlled. Include only positive values. |
| `regular_transactions` | Array of `{ operation: "credit" \| "debit", category: enum, frequency: "weekly" \| "two_weekly" \| "four_weekly" \| "monthly" \| "three_monthly", amount: number }`. Categories produced here: `friends_or_family`, `maintenance`, `property_or_lodger`, `pension`, `child_care`, `maintenance_out`, `legal_aid`, `rent_or_mortgage`, `benefits`, `housing_benefit`. | Client and nested partner regular income, benefits, outgoings, and selected housing-cost form. Include positive amounts only. `total` maps to `three_monthly`; housing-benefit and regular income frequencies use the same translation. |
| `properties` | `{ main_home: { value: number, outstanding_mortgage: number, percentage_owned: number, subject_matter_of_dispute: boolean, shared_with_housing_assoc: boolean }, additional_properties?: Array<{ value, outstanding_mortgage, percentage_owned, subject_matter_of_dispute, shared_with_housing_assoc }> }`. Numbers are currency amounts / percentage. | Main home from `property_entry`; mortgage defaults to numeric 0 if not applicable. When only additional properties exist, CCQ creates an all-zero/false main_home record. Property additions preserve entered ownership and dispute flags; additional-property shared-association false. |
| `capitals` | `{ bank_accounts: Array<{ value: number, description: "Liquid Asset", subject_matter_of_dispute: boolean }>, non_liquid_capital: Array<{ value: number, description: "Non Liquid Asset", subject_matter_of_dispute: boolean }> }`. | Positive bank values only; positive investments and valuables only. Bank accounts at zero are valid answers but not emitted as capital records. Dispute is false when not applicable; client SMOD is not applicable to immigration/asylum. Partner has nested `partner.capitals`; partner SMOD not provided. |
| `partner` | Object only when `partner_details` is relevant: `{ partner: { date_of_birth: ISO date, employed: boolean }, irregular_incomes: [], employment_details: [], self_employment_details: [], regular_transactions: [], additional_properties: [], dependants: [], vehicles: [] }`, optional `capitals`. | Partner DOB currently synthetic (70 or 50 based on `partner_over_60`); resolve actual DOB source. Empty arrays are used for financial arrays when partner service is included but the related form is not relevant. Capital object only when partner assets form applies. No partner passporting answer exists in CCQ; client passporting gates partner financial pages. |

### Zero, false, null, and absent values

- **False:** at the Forge answer/session layer, preserve explicit No as `"no"` and distinguish it from a missing answer. At the CFE adapter boundary, map it to Boolean `false` where the wire schema requires a Boolean (for example passporting, asylum support, partner, and under-18 flags). Do not omit false or interpret it as not answered.
- **Zero input:** retain zero in the session for fields CCQ permits to be zero (bank-account balance, housing payments, mortgage balance). Do not synthesize a financial transaction/capital record for zero; CCQ builders emit only positive amounts for those arrays. A zero bank account can therefore be a completed answer with no corresponding CFE asset row.
- **Positive-only amounts:** income, benefit, other income, outgoings, investment, valuables and property values must pass their page-specific positive or minimum-bound rules. Do not turn blank into zero.
- **Absent:** omit a field/page collection when its step is not applicable. At payload construction, use the reconciled active answer projection, not raw session keys. Do not send stale values from hidden branches.
- **Null:** CCQ CFE builders do not generally use `null` to mean an unanswered/inapplicable controlled-work answer. Do not invent null CFE fields. The target CFE request type does not declare null for its required values; do not confuse it with the older call-centre `FinancialEligibilityData` type in `types/api-types.ts`, which is not the CFE wire contract.
- **Required derived zero/defaults:** preserve CCQ’s explicit `benefits_in_kind: 0`, dependant `assets_value: 0`, mortgage amount `0` when no mortgage, false dispute/shared-association flags, and zero main-home placeholder when additional property exists without a main-home page. These are builder semantics, not blank-answer fallbacks.
- **Currency and rounding:** CCQ CFE payload builders pass validated form amounts in the service’s expected numeric currency units. The target's present synthetic request has number-valued amounts and payment records; there is no full form-to-CFE amount mapping yet. Confirm amount units and rounding for the agreed wire contract; do not infer them from unrelated session formatting.
- **Dates:** CFE date fields are date values, not age-band enums. Resolve real applicant/partner DOB source and format at the adapter boundary.

CCQ payload source/tests: `app/services/cfe_service.rb`; `app/services/cfe/assessment_payload_service.rb`, `applicant_payload_service.rb`, `proceedings_payload_service.rb`, `dependants_payload_service.rb`, `employment_income_payload_service.rb`, `irregular_income_payload_service.rb`, `regular_transactions_payload_service.rb`, `assets_payload_service.rb`, `partner_payload_service.rb`; `app/services/cfe_param_builders/{dependants,employment,self_employment,irregular_income,regular_transactions,capitals}.rb`; specs under `spec/services/cfe/`.

## 8. Page-level test and acceptance matrix

Every page test must verify rendered content and input configuration against CCQ, not only that the route returns 200. Implement a form/step unit test, an applicability/navigation test, and a Forge integration test for each page. For conditional fields, test both presence and absence; for repeating data, test multiple records and row-level error association.

The last column of each page row in §6 is the specific parity acceptance test. These are minimum conditions. Add unit tests beside `tests/unit/packages/cfe-eligibility-journey`, using the established Forge test harness/registered components, and extend `financialEligibilityJourneyRouting.spec.ts` and `answerSnapshot.spec.ts` where route or active-answer logic changes. Extend `tests/playwright/tests/cfe-eligibility.spec.ts` for end-to-end entry, DOB branch, session revisit, validation, conditional pages and Change/review flow. Retain the existing CFE client tests for its current request/response behavior; add payload-adapter tests only after the CFE request contract is agreed. Also apply the following shared acceptance criteria to every applicable page:

1. Exact CCQ English heading, labels, choice text/values, hints, expandable content, and controlled-work-only guidance are present; non-controlled options are absent.
2. Requiredness and every CCQ validation boundary/message match, including conditional requiredness, numeric and integer constraints, and cross-field limits.
3. The page appears only under its listed conditions, in the specified order; invalid direct navigation is rejected or redirected to the first applicable missing page.
4. Continue saves and advances using the newly computed route; Back, refresh, revisit, and validation failure preserve the answer.
5. Check-answers displays the current answer and Change link only when applicable.
6. Changing an upstream answer prunes newly inapplicable page/subfield answers, preserves still-applicable answers, and requires newly applicable unanswered pages.
7. CFE mapping has the specified type, nesting, permitted enum, default/omission, and exact positive/zero/false behaviour.
8. Submission is blocked if any applicable answer is missing/invalid, or a cannot-use-service exit applies; stale answers are absent from payload.

### Inventory reconciliation

The controlled set above was reconciled against the CCQ section inventory and conditional builders, not just against the narrative order in `01-journey-analysis.md`:

| CCQ inventory | Controlled IDs accounted for |
|---|---|
| `NonFinancialSection.all_steps` / `grouped_steps_for` | `under_18_clr`, `aggregated_means`, `how_to_aggregate`, `regular_income`, `under_eighteen_assets`, `immigration_or_asylum`, `immigration_or_asylum_type`, `asylum_support`, `applicant`, `dependant_details`, `dependant_income`, `dependant_income_details` (12). Client age, level of help and certificated-only case steps are excluded. |
| `IncomeSection.all_steps` | `employment_status`, `income`, `benefits`, `benefit_details`, `other_income` (5). |
| `PartnerSection.all_steps` | `partner_details`, `partner_employment_status`, `partner_income`, `partner_benefits`, `partner_benefit_details`, `partner_other_income` (6). |
| `OutgoingsSection.all_steps` | `outgoings`, `partner_outgoings` (2). |
| `PropertySection.all_steps` | `property`, `property_landlord`, `property_entry`, `shared_ownership_housing_costs`, `mortgage_or_loan_payment`, `housing_costs`, `additional_property`, `additional_property_details`, `partner_additional_property`, `partner_additional_property_details` (10). The three housing forms are mutually exclusive at runtime. |
| `AssetsAndVehiclesSection.ASSET_STEPS` | `assets`, `partner_assets` (2). `VEHICLE_STEPS` (`vehicle`, `vehicles_details`) are explicitly omitted when controlled. |
| **Total** | **37 distinct page IDs**; 34 ordered positions after grouping the type/support pair and the three alternative housing-cost pages as choice points. |

Review against CCQ: `app/lib/steps/helper.rb` (`all_sections`, `all_possible_steps`), `non_financial_section.rb`, `income_section.rb`, `partner_section.rb`, `outgoings_section.rb`, `property_section.rb`, `assets_and_vehicles_section.rb`, `logic.rb`. The controlled flow’s existing feature spec is `spec/flows/controlled_work_spec.rb`; it covers the matter gate and terminal check-answers flow but is not a complete page inventory test. In the target, add a unit assertion over the controlled route/page definitions and a routing test over applicable branches so the 37-step inventory does not regress.

## 9. Ordered implementation checklist

Implement in this order; do not start an individual page before its shared prerequisites are available.

1. **Resolve route and integration decisions** in §10: under-18 matter/type/support behavior, immigration legal-help mapping, and the expected eventual CFE request contract. The task already specifies the new journey's first matter question; the DOB comes from existing case details. Confirm the desired Change-after-save UX.
2. **Extend existing answer and route contracts**: add the controlled answer codes and value types to `EligibilityAnswers` / `isEligibilityAnswerCode`; extend active-code and missing-answer logic in `answerSnapshot.ts`; add page conditions and case-scoped repeating data only where needed. Add branch and snapshot tests. Do not introduce a second session store or generic route engine.
3. **Add controlled steps to the existing Forge journey** in `packages/cfe-eligibility-journey/src/journey.ts`, with `immigration_or_asylum` first. Reuse shared components, `validWhen`, `visibleWhen`/`dependentWhen`, `SaveNewAnswerIfAnswered`, and ordered submission redirects. Keep client-details entry, case loading, DOB derivation, and effects dependency wiring unchanged.
4. **Implement the first page**: `immigration_or_asylum`. It must precede the target's DOB-derived age redirect; test first-page order and both answer branches.
   - **Page status:** Accepted. The question, validation, session integration, and conditional continuation are implemented. Under-18 clients continue to `under_18_clr` for either matter answer; unimplemented destinations remain at the explicit incomplete boundary. Matter details remain conditional on the resolved under-18 route.
5. **Implement under-18 branch**: `under_18_clr`, `aggregated_means`, `how_to_aggregate`, `regular_income`, `under_eighteen_assets`; test derived assessment flags and resolved exemption rules.
  - **Page status:** `under_18_clr`, `aggregated_means`, `how_to_aggregate`, `regular_income`, and `under_eighteen_assets` are implemented and accepted. The asset page includes the CCQ Yes/No question, supporting content, validation, guidance, case-scoped persistence, revisit prepopulation, conditional routing, and answer-change pruning. Its exempt route remains at the explicit incomplete boundary until the remaining journey is implemented. The applicant page follows the under-18 branch and conditional matter pages (see item 7).
6. **Implement conditional matter pages**: `immigration_or_asylum_type`, then `asylum_support`. Their conditions depend on the matter answer and the resolved under-18 behavior.
  - **Page status:** `immigration_or_asylum_type` and `asylum_support` are implemented and accepted with their CCQ question text, validation, session persistence, prepopulation, conditional navigation, and controlled-work guidance. Matter Yes routes adults and under-18 clients on the resolved means route through both pages; Matter No and under-18 exempt routes remove both answers. An Asylum Support No answer now continues to `applicant`; a Yes answer and all later unimplemented destinations remain at the explicit incomplete boundary.
7. **Implement applicant/dependants**: `applicant`, `dependant_details`, `dependant_income`, `dependant_income_details`. `applicant` is a prerequisite to all partner/passporting routes; dependants depend on passporting.
  - **Page status:** `applicant`, `dependant_details`, `dependant_income`, and `dependant_income_details` are implemented and accepted. `dependant_details` has page-content, validation, routing, case-scoped persistence, revisit-prepopulation, and CCQ-shaped `dependants[]` projection parity tests. The projection uses resolved active answers, creates one record per selected count, and applies the CCQ relationship, synthetic date-of-birth, education, and zero-assets conventions. Changing a Yes answer to No prunes its count; changing to a passported route removes the dependant answers. `dependant_income` matches the CCQ question, examples, Yes/No choices, required validation, and guidance link; it is conditionally routed, case-scoped, prepopulated on revisit, and its answer is removed when dependants are no longer selected. `dependant_income_details` matches the CCQ heading, hint, repeatable amount/frequency fields, options, exact validation messages, and monthly-equivalent income limits. It starts with one entry, caps additional entries at the selected dependant count, persists and restores rows by case, truncates rows if the dependant count falls, and removes them when the income gate or dependant route no longer applies. Its successful continuation and the `dependant_income` No branch both remain at the explicit incomplete boundary because `employment_status` is not implemented. No placeholder question or completed assessment is created. CFE income projection remains deferred to step 13 until the request contract is agreed. The next ordered page is `employment_status`.
8. **Implement reusable income primitives**, then client pages: `employment_status`, `income`, `benefits`, `benefit_details`, `other_income`. Primitive validation/repeaters can be shared with partner variants, but client pages are independently testable after the primitive and route contract exist.
   - **Page status:** `employment_status` is implemented and accepted with the CCQ question, controlled-work hints, required answer validation, case-scoped session persistence, revisit prepopulation, and applicability checks. The employed branch continues to `income`; the unemployed branch continues to `benefits`.
   - `income` is implemented and accepted with the CCQ repeated employment-income fields, options, conditional self-employment details, validation messages, and guidance. Income rows are persisted by case, restored on revisit, and pruned when employment status changes so the page is applicable only to employed, means-tested clients who are not passported. Both branches remain incomplete at the explicit boundary for the next unimplemented page; no placeholder question or completed assessment is created. The next ordered page is `benefits`.
   - **Page status:** `benefits` is implemented and accepted against CCQ. The controlled-work hint, benefit exclusions, guidance link to page 15 of the controlled-work PDF, Yes/No options, and required validation match the CCQ form, view, locale, and form spec. The answer is case-scoped, restored on revisit, and removed if the client changes to a passported route. Yes → `benefit_details`; No → `other_income`; both remain at the explicit incomplete boundary until those pages are implemented. No placeholder question or completed assessment is created.
   - **Page status:** `benefit_details` is implemented and accepted against CCQ. It includes the benefit-name suggestions, repeated benefit/amount/frequency fields, exact validations and guidance, case-scoped persistence, and revisit prepopulation. The page is conditional on `benefits: Yes`; changing to No removes the benefit details and completion marker. Both continuation paths stop at the explicit incomplete boundary because `other_income` is not implemented. No placeholder question or completed assessment is created. The next ordered page is `other_income`.
   - **Page status:** `other_income` is implemented and accepted against CCQ. It includes all six required Yes/No questions, supporting content, conditional amounts and controlled-work frequencies, exact validation messages, and the relevant guidance links. Answers persist and prepopulate on revisit; changing an answer to No prunes only that question’s conditional values, while changing to a passported route removes the page answers. The benefits No branch and the completed benefit-details branch both reach this page. Successful continuation remains at the explicit incomplete boundary; no placeholder question or completed assessment is created. CFE payload projection remains deferred to step 13. The next ordered page is `partner_details`.
9. **Implement partner pages**: `partner_details`, then partner employment/income, benefits/details, other income. The main partner gate and nested payload support are prerequisites; each detail page depends on its partner gate answer.
   - **Page status:** `partner_details` is implemented and accepted against CCQ: it asks whether the partner is aged 60 or over, with the exact hint, required Yes/No validation, and error message. The answer is case-scoped, restored on revisit, and removed when the client changes the partner answer to No. The page is available only after the applicant answers and when a partner is present on a means-tested route; it remains available on passported checks. The passported applicant branch and the client-income continuation route to it when applicable. Later partner/property destinations stop at the explicit incomplete boundary; no placeholder question or completed assessment is created. The next ordered page is `partner_employment_status`.
   - **Page status:** `partner_employment_status` is implemented and accepted against CCQ: it uses the exact partner employment question, controlled-work hints, `in_work` / `unemployed` options, and required validation message. The answer is case-scoped, restored on revisit, and replaced when changed; the page is available only for a present partner on a means-tested, non-passported route and follows `partner_details`. The employed branch routes to `partner_income`, and the unemployed branch routes to `partner_benefits`. No legacy form, placeholder question, or completed assessment is used.
   - **Page status:** `partner_income` is implemented and accepted against CCQ. It matches the question, payslip hint, supporting guidance, repeatable input labels/options/types, controlled-work frequencies, exact validation messages, and employment guidance link. Partner income rows are case-scoped, prepopulated on revisit, and pruned when employment status or route changes make them inapplicable. The employed branch continues to `partner_benefits`; that is the next ordered page.
   - **Page status:** `partner_benefits` is implemented and accepted against CCQ. It matches the question, supporting content, benefit exclusions, expandable Cost of Living Payments examples, guidance link, required Yes/No validation, and exact error message. The answer is case-scoped and restored on revisit; changing Yes to No removes the no-longer-applicable benefit-details completion answer, and changing the partner or passporting route removes the page answer. Yes routes to `partner_benefit_details`; No routes to the still-unimplemented `partner_other_income`.
   - **Page status:** `partner_benefit_details` is implemented and accepted against CCQ. It matches the partner-tagged heading, supporting content, excluded-benefit examples, expandable Cost of Living Payments examples, partner-specific frequency labels/errors, repeatable name/amount/frequency fields, allowed frequencies, and guidance links. Rows are case-scoped, prepopulated on revisit, and removed with the completion answer if the partner-benefits answer changes to No or the partner route stops applying. Valid submission records completion and routes to `partner_other_income`; no placeholder question or completed assessment is created.
   - **Page status:** `partner_other_income` is implemented and accepted against CCQ. It matches the partner heading and caption, six partner-worded Yes/No questions, supporting content, conditional amounts and controlled-work frequencies, exact validation messages, and income guidance. Partner-prefixed answers are case-scoped and prepopulated on revisit; changing a category to No removes only that category's conditional amount/frequency, while removing the partner or changing to a passported route removes the page answers. Both the partner-benefits No branch and completed partner-benefit-details branch route here. Successful continuation remains at the explicit incomplete boundary because `outgoings` is not implemented; no placeholder question or completed assessment is created. CFE payload projection remains deferred to step 13. The next ordered page is `outgoings`.
10. **Implement outgoings primitive and pages**: `outgoings`, `partner_outgoings`. Partner variant depends on reusable client form model and partner gate; childcare eligibility must be wired before the page is accepted.
   - **Page status:** `outgoings` is implemented and accepted against CCQ. It matches the question, supporting content, Yes/No choices, conditional positive currency amounts, allowed frequencies, exact validation messages, and disposable-income guidance link. Childcare eligibility is derived from dependants, client income/student finance, and partner eligibility when present. Answers are case-scoped, prepopulated on revisit, and conditional values are pruned when an answer or route makes them irrelevant. Successful continuation stops at the explicit incomplete boundary; no placeholder page or completed assessment is created. The next ordered page is `partner_outgoings`.
   - **Page status:** `partner_outgoings` is implemented and accepted against CCQ. It matches the partner heading and caption, all three partner-worded Yes/No questions, supporting hints, conditional positive currency amounts, controlled-work frequencies, exact validation messages, and disposable-income guidance. Childcare follows the shared eligibility rule. Partner-prefixed answers are case-scoped and prepopulated on revisit; changing a category to No removes only its conditional fields, while removing the partner or changing to a passported route removes the page answers. The completed client-outgoings branch routes here when a partner is present, and successful continuation remains at the explicit incomplete boundary; no placeholder page or completed assessment is created. The next ordered page is `property`.
11. **Implement property sequence**: `property`; shared landlord/cannot-use exit; the three alternative housing forms; `property_entry`; additional-property client and partner selector/details pages. Branch-specific pages can be authored independently after property route state, shared money/frequency controls and property record model are complete.
12. **Implement assets**: client assets first, then partner assets using shared asset primitives. Depends on non-means-tested/passporting gates and the CFE capital builder.
13. **Implement and test remaining CFE mapping and live integration** only after the target v7 request contract is agreed. The `dependant_details` CCQ-shaped `dependants[]` projection is implemented independently of the live request and uses the resolved active-answer projection. Keep the existing `CfeClient` behavior and synthetic fixture unchanged unless a separately approved integration change is requested.
14. **Extend check answers and submission preparation** across the full route; validate missing answers, create the filtered typed snapshot and preserve the existing submission-ready behavior. Do not describe this step as live CFE submission.
15. **Run the page/inventory acceptance suite** using `yarn test:unit` and the relevant Playwright spec via `yarn test:e2e`; compare rendered content, validation, and payloads against CCQ source/spec fixtures. Do not proceed to a later stage until review of this document.

### Independent work boundaries

Once shared components and typed route/session contracts are merged:

- The informational `how_to_aggregate` page has been implemented independently.
- Simple independent radio pages can be implemented in parallel where their route gate is already defined: `under_18_clr`, `regular_income`, `under_eighteen_assets`, `employment_status`, `benefits`, `partner_employment_status`, `partner_benefits`, `property_landlord`, and ownership selectors. Their integration tests still depend on route orchestration.
- Client and partner income/benefit/other-income pages can be implemented as paired work only after common repeater and conditional-field primitives are fixed; partner copy, gates, errors, and CFE nesting remain distinct acceptance requirements.
- The three housing-cost alternatives can be authored in parallel after the property route and common money/frequency controls exist; check-answers and payload mapping need the union contract.
- Client and partner assets can share form primitives, but partner asset visibility and CFE nesting depend on `applicant.partner`.
- `applicant`, active-answer/snapshot validation, CFE adapter, Change links, and check answers are integration-critical; do not split their continuous control flow among page implementers.

## 10. Unresolved decisions / stop-for-review items

1. **Under-18 ordering and exemption:** the task requires the matter question first, while CCQ suppresses the controlled matter group for CLR and no-means-test exemptions. Confirm how the required first answer affects exemption routing.
2. **Under-18 matter Yes:** if an exempt under-18 client answers Yes, decide whether type and asylum-support are also asked. CCQ currently suppresses them, but its proceeding builder needs a type to distinguish a matter. Do not silently default the type or map a missing answer.
3. **Asylum-support applicability:** CCQ asks it after any Yes to the matter question regardless of selected matter type. Confirm this applies to `immigration_clr` and `immigration_legal_help`, and how it interacts with the under-18 exempt route.
4. **Immigration legal-help mapping:** CCQ maps `immigration_legal_help` to `IA031` along with asylum; confirm whether this is intentional or a source inconsistency.
5. **Partner DOB:** the target loads the client's DOB from authoritative case details, but partner DOB is not part of the current question set; CCQ synthesizes it from an over-60 answer. Confirm the required CFE treatment for partner DOB.
6. **Change-answer return path:** current Forge Change links return to the edited step, then normal step redirects apply; they do not automatically return to check answers. Confirm whether controlled-work edits should keep this behavior or require an explicit return-to-review loop.
7. **Valuables boundary copy:** question text says “£500 or more”, while the relevance-validation error says “more than £500”; amount validation uses £500-or-more. Confirm canonical copy and retain the actual threshold of >=£500 unless directed otherwise.
8. **CFE request contract:** target `CfeClient` submits the limited typed request in `cfeClient.ts` to staging; it is not wired to the eligibility journey. Confirm whether the eventual controlled-work payload should extend this v7 request contract to support the CCQ data set, and document required client IDs/payment-date defaults for `cash_transactions`, the `section_*` completion flags, response handling, and deployment endpoint. Do not modify the current integration during this specification stage.
9. **Currency units:** confirm the target CFE v7 endpoint's expected units and rounding for all new financial fields. Keep this explicit at the mapping boundary; do not infer units from the synthetic fixture.

## Acceptance gate before implementation

- All decisions in §10 have an owner and recorded answer, particularly items 1–6 and 8–9.
- A route unit-test matrix covers all branches and the 37-page applicable-step union.
- The target implementation is located in `laa-cla-operator-app`; the existing `cfe-eligibility` Forge package, session effects, snapshot, and CFE client are reused rather than replaced.
- The existing CFE client and synthetic fixture remain behaviorally unchanged in this stage.
- Each page can be implemented from its §6 row plus the listed CCQ form/view/locale/model/builder and parity test paths without rediscovering its content or route gate.
- Change-answer, check-answers, pruning, incomplete-assessment blocking, and stale-answer-free payload generation have integration-test coverage.
