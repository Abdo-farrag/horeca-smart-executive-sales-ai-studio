import assert from 'node:assert/strict';
import fs from 'node:fs';

const anonHardeningPath = 'supabase/migrations/20260903040000_p1_rls_grants_hardening.sql';
const publicHardeningPath = 'supabase/migrations/20260903050000_p1_public_execute_hardening.sql';

assert.ok(fs.existsSync(anonHardeningPath), 'P1 anon hardening migration is required');
assert.ok(fs.existsSync(publicHardeningPath), 'P1 PUBLIC privilege hardening migration is required');

const anonSql = fs.readFileSync(anonHardeningPath, 'utf8');
const publicSql = fs.readFileSync(publicHardeningPath, 'utf8');

assert.match(anonSql, /proname\s+like\s+'analytics\\_%'/i, 'Hardening must enumerate the legacy analytics_* function family');
assert.match(anonSql, /revoke\s+execute\s+on\s+function/i, 'Hardening must revoke direct function execution');
assert.match(anonSql, /from\s+anon/i, 'Legacy analytics execution must be revoked from anon');
assert.doesNotMatch(
  anonSql,
  /revoke\s+execute[\s\S]{0,120}?from\s+authenticated/i,
  'Release-candidate hardening must not revoke authenticated analytics before scoped replacements exist'
);

assert.match(publicSql, /grant\s+execute\s+on\s+function[\s\S]{0,120}?to\s+authenticated/i, 'Authenticated must receive explicit EXECUTE before PUBLIC is revoked');
assert.match(publicSql, /revoke\s+execute\s+on\s+function[\s\S]{0,120}?from\s+public/i, 'Inherited PUBLIC analytics execution must be revoked');
assert.match(publicSql, /revoke\s+execute\s+on\s+function[\s\S]{0,120}?from\s+anon/i, 'Anon analytics execution must be revoked explicitly');
assert.doesNotMatch(
  publicSql,
  /revoke\s+execute[\s\S]{0,120}?from\s+authenticated/i,
  'Authenticated compatibility access must remain available in this release candidate'
);

console.log('✓ Legacy analytics execution hardening contract passed');
