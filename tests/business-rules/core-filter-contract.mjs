import assert from 'node:assert/strict';
import { isEnterpriseScope, normalizeCompanyName, normalizeSalesperson } from '../../packages/core/src/business-rules/nullSemantics.ts';

assert.equal(isEnterpriseScope('All'), true);
assert.equal(isEnterpriseScope(null), true);
assert.equal(isEnterpriseScope('MAS'), false);
assert.equal(normalizeCompanyName('All'), null);
assert.equal(normalizeCompanyName('MAS'), 'MAS');
assert.equal(normalizeSalesperson('All'), null);
assert.equal(normalizeSalesperson('Ahmed'), 'Ahmed');

console.log('✓ Core filter business rules contract passed');
