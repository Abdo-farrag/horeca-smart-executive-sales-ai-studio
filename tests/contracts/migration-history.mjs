import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
assert.ok(fs.existsSync(migrationsDir), 'supabase/migrations directory must exist');

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
assert.ok(files.length > 0, 'Must contain at least one migration');

console.log(`✓ Migration history contract passed: ${files.length} migrations found`);
