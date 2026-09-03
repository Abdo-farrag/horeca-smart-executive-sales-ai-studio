import assert from 'node:assert/strict';
import fs from 'node:fs';

const required = [
  'src/context/AccessContext.tsx',
  'src/access/viewCapabilities.ts',
  'apps/lovable/src/context/AccessContext.tsx',
  'apps/lovable/src/access/viewCapabilities.ts',
  'apps/studio/src/context/AccessContext.tsx',
  'apps/studio/src/access/viewCapabilities.ts',
];

for (const file of required) {
  assert.ok(fs.existsSync(file), `Missing access parity file: ${file}`);
}

console.log('✓ Access parity contract passed');
