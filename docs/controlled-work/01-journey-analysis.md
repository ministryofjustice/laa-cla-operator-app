# CCQ controlled-work eligibility journey analysis

## Scope and method

This analysis is based on the locally available `laa-check-client-qualifies` source, principally `app/lib/steps`, then the flow handler, forms, Slim views, English locale, controllers, CFE services/builders and specs. It describes the controlled-work path, not the live service.

The task’s new-journey constraints are applied to the proposed ordering: the first question is **“Is this an immigration or asylum matter?”**; the client-age and level-of-help questions are excluded. Remaining controlled-work questions are retained where their CCQ conditions permit. CCQ’s existing under-18 behavior is documented as-is, with the conflict caused by this new ordering called out below.

CCQ calls its single level value `controlled`; the displayed value is “Civil controlled work or family mediation”. It does not have separate controlled-work and family-mediation branches. Both therefore use the same sections, steps, conditions, and payload code in this checkout.

## Summary

- **37 distinct potential pages** (unique step identifiers), including a no-input guidance page. Not every check displays every page.
- **6 step sections**: NonFinancial, Income, Partner, Outgoings, Property, and AssetsAndVehicles.
- **30 conditional page/field gates** are identified below, counting each decision that changes page presence, page fields, or routing once. This is not a count of the possible end-to-end paths.
- Vehicle pages are not part of the controlled path.
- Several source inconsistencies and integration decisions are noted at the end, including under-18 matter-page suppression and controlled immigration legal-help mapping.

## Section and page order

`Steps::Helper` concatenates the sections in this order:

1. **NonFinancialSection** — case details, under-18 screening, matter type, client/partner/dependants.
2. **IncomeSection** — client employment, benefits and other income.
3. **PartnerSection** — partner age, employment, benefits and other income.
4. **OutgoingsSection** — client and partner outgoings.
5. **PropertySection** — main home, housing costs and other property.
6. **AssetsAndVehiclesSection** — client and partner assets. Its vehicle step builder explicitly returns no steps for controlled work.

Within those sections, the new-journey ordering starts with the matter question, then preserves CCQ's existing under-18 screening order before the conditional matter-type/support pages. Items in brackets are conditional; the exact gates are in the next section.

1. `immigration_or_asylum`
2. [`under_18_clr`, if DOB indicates under 18]
3. [`aggregated_means`, if under 18 and CLR is No]
4. [`how_to_aggregate`, if aggregation is Yes]
5. [`regular_income`, if under 18, CLR No and aggregation No]
6. [`under_eighteen_assets`, if under 18, CLR No, aggregation No and regular income No]
7. [`immigration_or_asylum_type` → `asylum_support`, if the controlled matter group is applicable and the first answer was Yes]
8. [`applicant`, unless the check is non-means-tested]
9. [`dependant_details`, unless non-means-tested or passported]
10. [`dependant_income`, if at least one child or adult dependant is selected]
11. [`dependant_income_details`, if dependants aged 16+ get income]
12. [`employment_status`, unless income questions are skipped]
13. [`income`, if the client is employed or self-employed]
14. [`benefits`, unless income questions are skipped]
15. [`benefit_details`, if the client receives benefits]
16. [`other_income`, unless income questions are skipped]
17. [`partner_details`, if the client has a partner and the check is not non-means-tested]
18. [`partner_employment_status`, if a partner is present and the client is not passported]
19. [`partner_income`, if the partner is employed or self-employed]
20. [`partner_benefits`, if a partner is present and the client is not passported]
21. [`partner_benefit_details`, if the partner receives benefits]
22. [`partner_other_income`, if a partner is present and the client is not passported]
23. [`outgoings`, unless income questions are skipped]
24. [`partner_outgoings`, if a partner is present and income questions are not skipped]
25. [`property`]
26. [`property_landlord`, if the main home is shared ownership]
27. One housing-cost page, if applicable: [`housing_costs`], [`mortgage_or_loan_payment`] or [`shared_ownership_housing_costs`]
28. [`property_entry`, if the client/household owns the main home]
29. `additional_property`
30. [`additional_property_details`, if an additional property is selected; shared ownership exits to “cannot use service”]
31. [`partner_additional_property`, if a partner is present]
32. [`partner_additional_property_details`, if an additional property is selected; shared ownership exits to “cannot use service”]
33. `assets`
34. [`partner_assets`, if a partner is present]

The list contains 34 ordered positions, with 37 unique page identifiers: the conditional matter-type position contains two sequential pages, and the housing-cost position has three mutually exclusive alternatives.

## Branching description

```text
Start
└─ immigration_or_asylum [always first in the new journey]
   └─ if DOB is under 18:
      └─ under_18_clr
         ├─ Yes → current CCQ marks this route non-means-tested
         └─ No → aggregated_means
            ├─ Yes → how_to_aggregate → full means-check path
            └─ No → regular_income
               ├─ Yes → full means-check path
               └─ No → under_eighteen_assets
                  ├─ Yes → full means-check path
                  └─ No → current CCQ marks this route non-means-tested

After under-18 screening (or immediately for age 18+):
├─ current under-18 no-means-test result → skip the current controlled matter group
└─ controlled matter group applies
   ├─ immigration_or_asylum No → skip immigration_or_asylum_type and asylum_support
   └─ immigration_or_asylum Yes → immigration_or_asylum_type → asylum_support
      ├─ Yes → non-means-tested financial path
      └─ No, continue with the means check → means-check path

Means-check path:
├─ applicant: partner? + passporting?
│  ├─ passporting Yes → skip dependant and income/outgoings pages;
│  │                    still ask property (limited screens), additional property and assets
│  └─ passporting No → dependant, income, benefits, other income and outgoings screens
├─ dependant_details
│  └─ any dependants Yes → dependant_income
│     └─ income Yes → dependant_income_details
├─ employment_status
│  └─ employed/self-employed → income
├─ benefits
│  └─ Yes → benefit_details
├─ partner? [if Yes, partner_details]
│  ├─ client passporting Yes → partner_details only in PartnerSection
│  └─ client passporting No → partner employment, benefits and other-income pages
│     ├─ employed/self-employed → partner_income
│     └─ benefits Yes → partner_benefit_details
├─ property
│  ├─ owned outright → property_entry; no housing-cost page
│  ├─ with mortgage/loan → mortgage_or_loan_payment → property_entry
│  ├─ shared ownership → property_landlord
│  │  ├─ landlord is not the only other joint-owner → cannot use service
│  │  └─ Yes → shared_ownership_housing_costs → property_entry
│  └─ No → housing_costs
├─ additional_property
│  ├─ No → skip details
│  └─ Yes → additional_property_details
│     └─ shared ownership selection → cannot use service before details
├─ partner_additional_property [if partner]
│  ├─ No → skip details
│  └─ Yes → partner_additional_property_details
│     └─ shared ownership selection → cannot use service before details
└─ assets [and partner_assets if partner]
   ├─ investments Yes → amount field
   └─ valuables Yes → amount field
```

In the current CCQ implementation, controlled `asylum_support` is displayed after any Yes to `immigration_or_asylum`, regardless of which matter-type option was selected, but only when the controlled matter group is applicable. A Yes means the client does not need income or capital assessment. The current under-18 no-means-test check suppresses the *entire* controlled matter group. The required new journey must nevertheless ask `immigration_or_asylum` first; the diagram therefore promotes that question while leaving the existing under-18 screening and later matter-group gate intact. For an under-18 exempt client who answers Yes, this leaves no selected type/support answer for the existing CFE proceeding builder; this must be resolved rather than inferred.

### Conditional gates counted (30)

The count treats a multi-option property selection as one gate and counts each separately controlled yes/no field reveal or page inclusion once; it excludes repeatable “add another” records.

1. Immigration or asylum Yes/No selects whether type and asylum-support pages follow when the controlled matter group applies.
2. DOB under 18 selects whether the under-18 screen appears.
3. CLR Yes/No selects whether the remaining under-18 screening is skipped.
4. Aggregation Yes selects the `how_to_aggregate` information page.
5. Aggregation No selects the regular-income screen instead.
6. Regular income Yes/No controls whether the under-18 asset-threshold screen is omitted or shown.
7. Under-18 assets Yes/No controls full means-test versus no-means-test handling.
8. Under-18 no-means-test result suppresses the remainder of the current matter group and subsequent means screens (the new first question is still required).
9. Asylum Support Yes/No controls whether income/capital assessment is skipped.
10. Non-means-tested status suppresses applicant and all subsequent means screens.
11. Passporting Yes/No controls whether dependant and income/outgoing screens are omitted.
12. Child-dependants Yes reveals the child count input.
13. Adult-dependants Yes reveals the adult count input.
14. At least one dependant selects whether `dependant_income` is displayed.
15. Dependant income Yes selects whether income detail fields are displayed.
16. Client employed/self-employed selects `income`.
17. Client benefits Yes selects `benefit_details`.
18. Partner Yes selects the partner section.
19. Client passporting status selects partner-details-only versus partner financial screens.
20. Partner employed/self-employed selects `partner_income`.
21. Partner benefits Yes selects `partner_benefit_details`.
22. Main-home ownership selects which housing and equity screens are displayed.
23. Shared ownership landlord answer No exits the service.
24. Additional property Yes selects `additional_property_details`; shared ownership exits.
25. Partner additional property Yes selects its details page; shared ownership exits.
26. Childcare eligibility controls whether the childcare question is rendered on outgoings.
27. Client investments Yes reveals the investment amount.
28. Client valuables Yes reveals the valuables amount.
29. Partner investments Yes reveals the investment amount.
30. Partner valuables Yes reveals the valuables amount.

## Page details

The values below are session keys in the non-embedded flow. Question/error text is the English text in CCQ’s locale. A page may also show the common “There is a problem” error summary, “Save and continue” button, and section-specific guidance sidebar.

### NonFinancialSection

**1. `immigration_or_asylum` — section “Case details” / matter type**

- **Heading/question:** “Is this an immigration or asylum matter?”
- **Supporting content:** No inline hint is configured; the page has the controlled-work guidance link.
- **Input:** required Yes/No radio; values `true`/`false`; labels “Yes” / “No”.
- **Validation:** inclusion in `[true, false]`; error: “Select yes if this is an immigration or asylum matter”.
- **Display/dependency:** unconditional in the required new journey. In current CCQ, controlled matter pages are omitted when `under_eighteen_no_means_test_required?` is true.
- **Session/CFE:** `immigration_or_asylum`; determines next pages and proceeding type. CFE `proceeding_types[].ccms_code`: `IM030` only for `immigration_clr`, `IA031` for other Yes/type combinations and `SE003` for No. `client_involvement_type` is `A`.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/lib/steps/logic.rb`, `app/controllers/flow/handler.rb`, `app/forms/immigration_or_asylum_form.rb`, `app/views/question_flow/immigration_or_asylum.html.slim`, `config/locales/en.yml`; `spec/forms/immigration_or_asylum_form_spec.rb`, `spec/flows/controlled_work_spec.rb`, `spec/services/cfe/proceedings_payload_service_spec.rb`.

**2. `under_18_clr` — “Case details” (under-18 only)**

- **Heading/question:** “Is the work controlled legal representation (CLR)?”
- **Supporting content:** details state that CLR covers (i) the Health, Education and Social Care Chamber of the First-tier Tribunal under the Mental Health Act 1983 or paragraph 5(2) of the Schedule to the Repatriation of Prisoners Act 1984; (ii) the Mental Health Review Tribunal for Wales; or (iii) the Immigration and Asylum Chamber of the First-tier Tribunal.
- **Input:** required Yes/No radio; `true`/`false`.
- **Validation:** inclusion in `[true, false]`; error: “Select yes if the work is controlled legal representation (CLR)”.
- **Display/dependency:** DOB under 18; current CCQ places this before its matter group. Yes means `controlled_clr?` and bypasses the rest of under-18 screening.
- **Session/CFE:** `controlled_legal_representation`; CFE `assessment.controlled_legal_representation`.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/lib/steps/logic.rb`, `app/forms/controlled_legal_representation_form.rb`, `app/views/question_flow/under_18_clr.html.slim`, `config/locales/en.yml`; `spec/forms/controlled_legal_representation_form_spec.rb`, `spec/flows/under_eighteen_flow_spec.rb`.

**3. `aggregated_means` — “Case details” (under-18 only)**

- **Heading/question:** “Will you aggregate your client's means with another person's means?”
- **Supporting content:** “If your client's means are aggregated with the means of another person, such as a maintaining adult, they must have a full means test.” Expandable explanation defines a maintaining adult as someone responsible for maintaining the child, e.g. a parent/guardian providing support or anyone substantially contributing to maintenance. Exceptions listed: a parent/guardian has a conflict of interest; the client is financially independent; or the client is in local-authority or foster care.
- **Input:** required Yes/No radio; `true`/`false`.
- **Validation:** inclusion in `[true, false]`; error: “Select yes if you will aggregate your client’s means with another person’s means”.
- **Display/dependency:** DOB under 18 and CLR No.
- **Session/CFE:** `aggregated_means`; the individual answer is used for routing. CFE `assessment.not_aggregated_no_income_low_capital` is derived from the under-18 aggregation, income and asset answers.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/lib/steps/logic.rb`, `app/forms/aggregated_means_form.rb`, `app/views/question_flow/aggregated_means.html.slim`, `app/services/cfe/assessment_payload_service.rb`, `config/locales/en.yml`; `spec/forms/aggregated_means_form_spec.rb`, `spec/flows/under_eighteen_flow_spec.rb` (no dedicated assessment-payload spec found).

**4. `how_to_aggregate` — “Case details” (under-18, informational)**

- **Heading:** “You are going to aggregate your client's means with another person's means”.
- **Supporting content:** the panel repeats that aggregated means require a full means test. “What happens next” instructs users to answer questions about the client with reference to both the client and maintaining adult; combine relevant income and spending and enter the combined values in client fields. If the maintaining adult has a partner, include them only if permitted under regulation 16; answer partner-related questions as if the maintaining adult were the client, while continuing to treat the combined client/adult income and expenditure as the client’s. A further details section explains who may be a maintaining adult.
- **Input/action:** no answer field; “Continue” action.
- **Validation:** none.
- **Display/dependency:** aggregation Yes.
- **Session/CFE:** no page answer; prior `aggregated_means` controls routing. The ensuing answers feed the ordinary CFE fields.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/views/question_flow/how_to_aggregate.html.slim`, `config/locales/en.yml`; `spec/flows/under_eighteen_flow_spec.rb`.

**5. `regular_income` — “Case details” (under-18 only)**

- **Heading/question:** “Does your client get regular income?”
- **Supporting content:** example: payment from a full-time job or local-authority financial support for a care leaver; regular income requires a full means test. Do not include part-time earnings under 16 hours/week, holiday jobs, pocket money, or maintenance paid for the child.
- **Input:** required Yes/No radio; `true`/`false`.
- **Validation:** inclusion in `[true, false]`; error: “Select yes if your client gets regular income”.
- **Display/dependency:** under 18, CLR No, aggregation No. Yes bypasses the asset-threshold question and routes to means questions.
- **Session/CFE:** `regular_income`; routing signal only.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/lib/steps/logic.rb`, `app/forms/regular_income_form.rb`, `app/views/question_flow/regular_income.html.slim`, `config/locales/en.yml`; `spec/forms/regular_income_form_spec.rb`, `spec/flows/under_eighteen_flow_spec.rb`.

**6. `under_eighteen_assets` — “Case details” (under-18 only)**

- **Heading/question:** “Does your client have assets worth £2,500 or more?”
- **Supporting content:** examples are money in bank accounts, investments, valuable items, property or land; if they have such assets, they must have a full means test.
- **Input:** required Yes/No radio; `true`/`false`.
- **Validation:** inclusion in `[true, false]`; error: “Select yes if your client has assets worth £2,500 or more”.
- **Display/dependency:** under 18, CLR No, aggregation No, regular income No. Yes routes to a full means test; No makes the under-18 check non-means-tested.
- **Session/CFE:** `under_eighteen_assets`; used in routing and the derived CFE under-18 screening flag.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/lib/steps/logic.rb`, `app/forms/under_eighteen_assets_form.rb`, `app/views/question_flow/under_eighteen_assets.html.slim`, `config/locales/en.yml`; `spec/forms/under_eighteen_assets_form_spec.rb`, `spec/flows/under_eighteen_flow_spec.rb`.

**7. `immigration_or_asylum_type` — “Case details”**

- **Heading/question:** “What type of immigration or asylum matter is this?”
- **Hint:** “Guidance for these matters is in paragraphs 24 to 30, 32(1) and 32A(1) of Part 1 of Schedule 1 to the Legal Aid, Sentencing and Punishment of Offenders Act 2012 (LASPO).” The Act title links to the legislation.
- **Input:** required single-choice radio:
  - `immigration_clr`: “Immigration - controlled legal representation (CLR) in the First-tier Tribunal”
  - `immigration_legal_help`: “Immigration - legal help or help at court”
  - `asylum`: “Asylum - legal help, help at court, or controlled legal representation (CLR) in the First-tier Tribunal”
- **Validation:** required and inclusion in those three values; error: “Select what type of immigration or asylum matter this is”.
- **Display/dependency:** only after `immigration_or_asylum = true` and when current CCQ's controlled matter group is applicable. The under-18 no-means-test branch suppresses it.
- **Session/CFE:** `immigration_or_asylum_type`; drives `proceeding_types[].ccms_code` (see inconsistency below).
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/controllers/flow/handler.rb`, `app/forms/immigration_or_asylum_type_form.rb`, `app/views/question_flow/immigration_or_asylum_type.html.slim`, `config/locales/en.yml`; `spec/forms/immigration_or_asylum_type_form_spec.rb`, `spec/flows/controlled_work_spec.rb`, `spec/services/cfe/proceedings_payload_service_spec.rb`.

**8. `asylum_support` — “Case details”**

- **Heading/question:** “Does your client get Asylum Support?”
- **Supporting text:** “This means Asylum Support as defined in Section 4 or Section 95 of the Immigration and Asylum Act 1999.” “Your client will not need an income or capital assessment if they receive this type of Asylum Support.” “Also select yes if your client is named in their partner's Asylum Support claim.”
- **Additional controlled-work details:** expandable “If your client does not have evidence of Asylum Support”: “If your client does not have evidence (PDF, 599KB), consider answering no to this question instead of waiting. They are likely to pass the means test and be eligible for legal aid if you complete a full means check.”
- **Input:** required Yes/No radio; controlled options are “Yes” and “No, continue with the means check” (values true/false).
- **Validation:** inclusion in `[true, false]`; error: “Select if your client receives section 4 or section 95 Asylum Support”.
- **Display/dependency:** after a Yes to `immigration_or_asylum`, whether the selected matter type is immigration or asylum, and when current CCQ's controlled matter group is applicable. The under-18 no-means-test branch suppresses it. No is the means-test continuation; Yes makes `asylum_supported?` true and suppresses financial pages.
- **Session/CFE:** `asylum_support`; CFE applicant field `receives_asylum_support`.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/lib/steps/logic.rb`, `app/controllers/flow/handler.rb`, `app/forms/asylum_support_form.rb`, `app/views/question_flow/asylum_support.html.slim`, `config/locales/en.yml`; `spec/forms/asylum_support_form_spec.rb`, `spec/services/cfe/applicant_payload_service_spec.rb`, `spec/flows/controlled_work_spec.rb`.

**9. `applicant` — “Client details” (means-tested only)**

- **Page heading:** “Tell us about your client”.
- **Question 1:** “Does your client have a partner?” Yes/No, required booleans. Help text defines a partner as someone the client is married to, in a civil partnership with, or living with as if married/in a civil partnership (including living separately for financial/practical reasons such as prison or hospital care). Do not include someone permanently separated, an opponent, or someone with a contrary interest.
- **Question 2:** “Does your client receive a passporting benefit?” Yes/No, required booleans. Supporting text: no income assessment if receiving Universal Credit, Income Support, income-based JSA, income-related ESA, or the Guarantee Credit element of Pension Credit. Also select Yes if named on a partner’s passporting-benefit claim.
- **Validation:** `partner` and `passporting` each require true/false; errors respectively “Select yes if the client has a partner” and “Select yes if your client receives a passporting benefit or if they are named on their partner's passporting benefit”.
- **Display/dependency:** not non-means-tested. Partner answer controls partner/property/assets screens. Passporting answer controls dependant, client/partner income and outgoings screens; it does not skip property and capital questions.
- **Session/CFE:** `partner`, `passporting`; `passporting` becomes `applicant.receives_qualifying_benefit`; partner presence controls nested `partner` payload.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/lib/steps/logic.rb`, `app/controllers/flow/handler.rb`, `app/forms/applicant_form.rb`, `app/views/question_flow/applicant.html.slim`, `config/locales/en.yml`; `spec/forms/applicant_form_spec.rb`, `spec/flows/change_answers_flow_spec.rb`.

**10. `dependant_details` — “Dependants”**

- **Page heading:** “Tell us about your client's dependants”; with a partner: “Tell us about your client and their partner's dependants”.
- **Questions/inputs:** required Yes/No radio for child dependants and adult dependants. With partner, labels change to “Does your client or their partner have any child dependants?” and the equivalent adult question. Each Yes reveals a required whole-number count (“How many child/adult dependants are there?”).
- **Supporting content:** child dependant lives with the client and depends on them (or client/partner) for support; child must be under school leaving age, in full-time education, or in qualifying training. Exclude foster children whose fostering allowance has been wholly disregarded, and children with monthly income at or above the displayed dependant limit. Adult dependant means an adult relative living in the household and financially dependent; exclude anyone with property/vehicles/other assets over £8,000 total or monthly income at/above the displayed limit. The page warns: “Do not include any dependants with %{limit} or more income every month”.
- **Validation:** each Yes/No is required (messages: “Select yes if your client has child dependants” / “Select yes if your client has adult dependants”, with partner wording in the partner-aware locale). A count is required only when its answer is Yes, must be numeric, whole, and greater than zero. Exact errors: “Enter the number of child dependants”; “The number of child dependants must be greater than zero”; “Child dependants must be a number”; “Child dependants must be a whole number” (equivalent adult messages).
- **Display/dependency:** means-tested and not passported. Any child or adult dependant Yes adds `dependant_income`.
- **Session/CFE:** child/adult flags and counts; CFE `dependants[]` contains generated person records (adult/child relationship, synthetic DOB and education flag); supplied dependant income becomes each person’s `income`.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/lib/steps/logic.rb`, `app/forms/dependant_details_form.rb`, `app/views/question_flow/dependant_details.html.slim`, `app/services/cfe/dependants_payload_service.rb`, `app/services/cfe_param_builders/dependants.rb`, `config/locales/en.yml`; `spec/forms/dependant_details_form_spec.rb`, `spec/services/cfe/dependants_payload_service_spec.rb`.

**11. `dependant_income` — “Dependants”**

- **Question:** “Do any of the dependants aged 16 or over get regular income?”
- **Supporting text/examples:** a grant to a child over 16 in full-time education/training; an apprentice’s wage; benefits received by an adult dependant; earnings from part-time work where the dependant works more than 16 hours/week.
- **Input/validation:** required Yes/No; error “Select yes if any dependants aged 16 or over get income”.
- **Display/dependency:** at least one child or adult dependant selected.
- **Session/CFE:** `dependants_get_income`; Yes adds the details page. No dependant-income amount is sent.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/lib/steps/logic.rb`, `app/forms/dependant_income_form.rb`, `app/views/question_flow/dependant_income.html.slim`, `config/locales/en.yml`; `spec/forms/dependant_income_form_spec.rb`.

**12. `dependant_income_details` — “Dependants”**

- **Heading:** “Add income for dependants aged 16 or over”.
- **Hint:** “Income they receive will be deducted from your client’s dependant allowance.”
- **Inputs:** repeatable dependant-income entries; amount (“Income”) and frequency (“When does the dependant normally get this income?”). Frequency labels are Every week, Every 2 weeks, Every 4 weeks, Monthly. “Add another dependant's income” adds an entry.
- **Validation:** amount required, numeric and >0; frequency required and one of the four values. Errors include “Enter income the dependant gets”, “Income for the dependant must be more than 0”, “Income for the dependant must be a number”, and “Select when the dependant normally gets this income” (position-specific variants when several entries). The page also rejects income equivalent to the dependant monthly limit or more and instructs the user to go back and remove that person as a dependant.
- **Display/dependency:** `dependants_get_income = true`.
- **Session/CFE:** `dependant_incomes`; converted to CFE frequency/amount on the applicable dependant.
- **Sources/tests:** `app/lib/steps/non_financial_section.rb`, `app/controllers/flow/handler.rb`, `app/forms/dependant_income_details_form.rb`, the dependant-income model, `app/views/question_flow/dependant_income_details.html.slim`, `app/views/question_flow/_dependant_income_section.html.slim`, `config/locales/en.yml`; `spec/forms/dependant_income_details_form_spec.rb`, `spec/services/cfe/dependants_payload_service_spec.rb`.

### IncomeSection

**13. `employment_status` — “Client income”**

- **Question/heading:** “What is your client's employment status?”
- **Options:** `in_work` “Employed or self-employed”; `unemployed` “Unemployed”. Controlled-work hints for employed include cash pay, sole trader, company director, partnership, SSP or SMP. Unemployed includes anyone without employment income, e.g. retired clients.
- **Input/validation:** required single choice; error “Select an employment status”.
- **Display/dependency:** omitted for non-means-tested or passported checks. `in_work` triggers `income`.
- **Session/CFE:** `employment_status` is a routing value; income details populate CFE `employment_details` / `self_employment_details`.
- **Sources/tests:** `app/lib/steps/income_section.rb`, `app/lib/steps/logic.rb`, `app/forms/employment_status_form.rb`, `app/views/question_flow/employment_status.html.slim`, `app/views/question_flow/forms/_employment_status.html.slim`, `config/locales/en.yml`; `spec/forms/employment_status_form_spec.rb`, `spec/flows/controlled_work_spec.rb`.

**14. `income` — “Client income”**

- **Heading:** “Your client's employment income”; hint: “You can find this on your client's payslips”.
- **Per-entry inputs:** employment type radio (`employment`: A salary or wage; `statutory_pay`: Statutory Sick Pay or Statutory Maternity Pay; `self_employment`: Self-employment income), frequency radio (Every week, Every 2 weeks, Every 4 weeks, Every month, Total in last 3 months), and money fields “Income before any deductions”, “Income tax”, “National Insurance”. All can be repeated (“Add another employment income”).
- **Supporting content:** controlled frequency hint says CCQ uses this to calculate monthly income; for irregular income enter the last 3 months’ total. The salary option notes self-employed company directors/partnership members paid as employees. Self-employment details say to enter drawings, dividends, bonuses or benefits in kind; for cash-paid clients, drawings are money taken for personal use. Other expandable guidance covers police officers, prison employment, overseas tax/National Insurance and HM Forces allowances.
- **Validation:** each entry needs a valid type and controlled frequency; gross income required, numeric and >0; tax and National Insurance required, numeric and >=0; gross must exceed tax plus National Insurance. Exact messages include “Select the employment income type”, “Select when your client normally gets this income”, “Enter the income before any deductions”, “Income before any deductions must be more than 0”, “Income before any deductions must be a number”, “Income before any deductions must be more than income tax and National Insurance combined”, and corresponding required/numeric/0-or-more messages for tax and National Insurance. Repeated entries use position-specific variants.
- **Display/dependency:** client employment is `in_work`; at least one entry is part of the form. Completing the last gross-income-tagged page can trigger an early-results banner/calculation, but does not itself remove the remaining question flow.
- **Session/CFE:** `incomes`; CFE `employment_details` and `self_employment_details`, with frequency, gross, negative tax/NI and statutory-pay indicator.
- **Sources/tests:** `app/lib/steps/income_section.rb`, `app/controllers/flow/handler.rb`, `app/forms/income_form.rb`, `app/models/income_model.rb`, `app/views/question_flow/income.html.slim`, `app/views/question_flow/forms/_income.html.slim`, `app/views/question_flow/_income_section.html.slim`, `app/services/cfe/employment_income_payload_service.rb`, `app/services/cfe_param_builders/employment.rb`, `app/services/cfe_param_builders/self_employment.rb`, `config/locales/en.yml`; `spec/forms/income_form_spec.rb`, `spec/services/cfe/employment_income_payload_service_spec.rb`.

**15. `benefits` — “Client income”**

- **Question:** “Does your client get any non-passporting benefits?”
- **Supporting content:** examples include Child Benefit, tax credits or asylum-support payments; guidance explains benefits not to report. Do not include Housing Benefit, State Pension, PIP, Carer’s Allowance, Community Care direct payments, Fostering allowance or Cost of Living Payments.
- **Input/validation:** required Yes/No; error “Select yes if your client gets any benefits”.
- **Display/dependency:** omitted when income questions are skipped. Yes triggers `benefit_details`.
- **Session/CFE:** `receives_benefits` is a gate; detailed benefit items go to CFE regular transactions.
- **Sources/tests:** `app/lib/steps/income_section.rb`, `app/forms/benefits_form.rb`, `app/views/question_flow/benefits.html.slim`, `app/views/question_flow/forms/_benefits.html.slim`, `config/locales/en.yml`; `spec/forms/benefits_form_spec.rb`.

**16. `benefit_details` — “Client income”**

- **Heading:** “Add benefit details”.
- **Supporting content:** add non-passporting benefits and consult guidance; examples not to include are the same list as on `benefits`.
- **Inputs:** repeatable benefit name (type-ahead text/datalist), amount (money), frequency (Every week, Every 2 weeks, Every 4 weeks, Monthly); “Add another benefit”.
- **Validation:** benefit name required (“Enter the benefit name”); amount required, numeric and >0 (“Enter benefit amount”, “Benefit amount must be more than 0”, “Benefit amount must be a number”); frequency required and valid (“Select when your client normally gets this benefit”). Repeated entries get position-specific messages.
- **Display/dependency:** `receives_benefits = true`.
- **Session/CFE:** `benefits`; CFE regular-transaction credit records, category `benefits`, frequency and amount. The selected benefit name itself is not used in that transaction builder.
- **Sources/tests:** `app/lib/steps/income_section.rb`, `app/controllers/flow/handler.rb`, `app/forms/benefit_details_form.rb`, `app/models/benefit_model.rb`, `app/views/question_flow/benefit_details.html.slim`, `app/views/question_flow/forms/_benefit_details.html.slim`, `app/views/question_flow/_benefit_section.html.slim`, `app/services/cfe/regular_transactions_payload_service.rb`, `app/services/cfe_param_builders/regular_transactions.rb`, `config/locales/en.yml`; `spec/forms/benefit_details_form_spec.rb`.

**17. `other_income` — “Client income”**

- **Heading:** “Your client's other income”.
- **Questions (each has required Yes/No):**
  - “Does your client get financial help from friends or family?” Hint: “For example, money from a family member for rent or bills.”
  - “Does your client get maintenance from a former partner?” Hint: “This includes child maintenance.”
  - “Does your client get income from a property or lodger?”
  - “Does your client get income from pensions?” Hint: include the total value of State, workplace and personal pensions.
  - “Does your client get income from student finance?” Hint: includes student loans, grants or bursaries; do not include tuition-fee loans.
  - “Does your client get income from other sources?” Hint: examples include savings interest or income bonds; do not include disregarded income or Cost of Living Payments; links to controlled-work guidance on disregarded payments and discretion.
- **Conditional inputs:** Yes to friends/family, maintenance, property/lodger or pension reveals amount and frequency. Controlled frequencies: Every week, Every 2 weeks, Every 4 weeks, Every month (no “Total in last 3 months” option in this form). Yes to student finance reveals academic-year amount and has no frequency. Yes to other sources reveals amount received in the last month and no frequency.
- **Validation:** each Yes/No is required. Conditional amounts are required, numeric and >0; regular categories also require a valid frequency. Errors include “Enter amount of financial help from friends and family”, equivalent category-specific “Enter amount…” messages, numeric and “must be more than 0” variants, and “Select frequency…” for each regular category. Controlled `other` uses “Enter amount of income from other sources received in the last month”, with matching numeric and >0 errors.
- **Display/dependency:** omitted for non-means-tested or passported checks.
- **Session/CFE:** the `*_relevant`, `*_conditional_value` and frequency keys. Regular categories become CFE `regular_transactions` credits; student finance and other sources become `irregular_incomes` (`student_loan` annual; other `unspecified_source`, monthly in controlled work).
- **Sources/tests:** `app/lib/steps/income_section.rb`, `app/controllers/flow/handler.rb`, `app/forms/other_income_form.rb`, `app/views/question_flow/other_income.html.slim`, `app/views/question_flow/forms/_other_income.html.slim`, `app/services/cfe/irregular_income_payload_service.rb`, `app/services/cfe/regular_transactions_payload_service.rb`, `app/services/cfe_param_builders/irregular_income.rb`, `app/services/cfe_param_builders/regular_transactions.rb`, `config/locales/en.yml`; `spec/forms/other_income_form_spec.rb`, `spec/services/cfe/irregular_income_payload_service_spec.rb`.

### PartnerSection

**18. `partner_details` — “Partner income”**

- **Heading:** “Tell us about the partner”.
- **Question:** “Is the partner aged 60 or over?” Hint: clients with partners aged 60 or over may have some capital excluded from a financial-eligibility assessment.
- **Input/validation:** required Yes/No; error “Select yes if the partner is aged 60 or over”.
- **Display/dependency:** the client answered partner Yes and the check is not non-means-tested. This page is the only PartnerSection page for a passported client.
- **Session/CFE:** `partner_over_60`; CFE partner DOB is currently synthetic (70 or 50 years ago) and nested as `partner.date_of_birth`.
- **Sources/tests:** `app/lib/steps/partner_section.rb`, `app/forms/partner_details_form.rb`, `app/views/question_flow/partner_details.html.slim`, `app/services/cfe/partner_payload_service.rb`, `config/locales/en.yml`; `spec/forms/partner_details_form_spec.rb`, `spec/flows/change_answers_flow_spec.rb`.

**19. `partner_employment_status` — “Partner income”**

- **Question/heading:** “What is the partner's employment status?”
- **Options:** `in_work` “Employed or self-employed”; `unemployed` “Unemployed”. Controlled employed hint includes cash pay, sole trader, company director, partnership, SSP or SMP; unemployed includes anyone without employment income, e.g. retired partners.
- **Input/validation:** required single choice; error “Select an employment status”.
- **Display/dependency:** partner present and client not passported. `in_work` triggers `partner_income`.
- **Session/CFE:** partner-prefixed `partner_employment_status`; sets nested partner `employed` and gates its employment detail arrays.
- **Sources/tests:** `app/lib/steps/partner_section.rb`, `app/lib/steps/logic.rb`, `app/forms/partner_employment_status_form.rb`, `app/views/question_flow/partner_employment_status.html.slim`, `app/views/question_flow/forms/_employment_status.html.slim`, `app/services/cfe/partner_payload_service.rb`, `config/locales/en.yml`; `spec/forms/partner_employment_status_form_spec.rb`.

**20. `partner_income` — “Partner income”**

- **Heading:** “The partner's employment income”; hint: “You can find this on the partner's payslips.”
- **Inputs/support:** same types and money fields as `income`, labelled for the partner. Controlled frequency options are Every week, Every 2 weeks, Every 4 weeks, Every month and Total in last 3 months. Controlled self-employment guidance says to enter drawings, dividends, bonuses or benefits in kind and describes cash drawings. Police, prison, overseas and HM Forces expandable guidance is partner-worded.
- **Validation:** same required/type/frequency/gross/tax/NI and net-positive rules and exact error wording as `income`, with partner-specific frequency messages (e.g. “Select when the partner normally gets this income”).
- **Display/dependency:** partner present, client not passported, partner employment status `in_work`.
- **Session/CFE:** partner-prefixed income collection; nested CFE `employment_details` / `self_employment_details`.
- **Sources/tests:** `app/lib/steps/partner_section.rb`, `app/forms/partner_income_form.rb`, shared income model/views, `app/services/cfe/partner_payload_service.rb`, CFE builders, `config/locales/en.yml`; `spec/forms/partner_income_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`.

**21. `partner_benefits` — “Partner income”**

- **Question:** “Does the partner get any benefits?”
- **Input/validation:** required Yes/No; error “Select yes if the partner gets any benefits”.
- **Display/dependency:** partner present and client not passported. Yes triggers `partner_benefit_details`.
- **Session/CFE:** `partner_receives_benefits` gate; benefit details populate nested partner regular transactions.
- **Sources/tests:** `app/lib/steps/partner_section.rb`, `app/forms/partner_benefits_form.rb`, `app/views/question_flow/partner_benefits.html.slim`, `config/locales/en.yml`; `spec/forms/partner_benefits_form_spec.rb`.

**22. `partner_benefit_details` — “Partner income”**

- **Heading:** “Add benefit details”. Add the partner’s benefit name, amount and frequency; expandable guidance uses the same exclusions as client benefits (Housing Benefit, State Pension, PIP, Carer’s Allowance, Community Care direct payments, Fostering allowance and Cost of Living Payments). Repeating button: “Add another benefit”.
- **Inputs/validation:** same as `benefit_details`, with partner-specific required-frequency error: “Select when the partner normally gets this benefit”; name required, amount numeric and >0, frequency among weekly/fortnightly/four-weekly/monthly.
- **Display/dependency:** partner receives benefits.
- **Session/CFE:** partner benefit collection; nested CFE `partner.regular_transactions` with `benefits` credits.
- **Sources/tests:** `app/lib/steps/partner_section.rb`, `app/forms/partner_benefit_details_form.rb`, `app/models/benefit_model.rb`, shared benefit-details views, `app/services/cfe/partner_payload_service.rb`, `app/services/cfe_param_builders/regular_transactions.rb`, `config/locales/en.yml`; `spec/forms/partner_benefit_details_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`.

**23. `partner_other_income` — “Partner income”**

- **Questions:** partner versions of the six `other_income` questions: help from friends/family; maintenance from a former partner; income from property/lodger; pensions; student finance; other sources. Hints correspond to the client versions. Page caption: “Do not include income already entered for your client.”
- **Conditional inputs/validation:** same categories and conditional fields as `other_income`, including controlled amount for other sources received in the last month; yes/no required, conditional positive numeric amounts and category frequencies required.
- **Display/dependency:** partner present and client not passported.
- **Session/CFE:** partner-prefixed fields; nested CFE irregular income and regular transactions.
- **Sources/tests:** `app/lib/steps/partner_section.rb`, `app/forms/partner_other_income_form.rb`, shared `other_income` view, `app/services/cfe/partner_payload_service.rb`, CFE builders, `config/locales/en.yml`; `spec/forms/partner_other_income_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`.

### OutgoingsSection

**24. `outgoings` — “Outgoings”**

- **Heading:** “Your client's outgoings and deductions”.
- **Questions:** “Does your client pay for childcare?” (hint: e.g. childminder, nanny or nursery); “Does your client pay maintenance to a former partner?” (includes child maintenance; includes paying all/part of former matrimonial-home costs); “Does your client make payments towards legal aid for a criminal case?”
- **Inputs:** required Yes/No for each displayed question. Yes reveals amount and frequency; controlled frequencies are Every week, Every 2 weeks, Every 4 weeks, Every month (no total-in-last-three-months choice).
- **Validation:** each displayed yes/no required; conditional amount required, numeric and >0; conditional frequency required and valid. Errors include “Select yes if your client pays for childcare”, category-specific “Select yes…” errors, “Enter amount…” / “must be a number” / “must be more than 0”, and “Select frequency…” for each payment. Childcare’s control and its validation are omitted if the client is not eligible for childcare costs.
- **Display/dependency:** omitted when income questions are skipped; childcare is separately gated by `eligible_for_childcare_costs?`.
- **Session/CFE:** relevant/value/frequency keys; CFE `regular_transactions` debits with categories `child_care`, `maintenance_out`, and `legal_aid`.
- **Sources/tests:** `app/lib/steps/outgoings_section.rb`, `app/forms/outgoings_form.rb`, `app/views/question_flow/outgoings.html.slim`, `app/views/question_flow/forms/_outgoings.html.slim`, `app/services/cfe/regular_transactions_payload_service.rb`, `app/services/cfe_param_builders/regular_transactions.rb`, `config/locales/en.yml`; `spec/forms/outgoings_form_spec.rb`, `spec/lib/steps/outgoings_section_spec.rb`, `spec/flows/outgoings_flow_spec.rb`.

**25. `partner_outgoings` — “Outgoings”**

- **Heading/caption:** “The partner's outgoings and deductions”; “Do not include any outgoings already entered for your client.”
- **Questions:** partner versions of childcare, maintenance to a former partner, and payments toward legal aid for a criminal case; childcare hint is e.g. childminder, nanny or nursery; maintenance includes child maintenance.
- **Inputs/validation:** same conditional yes/no, positive numeric amount and controlled frequency behavior as `outgoings`, with partner-specific errors.
- **Display/dependency:** partner present and income questions not skipped.
- **Session/CFE:** partner-prefixed fields; nested CFE partner regular transactions.
- **Sources/tests:** `app/lib/steps/outgoings_section.rb`, `app/forms/partner_outgoings_form.rb`, shared outgoings view, `app/services/cfe/partner_payload_service.rb`, regular-transactions builder, `config/locales/en.yml`; `spec/forms/partner_outgoings_form_spec.rb`, `spec/lib/steps/outgoings_section_spec.rb`, `spec/flows/outgoings_flow_spec.rb`.

### PropertySection

**26. `property` — “Housing and property”**

- **Question (single client):** “Does your client own the home they usually live in?”
- **Question (partner):** “Does your client or their partner own the home the client usually lives in?”
- **Options/values:** “Yes, owned outright” (`outright`); “Yes, through a shared ownership scheme” (`shared_ownership`); “Yes, with a mortgage or loan” (`with_mortgage`); “No” (`none`).
- **Supporting content:** for partner checks, client-in-prison guidance says to include a property owned by either partner and lived in by the partner as the main dwelling, with the partner’s housing costs.
- **Validation:** required selection; error “Select if your client owns the home they live in”.
- **Display/dependency:** property page is shown for means-tested checks. On passported checks the mortgage/rent page is suppressed, but ownership-dependent property pages remain. The selection determines the next page(s).
- **Session/CFE:** `property_owned`; routes later questions. Main-home ownership/equity details become CFE `properties.main_home`.
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/lib/steps/logic.rb`, `app/forms/property_form.rb`, `app/views/question_flow/property.html.slim`, `config/locales/en.yml`; `spec/forms/property_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`, `spec/flows/change_answers_flow_spec.rb`.

**27. `property_landlord` — “Housing and property”**

- **Question:** “Is the landlord the only other joint-owner?”
- **Input/validation:** required Yes/No; error “Select yes if the landlord is the only other joint-owner”.
- **Display/dependency:** main home is shared ownership. No redirects to “You cannot use this service”; Yes proceeds to shared-ownership housing costs.
- **Session/CFE:** `property_landlord`; routing/eligibility gate, not a CFE property field.
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/lib/steps/helper.rb`, `app/forms/property_landlord_form.rb`, `app/views/question_flow/property_landlord.html.slim`, `config/locales/en.yml`; `spec/forms/property_landlord_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`, `spec/flows/change_answers_flow_spec.rb`, `spec/flows/cannot_use_service_flow_spec.rb`.

**28a. `housing_costs` — “Housing and property” (home not owned)**

- **Heading:** “Housing costs”. Hint: “Enter the housing costs for the home your client lives in.” If there is a partner living separately, do not include the partner’s housing costs.
- **Inputs:** required housing-payment amount (label “Enter amount”; hint “Enter 0 if this does not apply”) and, if amount >0, required frequency. Required Yes/No: “Is Housing Benefit claimed at the home the client lives in?” If Yes, enter Housing Benefit amount and frequency. Frequency choices are Every week, Every 2 weeks, Every 4 weeks, Every month, and Total in last 3 months (the controlled options in this form).
- **Supporting content:** housing payments include e.g. rent, mortgage or board/lodgings. Do not deduct Housing Benefit; board/lodgings should be lodging portion or 50% if unsure; former matrimonial-home costs paid for an ex-partner go under maintenance. If living with an ex-partner or someone whose means are excluded, enter the client’s share; LAA assumes 50% liability absent evidence. Any other person’s contribution toward the client’s share is entered as client income and evidence may be required.
- **Validation:** payment required, numeric, >=0; frequency required if payment >0. Housing Benefit yes/no required; conditional amount required, numeric, >0; frequency required if relevant. Benefit cannot exceed total housing costs. Exact errors include “Enter the housing payments amount. Enter 0 if this does not apply.”, “Housing payments must be a number. Enter 0 if this does not apply.”, “Select frequency of housing payments.”, “Select yes if housing benefit is claimed at the home your client lives in”, “Enter the Housing Benefit amount.”, “Housing Benefit must be more than 0”, “Select frequency of Housing Benefit.” and “Housing Benefit cannot be higher than housing costs”.
- **Display/dependency:** means-tested client selected No for main-home ownership; omitted under passporting.
- **Session/CFE:** `housing_payments`, frequency, Housing Benefit fields; CFE `regular_transactions` debits (`rent_or_mortgage`) and Housing Benefit credit.
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/forms/housing_costs_form.rb`, `app/forms/base_housing_costs_form.rb`, `app/views/question_flow/housing_costs.html.slim`, `config/locales/en.yml`; `spec/models/housing_costs_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`.

**28b. `mortgage_or_loan_payment` — “Housing and property”**

- **Heading/question:** “What are the mortgage or loan payments for the home your client usually lives in?”
- **Supporting content:** if living with someone else, enter the client’s amount; LAA assumes 50% liability unless evidence shows otherwise. If another person pays some of the client’s share, record it as income. Evidence may be required.
- **Inputs:** amount (“Enter full amount due”; hint “Enter 0 if this does not apply”) and frequency (Every week, Every 2 weeks, Every 4 weeks, Every month; controlled mode excludes “Total in last 3 months”).
- **Validation:** amount required, numeric and >=0; frequency required when amount >0. Locale strings: “Enter the mortgage or loan payments amount.”, “Mortgage or loan payments must be a number.”, “Mortgage or loan payments must be 0 or more.”, “Select frequency of mortgage payments.”
- **Display/dependency:** main home selected `with_mortgage`; omitted for passporting.
- **Session/CFE:** `housing_loan_payments`, `housing_payments_loan_frequency`; CFE regular transaction debit, category `rent_or_mortgage`.
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/forms/mortgage_or_loan_payment_form.rb`, `app/views/question_flow/mortgage_or_loan_payment.html.slim`, `config/locales/en.yml`; `spec/forms/mortgage_or_loan_payment_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`.

**28c. `shared_ownership_housing_costs` — “Housing and property”**

- **Heading:** “Housing costs”. Hint: “Enter the housing costs for the shared ownership scheme home your client lives in.” With a partner living separately, do not include the partner’s costs.
- **Inputs:** choose frequency for combined rent/mortgage (Every week, Every 2 weeks, Every 4 weeks, Every month, Total in last 3 months); enter rent and mortgage amounts (each can be zero); required Yes/No “Does your client get Housing Benefit for this home?” (partner version asks whether client or partner gets it); conditional benefit amount/frequency.
- **Supporting content:** explains aligning different rent/mortgage frequencies by calculation; the same “Living with someone else” and “What to include with housing payments” details as `housing_costs` are available.
- **Validation:** rent and mortgage required, numeric and >=0; combined frequency required if combined value >0; Housing Benefit Yes/No required, conditional amount >0 and valid frequency; Housing Benefit cannot exceed combined housing costs. Exact locale errors include “Enter the rent amount.”, “Rent must be a number. Enter 0 if this does not apply.”, “Enter the mortgage payment. Enter 0 if this does not apply.”, “Mortgage payment must be a number. Enter 0 if this does not apply.” and “Housing Benefit cannot be higher than housing costs.”
- **Display/dependency:** main home selected shared ownership and landlord answer Yes; omitted for passporting.
- **Session/CFE:** rent, shared ownership mortgage and combined frequency; CFE `regular_transactions` debit category `rent_or_mortgage`, plus Housing Benefit credit.
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/forms/shared_ownership_housing_costs_form.rb`, `app/forms/base_housing_costs_form.rb`, `app/views/question_flow/shared_ownership_housing_costs.html.slim`, `config/locales/en.yml`; `spec/models/shared_ownership_housing_costs_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`, `spec/flows/change_answers_flow_spec.rb`.

**29. `property_entry` — “Housing and property”**

- **Heading:** “The home your client usually lives in”.
- **Hint:** single-client: “Your client's name must be on the property deeds, lease, freehold or mortgage.” With partner: “Your client or their partner’s name must be on the property deeds, lease, freehold or mortgage.”
- **Inputs:** “Home value” money; “How much is left to pay on the mortgage?” money when ownership is mortgage/shared ownership; “What percentage of the home do they own?” integer percentage; subject-matter-of-dispute checkbox when `smod_applicable?` (controlled and not immigration/asylum).
- **Supporting content:** estimate via property websites; if multiple valuations, use highest and retain evidence. Mortgage amount from lender statement, include other loans secured on property. Partner version asks for combined percentage owned by client and partner.
- **Validation:** home value required, numeric and >0; mortgage required, numeric and >0 only when mortgage/shared ownership; percentage required, whole integer 1–100; dispute boolean required only when shown. Exact errors: “Enter how much the home they live in is worth”; “Your client's home must be worth more than 0”; “How much your client's home is worth must be a number”; mortgage equivalents; “Enter the percentage share that they own of the home”; percentage must be whole and between 1 and 100.
- **Display/dependency:** any ownership option other than No, after any required landlord/housing-cost page. On passporting, still shown for owned property, but no housing-cost page.
- **Session/CFE:** `house_value`, `mortgage`, `percentage_owned`, `house_in_dispute`; CFE `properties.main_home` (`value`, `outstanding_mortgage`, `percentage_owned`, `subject_matter_of_dispute`, `shared_with_housing_assoc`).
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/forms/property_entry_form.rb`, `app/views/question_flow/property_entry.html.slim`, `config/locales/en.yml`; `spec/forms/property_entry_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`.

**30. `additional_property` — “Housing and property”**

- **Question:** “Does your client own any other property, a holiday home or land?”
- **Hint:** “This can be the sole property owned if not the home the client lives in, even if the property is abroad or not providing an income.” If client and partner share an additional property, include it here.
- **Options:** Yes, owned outright (`outright`); Yes, through a shared ownership scheme (`shared_ownership`); Yes, with a mortgage or loan (`with_mortgage`); No (`none`).
- **Validation:** required selection; error “Select if your client owns any other property”.
- **Display/dependency:** omitted only if capital questions are skipped; otherwise shown even for passporting. Yes adds details, except a shared-ownership answer triggers the cannot-use-service exit.
- **Session/CFE:** `additional_property_owned`; details populate CFE `properties.additional_properties`.
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/forms/additional_property_form.rb`, `app/views/question_flow/additional_property.html.slim`, `config/locales/en.yml`; `spec/forms/additional_property_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`, `spec/flows/cannot_use_service_flow_spec.rb`.

**31. `additional_property_details` — “Housing and property”**

- **Heading:** “Client’s other property, holiday home or land”. Hint: if client and partner share property, include it here.
- **Inputs:** repeatable property records with “How much is the property, holiday home or land worth?”; if ownership type is not predetermined, “Is there an outstanding mortgage on the property, holiday home or land?” Yes reveals mortgage amount; “What percentage share does your client own?” “Add another property, holiday home or land” repeats.
- **Validation:** value required, numeric and >0; if mortgage applies, amount required, numeric and >0; inline mortgage answer required when shown; ownership percentage required, whole number 1–100. Exact locale errors are field-specific: “Enter how much the property, holiday home or land is worth”; “The property, holiday home or land must be worth more than 0”; “Select yes if there is an outstanding mortgage”; mortgage errors; percentage must be a whole number between 1 and 100. Dispute checkbox is shown only when `smod_applicable?`.
- **Display/dependency:** additional-property choice is an owned option other than No; shared-ownership option exits before this page. Ownership type determines whether inline mortgage question appears.
- **Session/CFE:** `additional_properties[]`; CFE property records include value, outstanding mortgage, percentage, dispute and shared-housing-association status.
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/forms/additional_property_details_form.rb`, `app/models/additional_property_model.rb`, `app/views/question_flow/additional_property_details.html.slim`, `app/views/question_flow/_additional_property_section.html.slim`, `app/services/cfe/assets_payload_service.rb`, `config/locales/en.yml`; `spec/forms/additional_property_details_form_spec.rb`, `spec/services/cfe/assets_payload_service_spec.rb`.

**32. `partner_additional_property` — “Housing and property”**

- **Question:** “Does the partner own any other property, a holiday home or land?”
- **Hint:** may be their sole property if not the client’s home, including abroad/non-income property; do not include property already entered for the client.
- **Options:** same four values/labels as `additional_property`.
- **Validation:** required selection; error “Select if the partner owns any other property”.
- **Display/dependency:** partner present and capital questions not skipped. Yes adds details, except shared ownership exits.
- **Session/CFE:** `partner_additional_property_owned`; gates nested CFE `partner.additional_properties`.
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/forms/partner_additional_property_form.rb`, `app/views/question_flow/partner_additional_property.html.slim`, `config/locales/en.yml`; `spec/forms/partner_additional_property_form_spec.rb`, `spec/lib/steps/property_section_spec.rb`, `spec/flows/cannot_use_service_flow_spec.rb`.

**33. `partner_additional_property_details` — “Housing and property”**

- **Heading:** “The partner's other property, holiday home or land”. Hint: “Do not include any property or land already entered for your client.”
- **Inputs/validation:** repeatable value, conditional mortgage indicator/amount and percentage share, as for client additional-property details but referring to the partner. Value and applicable mortgage must be >0; percentage required as a whole 1–100; conditional Yes/No is required. CCQ has partner-specific error wording, including “Enter the percentage share the partner owns” and the corresponding whole-number/range errors.
- **Display/dependency:** partner owns additional property; shared ownership exits before details.
- **Session/CFE:** partner additional-property collection; CFE nested `partner.additional_properties` with value, mortgage, percentage and `shared_with_housing_assoc: false`.
- **Sources/tests:** `app/lib/steps/property_section.rb`, `app/forms/partner_additional_property_details_form.rb`, `app/models/partner_additional_property_model.rb`, shared additional-property partial, `app/services/cfe/partner_payload_service.rb`, `config/locales/en.yml`; `spec/forms/partner_additional_property_details_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`.

### AssetsAndVehiclesSection

**34. `assets` — “Assets”**

- **Page heading:** “Client assets”.
- **Inputs/supporting content:**
  - Always at least one bank-account money field: “Total money in bank account”; hint “Enter 0 if this does not apply.” Examples: current/savings accounts, ISAs, child accounts where client is signatory and prison accounts; do not include disregarded capital or Cost of Living Payments. Repeatable “Add another bank account”.
  - Required Yes/No “Does your client have any investments?” Hint examples: shares in a public limited company, unit trusts or capital bonds. Yes reveals “Total of all investments”.
  - Required Yes/No “Does your client have valuable items worth £500 or more?” Details list included items (jewellery other than wedding/engagement/eternity rings, art, antiques, non-main-residence caravan, musical instruments unless client is a professional musician; controlled mode also says “any vehicle not in regular use”) and excluded items (rings, furniture/appliances, televisions, mobile phones/laptops/devices, clothing, work equipment/tools). If yes, “Total of all valuable items”; controlled hint says use the highest valuation and retain evidence for audit/assessment.
  - Subject-matter-of-dispute checkboxes for applicable client assets are available where `smod_applicable?` is true; this is false for immigration/asylum cases.
- **Validation:** bank-account amount required, numeric and >=0; if applicable, dispute checkbox must be boolean. Investment/valuable relevance answers required. Investment amount required, numeric and >0 if Yes; valuable amount required, numeric and >=£500 if Yes. Exact messages include “Enter total money in bank account. Enter 0 if this does not apply.”, “Total money in bank account must be a number. Enter 0 if this does not apply.”, “Select yes if client has any investments”, “Select yes if client has any valuables worth more than £500”, and amount errors for investments/valuables.
- **Display/dependency:** non-means-tested results suppress capital questions. Otherwise client assets always shown, including passported checks.
- **Session/CFE:** `bank_accounts`, `investments_relevant`, `investments`, `valuables_relevant`, `valuables` and applicable dispute booleans; CFE `capitals.bank_accounts` and `capitals.non_liquid_capital`.
- **Sources/tests:** `app/lib/steps/assets_and_vehicles_section.rb`, `app/lib/steps/logic.rb`, `app/forms/client_assets_form.rb`, `app/forms/assets_form.rb`, `app/models/bank_account_model.rb`, `app/views/question_flow/assets.html.slim`, `app/views/question_flow/forms/_assets.html.slim`, `app/views/question_flow/_bank_account_section.html.slim`, `app/services/cfe/assets_payload_service.rb`, `app/services/cfe_param_builders/capitals.rb`, `config/locales/en.yml`; `spec/forms/assets_form_spec.rb`, `spec/services/cfe/assets_payload_service_spec.rb`, `spec/views/check_answers_page/client_content/assets_spec.rb`.

**35. `partner_assets` — “Assets”**

- **Page heading:** “Partner assets”. Hint: “Do not include any assets already entered for your client.”
- **Inputs/supporting content:** repeatable bank-account amounts (excluding joint accounts already entered for the client; do not include disregarded capital or Cost of Living Payments); required Yes/No “Does the partner have any investments?” with examples of shares/unit trusts/capital bonds and an amount if Yes; required Yes/No “Does the partner have valuable items worth £500 or more?” with controlled highest-valuation/evidence hint, item inclusion guidance, and amount if Yes. Dispute checkboxes are not enabled for partner assets.
- **Validation:** same bank account and investment/valuable amount bounds as `assets`; required boolean gates. The visible errors identify partner investments/valuables.
- **Display/dependency:** partner present, non-means-tested capital questions not skipped.
- **Session/CFE:** partner bank accounts and assets; nested CFE `partner.capitals` with bank accounts and non-liquid capital.
- **Sources/tests:** `app/lib/steps/assets_and_vehicles_section.rb`, `app/forms/partner_assets_form.rb`, `app/forms/assets_form.rb`, `app/views/question_flow/partner_assets.html.slim`, shared asset/bank-account partials, `app/services/cfe/partner_payload_service.rb`, `app/services/cfe_param_builders/capitals.rb`, `config/locales/en.yml`; `spec/forms/partner_assets_form_spec.rb`, `spec/services/cfe/partner_payload_service_spec.rb`.

## CFE request payload mapping

`CfeService` builds the request from the relevant step list; `Check` also filters answers by whether their step is currently relevant. The following answers directly populate or gate request fields:

| Page/answer | CFE request field(s) | Notes |
|---|---|---|
| Current client-age answer (excluded in the new journey) | `applicant.date_of_birth` | Current CCQ fabricates DOB as 17, 50 or 70 years before today from the selected age band. The required new flow must source the real DOB instead; this requires an integration decision outside CCQ. |
| Current level-of-help answer (excluded from user questions) | `assessment.level_of_help` | Controlled/family mediation is represented by CCQ value `controlled`; it must be supplied by the consuming journey/context. `submission_date` is also in `assessment`. |
| `under_18_clr` | `assessment.controlled_legal_representation` | Included when that step is relevant. |
| Under-18 screening | `assessment.not_aggregated_no_income_low_capital` | Derived from aggregation, regular-income and asset-threshold answers, not passed as each individual answer. |
| `immigration_or_asylum`, `immigration_or_asylum_type` | `proceeding_types[]` | Produces a single `ccms_code` and `client_involvement_type: A`; code mapping caveat below. |
| `asylum_support` | `applicant.receives_asylum_support` | A Yes changes whether income/capital steps are relevant. |
| `applicant.passporting` | `applicant.receives_qualifying_benefit` | Partner Yes separately enables nested partner financial data. |
| Dependant flags/counts/income | `dependants[]` | Builder emits relationship, DOB, education, assets value and optional frequency/amount. Child/adult DOBs are synthesized by CCQ, not asked. |
| Client employment income | top-level `employment_details`, `self_employment_details` | Includes frequency, gross, tax/NI and statutory-pay indicator. |
| Client benefit details, other regular income and outgoings | `regular_transactions` | Credits/debits and categories are built from relevant forms; housing payments and Housing Benefit are included here too. |
| Student finance / other income | `irregular_incomes.payments[]` | `student_loan` annual and `unspecified_source` monthly for controlled work. |
| Main home and additional property | `properties.main_home`, `properties.additional_properties[]` | Value, mortgage, ownership percentage, dispute and shared-housing fields. |
| Client assets | `capitals.bank_accounts`, `capitals.non_liquid_capital` | Includes positive amounts; dispute status only where applicable. |
| Partner age/employment, income, benefits, outgoings, property and assets | nested `partner` object and its financial arrays | Partner DOB is currently synthesized from an over-60 answer. |
| `property_landlord`, property ownership selectors, additional-property selectors, employment/benefit/passporting gates | No direct field, but control which answer data/forms are sent | `relevant_steps` filtering suppresses inapplicable answers. |
| Vehicle answers | None for controlled work | Vehicle steps are omitted by `AssetsAndVehiclesSection.vehicle_steps` when controlled. |

Primary implementation/test paths: `app/services/cfe_service.rb`, `app/services/cfe/*_payload_service.rb`, `app/services/cfe_param_builders/*`, `app/lib/steps/helper.rb`, `app/models/check.rb`; payload specs under `spec/services/cfe/` (notably `proceedings_payload_service_spec.rb`, `applicant_payload_service_spec.rb`, `dependants_payload_service_spec.rb`, `assets_payload_service_spec.rb`, `regular_transactions_payload_service_spec.rb`, `employment_income_payload_service_spec.rb`, and `partner_payload_service_spec.rb`).

## Returning to a question and changing an answer

- Every normal question page computes `previous_step` from the currently relevant dynamic step list. Its Back link returns to that page (or to the journey start if no previous step).
- Submitting a valid normal form merges the form attributes into the assessment session and redirects to the next step recalculated from the updated answers. Invalid input is rendered on the same page with an error summary; answers are not advanced.
- On Check answers, each eligible summary table has a Change link to that page. It opens a temporary `pending` copy of the assessment. While editing, CCQ recomputes the future relevant steps and checks their models for validity; it directs the user to the first now-invalid/newly-required page. If a changed answer creates a new conditional page (e.g. employed instead of unemployed), that page is collected before returning to Check answers.
- The pending copy replaces the saved assessment only when the change loop completes. Navigating away/back before finishing does not commit it. The relevance filter prevents obsolete answers from being used by the CFE request, even where an old hidden value remains in session data.
- For the shared-ownership cost edit loop, CCQ explicitly sends the user to property-entry next. An invalid “landlord is only other joint-owner” answer exits to cannot-use-service. Similar “change answer” paths are covered by the feature specs.
- Specs: `app/helpers/application_helper.rb`, `app/controllers/question_flow_controller.rb`, `app/controllers/forms_controller.rb`, `app/controllers/concerns/change_answers_methods.rb`, `app/controllers/change_answers_controller.rb`, `app/views/checks/_check_answers_table.html.slim`, `app/lib/steps/helper.rb`; `spec/flows/change_answers_flow_spec.rb`, `spec/flows/under_eighteen_flow_spec.rb`, and `spec/flows/steps/helper_spec.rb`.

## Excluded steps and questions

| Excluded item | Reason |
|---|---|
| `client_age` — “What age is your client?” | Explicit exclusion; derive age from the existing client DOB. Note: CCQ currently uses this age band to decide the under-18 branch and to synthesize the CFE DOB; preserve the under-18 decision using the real DOB rather than a new age question. |
| `level_of_help` — “What level of help does your client need?” | Explicit exclusion; work type is already known. The selected work type must still reach CFE as `assessment.level_of_help = controlled` for both controlled work and family mediation. |
| `domestic_abuse_applicant` | Certificated-only in the section builder; `Steps::Logic.domestic_abuse_applicant?` returns false for controlled work. |
| `immigration_or_asylum_type_upper_tribunal` | Certificated/Upper Tribunal path; controlled work uses the boolean matter question and controlled matter type question instead. |
| `vehicle` and `vehicles_details` | `AssetsAndVehiclesSection.vehicle_steps` returns no vehicle group for controlled work. |
| Certificated-only year-frequency options and partner passporting questions | The controlled forms exclude the “Total in the last year” option. CCQ has no partner passporting question; client passporting governs the partner section’s reduced/full screens. |

## Uncertainties and inconsistencies to resolve

1. **Unconditional first matter question versus under-18 exemption:** in current CCQ, `controlled_matter_type_group` returns no group when `under_eighteen_no_means_test_required?` is true. That includes controlled CLR and the under-18 no-aggregation/no-regular-income/under-£2,500-assets route. The new journey explicitly requires the matter question first. Confirm whether it is to be asked for these currently exempt routes; if yes, CCQ’s current skip condition must not be copied as-is.
2. **What to do after a first-question Yes for an otherwise exempt child:** the first question is still asked, but the current under-18 no-means-test result then suppresses the type/support pages. The existing proceeding builder needs the matter type to produce the CFE proceeding code. Decide whether type/support must be asked despite that exemption or whether another explicit handling rule is required.
3. **Immigration legal-help CFE mapping:** `ProceedingsPayloadService` maps only `immigration_clr` to `IM030`; both `immigration_legal_help` and `asylum` fall through to `IA031`. `Check#immigration_matter?` likewise considers only `immigration_clr` an immigration matter. The proceedings spec’s “immigration or asylum type is legal help” example describes it as immigration but expects `IA031`. Confirm intended code/eligibility treatment.
4. **Asylum-support page condition:** code adds `asylum_support` after any affirmative controlled immigration/asylum answer, regardless of type; its Yes makes the case non-means-tested. Confirm that this applies to `immigration_legal_help` and `immigration_clr`, not only the `asylum` answer.
5. **DOB and partner age fields:** CCQ’s CFE applicant/partner DOBs are synthetic dates generated from age bands (and partner over-60 Yes/No), not real DOBs. Confirm how the new DOB source is passed to CFE and whether partner DOB remains a separate question or has another source.
6. **Count of pages:** 37 is the count of distinct CCQ step identifiers applicable to the controlled-work step universe. A particular user sees a smaller subset, and the three housing-cost pages are mutually exclusive.
7. **Embedded mode:** `Steps::Helper` marks `immigration_or_asylum` as pre-answered and hidden in Embedded mode. Confirm whether the new requirement that the first *displayed* question be this question applies to embedded journeys too, or only the standalone journey.
8. **Valuables threshold wording:** the client and partner questions say “£500 or more”, while the relevance-validation error says “more than £500”; the amount validation uses a £500-or-more threshold. Confirm the intended boundary wording.
