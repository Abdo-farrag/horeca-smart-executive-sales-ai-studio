import assert from 'node:assert/strict';
import fs from 'node:fs';

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

const migrationPath = 'supabase/migrations/20260903030000_p1_scoped_analytics_rpcs.sql';
assert.ok(fs.existsSync(migrationPath), 'Central scope resolver/scoped RPC migration is required');
const sql = fs.readFileSync(migrationPath, 'utf8');

for (const fn of ['authorized_salesperson_ids', 'authorized_company_ids', 'can_manage_users', 'can_view_executive']) {
  assert.match(sql, new RegExp(`function\\s+public\\.${fn}\\s*\\(`, 'i'), `Missing ${fn}()`);
}

assert.match(sql, /INVALID_SALES_REP_SCOPE/i, 'Sales Rep with missing company/salesperson mapping must fail closed');
assert.match(sql, /INVALID_SUPERVISOR_SCOPE/i, 'Supervisor with missing company/team mapping must fail closed');
assert.match(sql, /ARRAY\[1::bigint,\s*2::bigint\]/i, 'Manager/Admin company scope must be exactly MAS + Horeca Smart');

console.log('✓ Role scope contract passed');
