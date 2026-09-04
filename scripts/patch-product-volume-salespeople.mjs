import fs from 'node:fs';

const files = [
  'src/analytics/products.ts',
  'apps/lovable/src/analytics/products.ts',
  'apps/studio/src/analytics/products.ts',
];

const replacements = [
  [
    "quantitySold: toFiniteNumber(row.quantity_sold ?? 0, 'quantity_sold')",
    "quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0, 'qty_sold')",
  ],
  [
    "activeSalespeople: toFiniteNumber(row.active_salespeople ?? 0, 'active_salespeople')",
    "activeSalespeople: toFiniteNumber(row.salespeople_count ?? row.active_salespeople ?? 0, 'salespeople_count')",
  ],
];

for (const path of files) {
  let source = fs.readFileSync(path, 'utf8');
  let quantityReplacements = 0;

  const oldQty = replacements[0][0];
  const newQty = replacements[0][1];
  while (source.includes(oldQty)) {
    source = source.replace(oldQty, newQty);
    quantityReplacements += 1;
  }

  if (quantityReplacements < 4) {
    throw new Error(`${path}: expected at least 4 legacy quantity mappings, found ${quantityReplacements}`);
  }

  const [oldSalespeople, newSalespeople] = replacements[1];
  if (!source.includes(oldSalespeople)) {
    throw new Error(`${path}: missing legacy activeSalespeople mapping`);
  }
  source = source.replace(oldSalespeople, newSalespeople);

  fs.writeFileSync(path, source);
}

console.log('Applied product qty_sold / salespeople_count mappings across Root, Lovable, Studio');
