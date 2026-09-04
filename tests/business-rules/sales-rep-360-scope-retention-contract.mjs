import fs from 'node:fs';

const viewTargets = [
  'src/views/SalesRepDashboard.tsx',
  'apps/lovable/src/views/SalesRepDashboard.tsx',
  'apps/studio/src/views/SalesRepDashboard.tsx',
];
const hookTargets = [
  'src/hooks/useSalesRepDashboard.ts',
  'apps/lovable/src/hooks/useSalesRepDashboard.ts',
  'apps/studio/src/hooks/useSalesRepDashboard.ts',
];
const serviceTargets = [
  'src/services/salesRepService.ts',
  'apps/lovable/src/services/salesRepService.ts',
  'apps/studio/src/services/salesRepService.ts',
];

for (const path of viewTargets) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes("new Set(summaries.map((row) => row.salesperson)).size")) throw new Error(`${path}: rep count must be unique by salesperson`);
  if (!source.includes('selectedRepCompanyName')) throw new Error(`${path}: selected company scope is missing`);
  if (!source.includes('useSalesRep360(selectedRepName, filters, selectedRepCompanyName)')) throw new Error(`${path}: 360 hook must receive selected company scope`);
  if (!source.includes("previous_customers > 0")) throw new Error(`${path}: retention must require prior-customer history`);
  if (!source.includes('Insufficient History')) throw new Error(`${path}: missing explicit insufficient-history state`);
}

for (const path of hookTargets) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes('companyNameOverride')) throw new Error(`${path}: 360 hook must carry company override`);
}

for (const path of serviceTargets) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes('companyNameOverride')) throw new Error(`${path}: service must accept company override`);
  if (!source.includes('const scopedCompanyName = companyNameOverride ?? companyName;')) throw new Error(`${path}: selected company must override global company for rep detail`);
}

console.log('sales-rep-360-scope-retention-contract: PASS');
