// The answer keys each step saves to the session, keyed by step code.
//
// This has no equivalent in CCQ: CCQ's `Steps::Helper` only ever needs step
// codes, because its own session data is shaped like its own steps (see the
// comment on `relevantAnswers` in navigation.ts). This module exists so that
// module can filter answers down to the currently relevant ones before
// building a CFE payload.
//
// Compiled from CCQ's `Flow::Handler::STEPS` (app/controllers/flow/handler.rb),
// which maps each step code to a form class, combined with that form's
// `ATTRIBUTES` and how `SessionPersistable` turns them into session keys:
//
// - A plain form's session keys are its `ATTRIBUTES`, unchanged.
// - A `SessionPersistableForPartner` form (`partner_*_form.rb`) prefixes
//   every attribute with `partner_` (`SessionPersistableWithPrefix`,
//   PREFIX = "partner_").
// - `AdditionalPropertyForm` and `PartnerAdditionalPropertyForm` do the same
//   with "additional_" and "partner_additional_" (they extend `PropertyForm`
//   via `SessionPersistableWithPrefix` directly).
// - An `AddAnotherable` form (the add-another lists) stores its rows under
//   `ITEMS_SESSION_KEY`, not under its own `ATTRIBUTES` name, e.g. `income`
//   saves to `incomes`, `assets` saves `bank_accounts` alongside its own
//   simple attributes.
//
// Pinned at the same CCQ commit as logic.ts and the section ports (1a30ea3f).
//
// `date_of_birth` and `partner_date_of_birth` are not from CCQ: CCQ only
// collects an age bracket (`client_age`, `partner_over_60`) and fakes a date
// of birth for CFE. This reusable component collects a real date of birth
// instead, so the CFE payload builders (domain/cfe/) can pass it straight
// through rather than synthesising one (see the CFE payload builders plan).
export const STEP_ANSWER_KEYS: Readonly<Record<string, readonly string[]>> = {
  client_age: ["client_age", "date_of_birth"],
  level_of_help: ["level_of_help"],
  under_18_clr: ["controlled_legal_representation"],
  aggregated_means: ["aggregated_means"],
  how_to_aggregate: [], // HowToAggregateForm has no attributes of its own
  regular_income: ["regular_income"],
  under_eighteen_assets: ["under_eighteen_assets"],
  domestic_abuse_applicant: ["domestic_abuse_applicant"],
  immigration_or_asylum: ["immigration_or_asylum"],
  immigration_or_asylum_type: ["immigration_or_asylum_type"],
  immigration_or_asylum_type_upper_tribunal: [
    "immigration_or_asylum_type_upper_tribunal",
  ],
  asylum_support: ["asylum_support"],
  applicant: ["partner", "passporting"],
  dependant_details: [
    "child_dependants",
    "child_dependants_count",
    "adult_dependants",
    "adult_dependants_count",
  ],
  dependant_income: ["dependants_get_income"],
  dependant_income_details: ["dependant_incomes"],
  employment_status: ["employment_status"],
  income: ["incomes"],
  benefits: ["receives_benefits"],
  benefit_details: ["benefits"],
  other_income: [
    "friends_or_family_relevant",
    "friends_or_family_conditional_value",
    "friends_or_family_frequency",
    "maintenance_relevant",
    "maintenance_conditional_value",
    "maintenance_frequency",
    "property_or_lodger_relevant",
    "property_or_lodger_conditional_value",
    "property_or_lodger_frequency",
    "pension_relevant",
    "pension_conditional_value",
    "pension_frequency",
    "student_finance_relevant",
    "student_finance_conditional_value",
    "other_relevant",
    "other_conditional_value",
  ],
  outgoings: [
    "childcare_payments_relevant",
    "childcare_payments_conditional_value",
    "childcare_payments_value",
    "childcare_payments_frequency",
    "maintenance_payments_relevant",
    "maintenance_payments_conditional_value",
    "maintenance_payments_value",
    "maintenance_payments_frequency",
    "legal_aid_payments_relevant",
    "legal_aid_payments_conditional_value",
    "legal_aid_payments_value",
    "legal_aid_payments_frequency",
  ],
  property: ["property_owned"],
  property_landlord: ["property_landlord"],
  property_entry: ["house_value", "mortgage", "percentage_owned", "house_in_dispute"],
  vehicle: ["vehicle_owned"],
  vehicles_details: ["vehicles"],
  assets: [
    "investments",
    "valuables",
    "investments_relevant",
    "valuables_relevant",
    "investments_in_dispute",
    "valuables_in_dispute",
    "bank_accounts",
  ],
  partner_details: ["partner_over_60", "partner_date_of_birth"],
  partner_employment_status: ["partner_employment_status"],
  partner_income: ["partner_incomes"],
  partner_benefits: ["partner_receives_benefits"],
  partner_benefit_details: ["partner_benefits"],
  partner_other_income: [
    "partner_friends_or_family_relevant",
    "partner_friends_or_family_conditional_value",
    "partner_friends_or_family_frequency",
    "partner_maintenance_relevant",
    "partner_maintenance_conditional_value",
    "partner_maintenance_frequency",
    "partner_property_or_lodger_relevant",
    "partner_property_or_lodger_conditional_value",
    "partner_property_or_lodger_frequency",
    "partner_pension_relevant",
    "partner_pension_conditional_value",
    "partner_pension_frequency",
    "partner_student_finance_relevant",
    "partner_student_finance_conditional_value",
    "partner_other_relevant",
    "partner_other_conditional_value",
  ],
  partner_outgoings: [
    "partner_childcare_payments_relevant",
    "partner_childcare_payments_conditional_value",
    "partner_childcare_payments_value",
    "partner_childcare_payments_frequency",
    "partner_maintenance_payments_relevant",
    "partner_maintenance_payments_conditional_value",
    "partner_maintenance_payments_value",
    "partner_maintenance_payments_frequency",
    "partner_legal_aid_payments_relevant",
    "partner_legal_aid_payments_conditional_value",
    "partner_legal_aid_payments_value",
    "partner_legal_aid_payments_frequency",
  ],
  partner_assets: [
    "partner_investments",
    "partner_valuables",
    "partner_investments_relevant",
    "partner_valuables_relevant",
    "partner_bank_accounts",
  ],
  housing_costs: [
    "housing_benefit_value",
    "housing_benefit_frequency",
    "housing_benefit_relevant",
    "housing_payments",
    "housing_payments_frequency",
  ],
  shared_ownership_housing_costs: [
    "housing_benefit_value",
    "housing_benefit_frequency",
    "housing_benefit_relevant",
    "shared_ownership_mortgage",
    "rent",
    "combined_frequency",
  ],
  mortgage_or_loan_payment: ["housing_loan_payments", "housing_payments_loan_frequency"],
  additional_property: ["additional_property_owned"],
  additional_property_details: ["additional_properties"],
  partner_additional_property: ["partner_additional_property_owned"],
  partner_additional_property_details: ["partner_additional_properties"],
};
