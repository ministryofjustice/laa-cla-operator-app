import { expect } from 'chai';
import { propertySet } from '#packages/financial-eligibility-journey/src/propertiesPage/propertiesBlock.js';
import { propertySet as propertySetPartner } from '#packages/financial-eligibility-journey/src/propertiesPageWithPartner/propertiesBlockPartner.js';
import { MAX_MONEY_VALUE_MESSAGE } from '#packages/financial-eligibility-journey/src/moneyFieldHelpers.js';

interface FieldLike {
  validWhen?: unknown;
}

interface CollectionBlockLike {
  collection: {
    iterator: {
      yield: FieldLike[];
    };
  };
}

// Properties fields aren't individually exported (they're built inline inside the
// CollectionBlock's Iterator.Map template), so tests read them off the built array instead.
const MARKET_VALUE_FIELD_INDEX = 1;
const MORTGAGE_LEFT_FIELD_INDEX = 2;

/**
 * Reads the `message` off each `validWhen` rule on a field, in declaration order.
 * @param {FieldLike} field The field to read validation messages from
 * @returns {unknown[]} The `message` value of each validation rule, in order
 */
function validationMessages(field: FieldLike): unknown[] {
  if (!Array.isArray(field.validWhen)) {
    return [];
  }
  return field.validWhen.map((rule) => (rule as { message?: unknown }).message);
}

/**
 * Asserts a property money field has the shared max-value validation as its 4th rule.
 * @param {string} name The field's display name for the test description
 * @param {CollectionBlockLike} collectionBlock The propertySet block to read the field from
 * @param {number} fieldIndex The field's position within the Iterator.Map template
 * @returns {void}
 */
function itHasMaxValueValidation(name: string, collectionBlock: CollectionBlockLike, fieldIndex: number): void {
  it(`rejects amounts over the maximum allowed value for ${name}`, () => {
    const field = collectionBlock.collection.iterator.yield[fieldIndex];
    const messages = validationMessages(field);
    expect(messages).to.have.length(4);
    expect(messages[3]).to.equal(MAX_MONEY_VALUE_MESSAGE);
  });
}

describe('Properties fields', () => {
  itHasMaxValueValidation('market value', propertySet as unknown as CollectionBlockLike, MARKET_VALUE_FIELD_INDEX);
  itHasMaxValueValidation('mortgage left', propertySet as unknown as CollectionBlockLike, MORTGAGE_LEFT_FIELD_INDEX);
});

describe('Partner properties fields', () => {
  itHasMaxValueValidation('market value', propertySetPartner as unknown as CollectionBlockLike, MARKET_VALUE_FIELD_INDEX);
  itHasMaxValueValidation('mortgage left', propertySetPartner as unknown as CollectionBlockLike, MORTGAGE_LEFT_FIELD_INDEX);
});
