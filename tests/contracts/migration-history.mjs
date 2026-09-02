import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
assert.ok(fs.existsSync(migrationsDir), 'supabase/migrations directory must exist');

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
assert.ok(files.length > 0, 'Must contain at least one migration');

const filesByHash = new Map();
for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file));
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const existing = filesByHash.get(hash) || [];
  existing.push(file);
  filesByHash.set(hash, existing);
}

const duplicateGroups = [...filesByHash.values()].filter(group => group.length > 1);
assert.deepEqual(
  duplicateGroups,
  [],
  `Duplicate migration contents detected:\n${duplicateGroups.map(group => `- ${group.join(' = ')}`).join('\n')}`,
);

console.log(`✓ Migration history contract passed: ${files.length} unique migrations found`);
