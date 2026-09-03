import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = 'supabase/migrations';
const p1Files = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((name) => /^20260903.*_p1_.*\.sql$/i.test(name))
  : [];

assert.ok(p1Files.length > 0, 'P1 security migrations must exist before authorization can be considered implemented');

for (const name of p1Files) {
  const sql = fs.readFileSync(path.join(dir, name), 'utf8');
  assert.doesNotMatch(
    sql,
    /grant\s+execute\s+on\s+function[\s\S]{0,300}\s+to\s+anon\b/i,
    `${name} grants commercial function execution to anon`
  );
}

console.log(`✓ No-anon commercial RPC contract passed (${p1Files.length} P1 migrations scanned)`);
