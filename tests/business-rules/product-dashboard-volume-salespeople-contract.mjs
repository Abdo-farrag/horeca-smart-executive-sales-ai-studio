import fs from 'node:fs';

const files = [
  'src/analytics/products.ts',
  'apps/lovable/src/analytics/products.ts',
  'apps/studio/src/analytics/products.ts',
];

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing section markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

for (const path of files) {
  const source = fs.readFileSync(path, 'utf8');

  const summary = section(source, 'async summary(', 'async get360(');
  if (!summary.includes("quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0")) {
    throw new Error(`${path}: product summary must map qty_sold (with quantity_sold fallback) into quantitySold`);
  }
  if (!summary.includes("activeSalespeople: toFiniteNumber(row.salespeople_count ?? row.active_salespeople ?? 0")) {
    throw new Error(`${path}: product summary must map salespeople_count (with active_salespeople fallback) into activeSalespeople`);
  }

  const trend = section(source, 'async trend(', 'async dailyTrend(');
  if (!trend.includes("quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0")) {
    throw new Error(`${path}: product trend must map qty_sold into quantitySold`);
  }

  const topCustomers = section(source, 'async topCustomers(', 'async topSalespeople(');
  if (!topCustomers.includes("quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0")) {
    throw new Error(`${path}: product top customers must map qty_sold into quantitySold`);
  }

  const topSalespeople = section(source, 'async topSalespeople(', 'async customerRetention(');
  if (!topSalespeople.includes("quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0")) {
    throw new Error(`${path}: product top salespeople must map qty_sold into quantitySold`);
  }
}

console.log('product-dashboard-volume-salespeople-contract: PASS');
