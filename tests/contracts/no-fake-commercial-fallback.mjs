import fs from 'node:fs';
import assert from 'node:assert/strict';

const criticalRuntimeFiles = [
  'src/hooks/useExecutiveDashboard.ts',
  'src/services/executiveService.ts',
  'src/views/ExecutiveDashboard.tsx',
  'apps/lovable/src/hooks/useExecutiveDashboard.ts',
  'apps/lovable/src/services/executiveService.ts',
  'apps/lovable/src/views/ExecutiveDashboard.tsx',
  'apps/studio/src/hooks/useExecutiveDashboard.ts',
  'apps/studio/src/services/executiveService.ts',
  'apps/studio/src/views/ExecutiveDashboard.tsx',
].filter((file) => fs.existsSync(file));

assert.ok(criticalRuntimeFiles.length > 0, 'Expected Executive Dashboard runtime files to exist');

const forbiddenPatterns = [
  { pattern: /fallbackKpis/, reason: 'Executive KPI cards must not fall back to seeded commercial KPIs' },
  { pattern: /getFallbackExecutiveData\s*\(/, reason: 'Executive service must not manufacture fallback commercial data' },
  { pattern: /['"]mock_fallback['"]/, reason: 'Runtime status must not expose a mock fallback data mode' },
  { pattern: /retentionRate\s*:\s*88\.4/, reason: 'Seeded retention values are forbidden in runtime code' },
  { pattern: /rowsSynced\s*:\s*15209/, reason: 'Seeded sync row counts are forbidden in runtime code' },
  { pattern: /\|\|\s*15209/, reason: 'Seeded sync row-count fallbacks are forbidden in runtime code' },
];

const violations = [];
for (const file of criticalRuntimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const { pattern, reason } of forbiddenPatterns) {
    if (pattern.test(source)) violations.push(`${file}: ${reason}`);
  }
}

assert.deepEqual(
  violations,
  [],
  `Fake commercial fallback contract violations:\n${violations.map((v) => `- ${v}`).join('\n')}`,
);

console.log('✓ No fake commercial fallback contract passed');
