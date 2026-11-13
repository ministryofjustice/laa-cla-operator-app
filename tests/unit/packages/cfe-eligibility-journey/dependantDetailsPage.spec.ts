import { expect } from 'chai'
import { eligibilityJourney } from '#packages/cfe-eligibility-journey/src/journey.js'
import { CONTROLLED_WORK_STEP_CODES as STEPS } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkTypes.js'
import { controlledWorkIncompleteStep } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkIncompleteStep.js'
import { isValidControlledWorkAnswer } from '#packages/cfe-eligibility-journey/src/controlledWork/controlledWorkSteps.js'
import { eligibilityQuestionPageLayout } from '#packages/cfe-eligibility-journey/src/eligibilityQuestionPageLayout.js'
import {
  adultDependantsCountField,
  adultDependantsField,
  childDependantsCountField,
  childDependantsField,
  dependantDetailsPageContent,
} from '#packages/cfe-eligibility-journey/src/dependantDetailsPage/dependantDetailsBlock.js'
import { dependantDetailsStep } from '#packages/cfe-eligibility-journey/src/dependantDetailsPage/dependantDetailsStep.js'

const ZERO_DEPENDANTS = 0
const ONE_DEPENDANT = 1
const TWELVE_DEPENDANTS = 12

describe('Controlled-work dependant details page', () => {
  it('follows applicant and uses the shared eligibility form and layout', () => {
    const steps = eligibilityJourney.steps ?? []
    const applicantIndex = steps.findIndex(({ code }) => code === STEPS.applicant)
    const dependantIndex = steps.findIndex(({ code }) => code === STEPS.dependantDetails)

    expect(dependantIndex).to.be.greaterThan(applicantIndex)
    expect(dependantDetailsStep.path).to.equal('/dependant-details')
    expect(dependantDetailsStep.title).to.equal("Tell us about your client's dependants")
    expect(dependantDetailsStep.view?.template).to.equal('case_details/forge_forms/eligibility-question-form')
    expect(JSON.stringify(dependantDetailsStep.reachability)).to.include(STEPS.dependantDetails)
    expect(JSON.stringify(controlledWorkIncompleteStep.onAccess)).to.include(STEPS.dependantDetails)

    const content = JSON.stringify(dependantDetailsPageContent)
    const sharedLayout = JSON.stringify(eligibilityQuestionPageLayout({ questionBlocks: [], guidanceBlocks: [] }))
    expect(content).to.include('"level":2')
    expect(content).to.include('"text":"Guidance"')
    expect(content).to.include('"text":"Save and continue"')
    expect(sharedLayout).to.include('"width":"two-thirds"')
    expect(sharedLayout).to.include('"width":"one-third"')
  })

  it('uses the exact CCQ child/adult Yes/No fields and required errors', () => {
    expect(childDependantsField.code).to.equal('child-dependants')
    expect(JSON.stringify(childDependantsField)).to.include('Does your client have any child dependants?')
    expect(JSON.stringify(childDependantsField)).to.include('Does your client or their partner have any child dependants?')
    expect(JSON.stringify(childDependantsField)).to.include('Select yes if your client has child dependants')

    expect(adultDependantsField.code).to.equal('adult-dependants')
    expect(JSON.stringify(adultDependantsField)).to.include('Does your client have any adult dependants?')
    expect(JSON.stringify(adultDependantsField)).to.include('Does your client or their partner have any adult dependants?')
    expect(JSON.stringify(adultDependantsField)).to.include('Select yes if your client has adult dependants')

    for (const field of [childDependantsField, adultDependantsField]) {
      expect(field.items).to.deep.equal([
        { value: 'yes', text: 'Yes', hint: { text: 'If yes, enter a number', classes: 'govuk-visually-hidden' } },
        { value: 'no', text: 'No' },
      ])
    }

    for (const code of ['child-dependants', 'adult-dependants'] as const) {
      expect(isValidControlledWorkAnswer(code, 'yes')).to.equal(true)
      expect(isValidControlledWorkAnswer(code, 'no')).to.equal(true)
      for (const invalid of ['', undefined, null, 'true', 'false', 'maybe', true, false]) {
        expect(isValidControlledWorkAnswer(code, invalid)).to.equal(false)
      }
    }
  })

  it('shows each count only for Yes and applies the CCQ required, numeric, whole-number and positive rules', () => {
    const countFields = [
      {
        field: childDependantsCountField,
        answerCode: 'child-dependants',
        label: 'How many child dependants are there?',
        errors: [
          'Enter the number of child dependants',
          'Child dependants must be a number',
          'Child dependants must be a whole number',
          'The number of child dependants must be greater than zero',
        ],
        answerCodeCount: 'child-dependants-count',
      },
      {
        field: adultDependantsCountField,
        answerCode: 'adult-dependants',
        label: 'How many adult dependants are there?',
        errors: [
          'Enter the number of adult dependants',
          'Adult dependants must be a number',
          'Adult dependants must be a whole number',
          'The number of adult dependants must be greater than zero',
        ],
        answerCodeCount: 'adult-dependants-count',
      },
    ] as const

    for (const { field, answerCode, answerCodeCount, label, errors } of countFields) {
      expect(field.code).to.equal(answerCodeCount)
      expect(field.label).to.equal(label)
      expect(field.inputType).to.equal('text')
      expect(JSON.stringify(field.visibleWhen)).to.include(answerCode)
      for (const error of errors) expect(JSON.stringify(field.validWhen)).to.include(error)
      expect(JSON.stringify(field.validWhen)).to.include('IsRequired')
    }

    for (const code of ['child-dependants-count', 'adult-dependants-count'] as const) {
      expect(isValidControlledWorkAnswer(code, ONE_DEPENDANT)).to.equal(true)
      expect(isValidControlledWorkAnswer(code, String(TWELVE_DEPENDANTS))).to.equal(true)
      for (const invalid of [ZERO_DEPENDANTS, '0', '000', '-1', '1.0', '1.5', 'not a number', true, null]) {
        expect(isValidControlledWorkAnswer(code, invalid)).to.equal(false)
      }
    }
  })

  it('includes exact CCQ guidance content and the controlled-work dependants link', () => {
    const content = JSON.stringify(dependantDetailsPageContent)

    expect(content).to.include("Tell us about your client's dependants")
    expect(content).to.include("Tell us about your client and their partner's dependants")
    expect(content).to.include('Do not include any dependants with £381.86 or more income every month')
    expect(content).to.include('A child dependant must be either under school leaving age, in full-time education, or undergoing training for a trade, profession or vocation.')
    expect(content).to.include('foster children (where the fostering allowance for that child has been wholly disregarded from gross income)')
    expect(content).to.include('anyone who owns any property, vehicles or other assets valued at over £8,000 in total')
    expect(content).to.include('anyone with £381.86 or more income every month')
    expect(content).to.include('Dependants (PDF, 599KB)')
    expect(content).to.include('#page=22')
    expect(JSON.stringify(dependantDetailsStep.onSubmission)).to.include('SaveControlledWorkAnswers')
    expect(JSON.stringify(dependantDetailsStep.onSubmission)).to.include('controlled-work-incomplete')
  })
})
