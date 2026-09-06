import fs from 'node:fs';

const files = [
  'src/analytics/__tests__/products.test.ts',
  'apps/lovable/src/analytics/__tests__/products.test.ts',
  'apps/studio/src/analytics/__tests__/products.test.ts',
];

for (const path of files) {
  let s = fs.readFileSync(path, 'utf8');

  s = s.replace(
`    const res = await products.trend({
      productId: 8516,
      companyName: null,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_trend', {
      p_product_id: 8516,
      p_company_name: null,
    });`,
`    const res = await products.trend({
      productId: 8516,
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      companyName: null,
      salesperson: null,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_trend', {
      p_product_id: 8516,
      p_start_month: '2026-08-01',
      p_end_month: '2026-08-04',
      p_company_name: null,
      p_salesperson: null,
    });`);

  s = s.replace(
`      p_company_name: null,
      p_limit: 10,
      p_offset: null,
    });`,
`      p_company_name: null,
      p_limit: 10,
    });`);

  s = s.replace(
`      p_company_name: null,
      p_limit: 10,
      p_offset: null,
    });`,
`      p_company_name: null,
      p_limit: 10,
    });`);

  if (s.includes('p_offset: null')) throw new Error(`${path}: stale p_offset expectation remains`);
  if (!s.includes("p_start_month: '2026-08-01'")) throw new Error(`${path}: trend expectation not updated`);

  fs.writeFileSync(path, s);
}

console.log('Updated Product 360 RPC unit tests across Root, Lovable, Studio');
