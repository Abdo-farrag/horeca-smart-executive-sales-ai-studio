import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtimeFiles = [
  'src/hooks/useExecutiveDashboard.ts',
  'src/services/executiveService.ts',
  'src/views/ExecutiveDashboard.tsx',
  'src/context/AppContext.tsx',
  'src/types.ts',
  'apps/lovable/src/hooks/useExecutiveDashboard.ts',
  'apps/lovable/src/services/executiveService.ts',
  'apps/lovable/src/views/ExecutiveDashboard.tsx',
  'apps/studio/src/hooks/useExecutiveDashboard.ts',
  'apps/studio/src/services/executiveService.ts',
  'apps/studio/src/views/ExecutiveDashboard.tsx',
].filter((file) => fs.existsSync(file));

assert.ok(runtimeFiles.length > 0, 'Expected runtime files to scan');

const forbidden = [
  /INITIAL_LATEST_DATA_DATE\s*=\s*['"]20\d{2}-\d{2}-\d{2}['"]/,
  /(?:maxOrderDate|lastSuccessfulSyncAt)\s*:\s*[^\n]*\|\|\s*['"]20\d{2}-\d{2}-\d{2}/,
  /(?:maxOrderDate|lastSuccessfulSyncAt)\s*\?\?\s*['"]20\d{2}-\d{2}-\d{2}/,
  /(?:DEFAULT_START_DATE|DEFAULT_END_DATE)\s*=\s*['"]20\d{2}-\d{2}-\d{2}['"]/,
];

const violations = [];
for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
  }
}

assert.deepEqual(
  violations,
  [],
  `Hardcoded runtime sales-date violations:\n${violations.map((v) => `- ${v}`).join('\n')}`,
);

console.log('✓ No hardcoded runtime sales date contract passed');
