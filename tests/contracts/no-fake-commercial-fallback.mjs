import fs from 'node:fs';
import assert from 'node:assert/strict';

const roots = ['src', 'apps/lovable/src', 'apps/studio/src'];
const activeRuntimeFiles = [];
const violations = [];

for (const root of roots) {
  const appFile = `${root}/App.tsx`;
  if (!fs.existsSync(appFile)) continue;

  const appSource = fs.readFileSync(appFile, 'utf8');
  assert.match(
    appSource,
    /from ['"]\.\/views\/ExecutiveDashboardP0['"]/,
    `${appFile} must route the executive screen through ExecutiveDashboardP0`,
  );
  assert.doesNotMatch(
    appSource,
    /from ['"]\.\/views\/ExecutiveDashboard['"]/,
    `${appFile} must not import the legacy ExecutiveDashboard runtime`,
  );

  for (const file of [
    `${root}/views/ExecutiveDashboardP0.tsx`,
    `${root}/hooks/useExecutiveDashboardP0.ts`,
    `${root}/services/executiveServiceP0.ts`,
  ]) {
    assert.ok(fs.existsSync(file), `${file} must exist`);
    activeRuntimeFiles.push(file);
  }
}

assert.ok(activeRuntimeFiles.length > 0, 'Expected P0 Executive Dashboard runtime files to exist');

const forbiddenPatterns = [
  { pattern: /fallbackKpis/, reason: 'Executive KPI cards must not fall back to seeded commercial KPIs' },
  { pattern: /getFallbackExecutiveData\s*\(/, reason: 'Executive runtime must not manufacture fallback commercial data' },
  { pattern: /['"]mock_fallback['"]/, reason: 'Runtime status must not expose a mock fallback data mode' },
  { pattern: /retentionRate\s*:\s*88\.4/, reason: 'Seeded retention values are forbidden in runtime code' },
  { pattern: /rowsSynced\s*:\s*15209/, reason: 'Seeded sync row counts are forbidden in runtime code' },
  { pattern: /\|\|\s*15209/, reason: 'Seeded sync row-count fallbacks are forbidden in runtime code' },
  { pattern: /Demo Data|بيانات توضيحية|Mock Fallback/i, reason: 'Active executive runtime must fail closed, not present demo business data' },
];

for (const file of activeRuntimeFiles) {
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
