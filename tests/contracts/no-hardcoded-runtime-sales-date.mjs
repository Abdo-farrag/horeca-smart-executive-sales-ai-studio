import fs from 'node:fs';
import assert from 'node:assert/strict';

const roots = ['src', 'apps/lovable/src', 'apps/studio/src'];
const runtimeFiles = [];

for (const root of roots) {
  for (const file of [
    `${root}/views/ExecutiveDashboard.tsx`,
    `${root}/hooks/useExecutiveDashboard.ts`,
    `${root}/services/executiveService.ts`,
    `${root}/context/AppContext.tsx`,
    `${root}/views/CustomerActionCenter.tsx`,
    `${root}/views/SalesRepDailyActionCenter.tsx`,
  ]) {
    if (fs.existsSync(file)) runtimeFiles.push(file);
  }
}

const forbidden = [
  /INITIAL_LATEST_DATA_DATE\s*=\s*['"]20\d{2}-\d{2}-\d{2}['"]/,
  /(?:maxOrderDate|lastSuccessfulSyncAt)\s*:\s*[^\n]*\|\|\s*['"]20\d{2}-\d{2}-\d{2}/,
  /(?:maxOrderDate|lastSuccessfulSyncAt)\s*\?\?\s*['"]20\d{2}-\d{2}-\d{2}/,
  /(?:DEFAULT_START_DATE|DEFAULT_END_DATE)\s*=\s*['"]20\d{2}-\d{2}-\d{2}['"]/,
  /freshnessInfo\?\.(?:maxOrderDate|lastSuccessfulSyncAt)\s*\|\|\s*['"]20\d{2}-\d{2}-\d{2}/,
  /asOfDate\s*:\s*['"]20\d{2}-\d{2}-\d{2}['"]/,
];

const violations = [];
for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
  }
}

assert.deepEqual(violations, [], `Hardcoded runtime sales-date violations:\n${violations.map((v) => `- ${v}`).join('\n')}`);
console.log('✓ No hardcoded runtime sales date contract passed');
