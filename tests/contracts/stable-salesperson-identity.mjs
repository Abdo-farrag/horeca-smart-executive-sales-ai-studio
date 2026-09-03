import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'supabase/migrations/20260903020000_p1_salesperson_identity.sql';
assert.ok(fs.existsSync(path), 'Stable salesperson identity migration is required');

const sql = fs.readFileSync(path, 'utf8');
assert.match(sql, /salesperson_id\s+bigint/i, 'Secure order analytics must expose salesperson_id bigint');
assert.match(sql, /id_count\s*=\s*1/i, 'Name fallback may only resolve through a globally unique master name-to-ID mapping');
assert.match(sql, /identity_source/i, 'Identity normalization must expose its source for QA');
assert.doesNotMatch(sql, /where\s+[^;]*authorized[^;]*salesperson\s*=/i, 'Authorization must never compare trusted scope to salesperson text');

console.log('✓ Stable salesperson identity contract passed');
