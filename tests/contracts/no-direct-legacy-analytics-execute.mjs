import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260903040000_p1_rls_grants_hardening.sql';
assert.ok(fs.existsSync(migrationPath), 'P1 grants hardening migration is required');
const sql = fs.readFileSync(migrationPath, 'utf8');

assert.match(sql, /proname\s+like\s+'analytics\\_%'/i, 'Hardening must enumerate the legacy analytics_* function family');
assert.match(sql, /revoke\s+execute\s+on\s+function/i, 'Hardening must revoke direct function execution');
assert.match(sql, /from\s+anon/i, 'Legacy analytics execution must be revoked from anon');
assert.doesNotMatch(
  sql,
  /revoke\s+execute[\s\S]{0,120}?from\s+authenticated/i,
  'Release-candidate hardening must not revoke authenticated analytics before scoped replacements exist'
);
assert.match(
  sql,
  /authenticated access remains unchanged/i,
  'Migration must explicitly document the temporary authenticated compatibility boundary'
);
assert.match(
  sql,
  /later migration must move each screen to DB-scoped entrypoints/i,
  'Migration must explicitly preserve the remaining DB-scoped authorization gate'
);

console.log('✓ Anonymous legacy analytics execution hardening contract passed');
