import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260903040000_p1_rls_grants_hardening.sql';
assert.ok(fs.existsSync(migrationPath), 'P1 grants hardening migration is required');
const sql = fs.readFileSync(migrationPath, 'utf8');

assert.match(sql, /proname\s+like\s+'analytics\\_%'/i, 'Hardening must enumerate the legacy analytics_* function family');
assert.match(sql, /revoke\s+execute\s+on\s+function/i, 'Hardening must revoke direct function execution');
assert.match(sql, /from\s+anon/i, 'Legacy analytics execution must be revoked from anon');
assert.match(sql, /from\s+authenticated/i, 'Legacy analytics execution must be revoked from authenticated browser users');
assert.match(sql, /SECURE_APP_ENTRYPOINTS_AFTER_LEGACY_REVOKE/i, 'Migration must explicitly separate secure app entrypoints from legacy functions');

console.log('✓ No direct legacy analytics execute contract passed');
