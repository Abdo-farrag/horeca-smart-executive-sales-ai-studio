import assert from 'node:assert/strict';

const scopes = {
  sales_rep: { ownRep: true, ownTeam: false, allCompanies: false, manageUsers: false },
  supervisor: { ownRep: false, ownTeam: true, allCompanies: false, manageUsers: false },
  manager: { ownRep: false, ownTeam: false, allCompanies: true, manageUsers: false },
  admin: { ownRep: false, ownTeam: false, allCompanies: true, manageUsers: true },
};

assert.deepEqual(Object.keys(scopes), ['sales_rep', 'supervisor', 'manager', 'admin']);
assert.equal(scopes.sales_rep.ownRep, true);
assert.equal(scopes.sales_rep.allCompanies, false);
assert.equal(scopes.supervisor.ownTeam, true);
assert.equal(scopes.supervisor.allCompanies, false);
assert.equal(scopes.manager.allCompanies, true);
assert.equal(scopes.manager.manageUsers, false);
assert.equal(scopes.admin.allCompanies, true);
assert.equal(scopes.admin.manageUsers, true);

console.log('✓ Role scope contract passed');
