import * as fs from 'node:fs';
import * as path from 'node:path';

function runAudit() {
  console.log('--- Monorepo Merge Audit ---');
  const required = [
    'apps/studio',
    'apps/lovable',
    'packages/core',
    'supabase',
    'tests',
    '.github/workflows/ci.yml',
    'package.json',
    'tsconfig.base.json',
    'README.md',
  ];

  let ok = true;
  for (const item of required) {
    const exists = fs.existsSync(path.resolve(process.cwd(), item));
    console.log(`[${exists ? 'OK' : 'FAIL'}] ${item}`);
    if (!exists) ok = false;
  }

  if (!ok) {
    process.exit(1);
  }
  console.log('--- Audit Passed Successfully ---');
}

runAudit();
