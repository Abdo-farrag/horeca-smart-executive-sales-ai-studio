import fs from 'node:fs';

const productFiles = [
  'src/analytics/products.ts',
  'apps/lovable/src/analytics/products.ts',
  'apps/studio/src/analytics/products.ts',
];

for (const path of productFiles) {
  const source = fs.readFileSync(path, 'utf8');

  for (const required of [
    'p_start_month: params.startDate ?? null',
    'p_end_month: params.endDate ?? null',
    'p_salesperson: params.salesperson ?? null',
  ]) {
    if (!source.includes(required)) {
      throw new Error(`${path}: analytics_product_trend must pass ${required}`);
    }
  }

  const topCustomersBlock = source.split("'analytics_product_top_customers'")[1]?.split(');')[0] ?? '';
  if (topCustomersBlock.includes('p_offset')) {
    throw new Error(`${path}: analytics_product_top_customers must not pass p_offset; production RPC has no offset parameter`);
  }

  const topSalespeopleBlock = source.split("'analytics_product_top_salespeople'")[1]?.split(');')[0] ?? '';
  if (topSalespeopleBlock.includes('p_offset')) {
    throw new Error(`${path}: analytics_product_top_salespeople must not pass p_offset; production RPC has no offset parameter`);
  }

  if (!source.includes("quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0, 'qty_sold')")) {
    throw new Error(`${path}: product detail quantity paths must preserve qty_sold mapping`);
  }
}

const typeFiles = [
  'src/analytics/types.ts',
  'apps/lovable/src/analytics/types.ts',
  'apps/studio/src/analytics/types.ts',
];
for (const path of typeFiles) {
  const source = fs.readFileSync(path, 'utf8');
  const trend = source.split('export interface ProductTrendParams')[1]?.split('}')[0] ?? '';
  for (const required of ['startDate?: string | null;', 'endDate?: string | null;', 'salesperson?: string | null;']) {
    if (!trend.includes(required)) throw new Error(`${path}: ProductTrendParams missing ${required}`);
  }
}

console.log('product-360-rpc-contract-alignment-contract: PASS');
