import fs from 'node:fs';

const analyticsTargets = [
  'src/analytics/customers.ts',
  'apps/lovable/src/analytics/customers.ts',
  'apps/studio/src/analytics/customers.ts',
];

for (const path of analyticsTargets) {
  const source = fs.readFileSync(path, 'utf8');
  const requiredAliases = [
    'high_priority_customers',
    'medium_priority_customers',
    'low_priority_customers',
  ];
  for (const alias of requiredAliases) {
    if (!source.includes(alias)) {
      throw new Error(`${path}: portfolio summary mapper must support RPC field ${alias}`);
    }
  }
}

const viewTargets = [
  'src/views/CustomerActionCenter.tsx',
  'apps/lovable/src/views/CustomerActionCenter.tsx',
  'apps/studio/src/views/CustomerActionCenter.tsx',
];

for (const path of viewTargets) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes('filters.effectiveEndDate')) {
    throw new Error(`${path}: Customer Action Center must honor effectiveEndDate`);
  }
  if (!source.includes('filters.salespersonName')) {
    throw new Error(`${path}: Customer Action Center must sync from canonical salespersonName`);
  }
  if (source.includes("selectedCompany === 'All' ? 'MAS'")) {
    throw new Error(`${path}: Customer Action Center must not fallback to MAS when company is All`);
  }
}

console.log('Customer Action Center KPI mapping contract passed');
