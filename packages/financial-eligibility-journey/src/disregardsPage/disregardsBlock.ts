import { Self, Condition, validation } from '@ministryofjustice/hmpps-forge/core/authoring'
import { GovUKHeading, GovUKCheckboxInput, GovUKUtilityClasses } from '@ministryofjustice/hmpps-forge/govuk-components'

export const disregardsHeading = GovUKHeading({
  text: 'Disregards',
  size: 'm',
})

// Value and Label pairs used by check answers and the disregards step
export const disregardsLookupItems = [
  { value: 'benefit_payments', text: 'Backdated benefit payments' },
  { value: 'child_maintenance', text: 'Backdated child maintenance payments' },
  { value: 'energy_prices', text: 'The Energy Support Scheme payments (2022 and 2023)' },
  { value: 'cost_living', text: 'Cost of living payments' },
  { value: 'infected_blood', text: 'Infected Blood Support Scheme' },
  { value: 'criminal_injuries', text: 'Criminal Injuries Compensation Scheme' },
  { value: 'grenfell_tower', text: 'Grenfell Tower compensation' },
  { value: 'modern_slavery', text: 'Modern Slavery Victim Care Contract or National Referral Mechanism (NRM)' },
  { value: 'national_emergencies', text: 'National emergencies trust' },
  { value: 'london_emergencies', text: 'London Emergencies Trust' },
  { value: 'vcjd_trust', text: 'vCJD Trust' },
  { value: 'vaccine_damage', text: 'Vaccine damage payment' },
  { value: 'overseas_terrorism', text: 'Victims of Overseas Terrorism Compensation Scheme (VOTCS)' },
  { value: 'child_abuse', text: 'Scotland and Northern Ireland redress schemes for historical child abuse' },
  { value: 'justice_compensation', text: 'Miscarriage of justice compensation' },
  { value: 'love_manchester', text: 'We Love Manchester Emergency Fund' },
  { divider: 'or' },
  { value: 'none', text: 'None', behaviour: 'exclusive' as const },
]

export const disregardsField = GovUKCheckboxInput({
  code: 'disregards',
  hint: 'Select all that apply',
  classes: GovUKUtilityClasses.Checkboxes.Small,
  items: disregardsLookupItems,
  validWhen: [
    validation({
      condition: Self().match(Condition.IsRequired()),
      message: 'Select all disregards that apply or select \'None\'',
    }),
  ],
})