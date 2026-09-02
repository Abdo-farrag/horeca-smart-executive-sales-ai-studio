import fs from 'node:fs';
import assert from 'node:assert/strict';

const roots = ['src', 'apps/lovable/src', 'apps/studio/src'];
const requiredPatterns = [
  [/setAiPanelOpen\(true\)/, 'Daily Executive AI Brief action'],
  [/<KpiCard\b/, 'Executive KPI cards'],
  [/<DailySalesRepPerformance\s*\/>/, 'Daily Sales Rep Performance'],
  [/repSearch/, 'sales representative search'],
  [/customerSearch/, 'customer search'],
  [/setSelectedRep\(/, 'sales representative drill-down'],
  [/setSelectedCustomer\(/, 'customer drill-down'],
  [/dailySalesTrend/, 'daily sales trend'],
  [/salesByCompany/, 'company revenue distribution'],
  [/retentionMetrics/, 'customer retention panel'],
];

for (const root of roots) {
  const file = `${root}/views/ExecutiveDashboard.tsx`;
  assert.ok(fs.existsSync(file), `${file} must exist`);
  const source = fs.readFileSync(file, 'utf8');
  for (const [pattern, label] of requiredPatterns) {
    assert.match(source, pattern, `${file} must preserve ${label}`);
  }
}

console.log('✓ Executive feature preservation contract passed');
