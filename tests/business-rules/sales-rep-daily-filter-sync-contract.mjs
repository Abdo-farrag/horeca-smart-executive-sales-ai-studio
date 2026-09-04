import fs from 'node:fs';

const targets = [
  'src/views/SalesRepDailyActionCenter.tsx',
  'apps/lovable/src/views/SalesRepDailyActionCenter.tsx',
  'apps/studio/src/views/SalesRepDailyActionCenter.tsx',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const path of targets) {
  const source = fs.readFileSync(path, 'utf8');

  assert(!source.includes("useState<string>('Haddil Haron')"), `${path}: salesperson must not default to Haddil Haron`);
  assert(!source.includes("list.unshift('Haddil Haron')"), `${path}: salesperson dropdown must not inject Haddil Haron`);
  assert(!source.includes("selectedCompany === 'All' ? 'MAS'"), `${path}: customer drilldown must not hardcode MAS`);

  assert(source.includes('analytics.filters.salespeople('), `${path}: dropdown must use live analytics.filters.salespeople source`);
  assert(source.includes('filters.salespersonName'), `${path}: page must sync from global salespersonName`);
  assert(source.includes('filters.effectiveEndDate'), `${path}: as-of date must use effectiveEndDate`);
  assert(source.includes('filters.companyId'), `${path}: live salesperson options must be company-scoped by canonical companyId`);

  const advancedFilterFields = ['governorateCode', 'areaCode', 'customerId', 'productId'];
  for (const field of advancedFilterFields) {
    assert(source.includes(`filters.${field}`), `${path}: ${field} must be detected so unsupported filters are not silently ignored`);
  }
}

console.log('✓ Sales Rep Daily global-filter sync contract passed');
