import fs from 'node:fs';

const files = [
  'src/analytics/products.ts',
  'apps/lovable/src/analytics/products.ts',
  'apps/studio/src/analytics/products.ts',
];

for (const path of files) {
  const source = fs.readFileSync(path, 'utf8');

  if (!source.includes("quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0")) {
    throw new Error(`${path}: product summary must map qty_sold (with quantity_sold fallback) into quantitySold`);
  }

  if (!source.includes("activeSalespeople: toFiniteNumber(row.salespeople_count ?? row.active_salespeople ?? 0")) {
    throw new Error(`${path}: product summary must map salespeople_count (with active_salespeople fallback) into activeSalespeople`);
  }

  if (!source.includes("quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0")) {
    throw new Error(`${path}: product quantity mapping is incomplete`);
  }
}

console.log('product-dashboard-volume-salespeople-contract: PASS');
