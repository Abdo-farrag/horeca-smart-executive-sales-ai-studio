import fs from 'node:fs';
import assert from 'node:assert/strict';

const roots = ['src', 'apps/lovable/src', 'apps/studio/src'];
const violations = [];

for (const root of roots) {
  const appFile = `${root}/App.tsx`;
  const viewFile = `${root}/views/ExecutiveDashboard.tsx`;
  const hookFile = `${root}/hooks/useExecutiveDashboard.ts`;
  const serviceFile = `${root}/services/executiveService.ts`;

  for (const file of [appFile, viewFile, hookFile, serviceFile]) {
    assert.ok(fs.existsSync(file), `${file} must exist`);
  }

  const appSource = fs.readFileSync(appFile, 'utf8');
  assert.match(appSource, /from ['"]\.\/views\/ExecutiveDashboard['"]/, `${appFile} must preserve the existing ExecutiveDashboard route`);
  assert.doesNotMatch(appSource, /ExecutiveDashboardP0/, `${appFile} must not route to a reduced replacement dashboard`);

  const activeSources = [viewFile, hookFile, serviceFile].map((file) => [file, fs.readFileSync(file, 'utf8')]);
  const forbiddenPatterns = [
    [/fallbackKpis/, 'Executive KPI cards must not fall back to seeded context KPIs'],
    [/getFallbackExecutiveData\s*\(/, 'Executive service must not manufacture fallback commercial data'],
    [/status\s*:\s*['"]mock_fallback['"]|\?\s*['"]mock_fallback['"]|:\s*['"]mock_fallback['"]/, 'Executive status must not emit mock fallback mode'],
    [/retentionRate\s*:\s*88\.4/, 'Seeded retention values are forbidden'],
    [/rowsSynced\s*:\s*15209|\|\|\s*15209/, 'Seeded sync row counts are forbidden'],
    [/dataMode\s*:\s*['"]Mock fallback['"]|Mock Fallback Mode|Demo Data|\[SECTION STATUS:[^\]]*Mock/, 'Executive runtime must not present mock business data'],
    [/AuditDiagnosticsPanel/, 'Audit diagnostics must not render in the Executive Dashboard'],
  ];

  for (const [file, source] of activeSources) {
    for (const [pattern, reason] of forbiddenPatterns) {
      if (pattern.test(source)) violations.push(`${file}: ${reason}`);
    }
  }
}

assert.deepEqual(violations, [], `Executive fail-closed violations:\n${violations.map((v) => `- ${v}`).join('\n')}`);
console.log('✓ Executive commercial fallback safety contract passed');
