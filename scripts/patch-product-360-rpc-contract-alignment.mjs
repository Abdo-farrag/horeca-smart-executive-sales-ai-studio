import fs from 'node:fs';

const roots = ['src', 'apps/lovable/src', 'apps/studio/src'];

for (const root of roots) {
  const productsPath = `${root}/analytics/products.ts`;
  let products = fs.readFileSync(productsPath, 'utf8');

  const oldTrend = `  async trend(params: ProductTrendParams): Promise<ProductTrendResult[]> {\n    return callAnalyticsRpc(\n      'analytics_product_trend',\n      {\n        p_product_id: params.productId,\n        p_company_name: params.companyName ?? null,\n      },`;
  const newTrend = `  async trend(params: ProductTrendParams): Promise<ProductTrendResult[]> {\n    if (params.startDate) assertIsoDate(params.startDate, 'startDate');\n    if (params.endDate) assertIsoDate(params.endDate, 'endDate');\n\n    return callAnalyticsRpc(\n      'analytics_product_trend',\n      {\n        p_product_id: params.productId,\n        p_start_month: params.startDate ?? null,\n        p_end_month: params.endDate ?? null,\n        p_company_name: params.companyName ?? null,\n        p_salesperson: params.salesperson ?? null,\n      },`;
  if (!products.includes(oldTrend)) throw new Error(`${productsPath}: trend block not found`);
  products = products.replace(oldTrend, newTrend);

  for (const rpc of ['analytics_product_top_customers', 'analytics_product_top_salespeople']) {
    const start = products.indexOf(`'${rpc}'`);
    if (start < 0) throw new Error(`${productsPath}: ${rpc} not found`);
    const end = products.indexOf('      (row) => ({', start);
    const block = products.slice(start, end);
    if (!block.includes('        p_offset: params.offset ?? null,\n')) throw new Error(`${productsPath}: ${rpc} legacy p_offset not found`);
    const fixed = block.replace('        p_offset: params.offset ?? null,\n', '');
    products = products.slice(0, start) + fixed + products.slice(end);
  }
  fs.writeFileSync(productsPath, products);

  const typesPath = `${root}/analytics/types.ts`;
  let types = fs.readFileSync(typesPath, 'utf8');
  const oldTrendType = `export interface ProductTrendParams {\n  productId: number;\n  companyName?: string | null;\n}`;
  const newTrendType = `export interface ProductTrendParams {\n  productId: number;\n  startDate?: string | null;\n  endDate?: string | null;\n  companyName?: string | null;\n  salesperson?: string | null;\n}`;
  if (!types.includes(oldTrendType)) throw new Error(`${typesPath}: ProductTrendParams legacy shape not found`);
  types = types.replace(oldTrendType, newTrendType);
  for (const name of ['ProductTopCustomerParams', 'ProductTopSalespersonParams']) {
    const marker = `export interface ${name} {`;
    const start = types.indexOf(marker);
    const end = types.indexOf('\n}', start);
    if (start < 0 || end < 0) throw new Error(`${typesPath}: ${name} not found`);
    const block = types.slice(start, end + 2);
    if (!block.includes('  offset?: number | null;\n')) throw new Error(`${typesPath}: ${name} legacy offset not found`);
    types = types.slice(0, start) + block.replace('  offset?: number | null;\n', '') + types.slice(end + 2);
  }
  fs.writeFileSync(typesPath, types);

  const servicePath = `${root}/services/productService.ts`;
  let service = fs.readFileSync(servicePath, 'utf8');
  const oldTrendService = `    const data = await analytics.products.trend({\n      productId,\n      companyName: filters.company === 'All' ? null : filters.company,\n    });`;
  const newTrendService = `    const { companyName, salespersonName, effectiveStartDate, effectiveEndDate } = getEffectiveFilterParams(filters);\n    const data = await analytics.products.trend({\n      productId,\n      startDate: effectiveStartDate,\n      endDate: effectiveEndDate,\n      companyName,\n      salesperson: salespersonName,\n    });`;
  if (!service.includes(oldTrendService)) throw new Error(`${servicePath}: trend service block not found`);
  service = service.replace(oldTrendService, newTrendService);
  service = service.replaceAll('options: { limit?: number; offset?: number } = {}', 'options: { limit?: number } = {}');
  service = service.replaceAll('      offset: options.offset ?? 0,\n', '');
  fs.writeFileSync(servicePath, service);
}

const packagePath = 'package.json';
let pkg = fs.readFileSync(packagePath, 'utf8');
const anchor = 'node tests/business-rules/product-dashboard-volume-salespeople-contract.mjs';
const next = `${anchor} && node tests/business-rules/product-360-rpc-contract-alignment-contract.mjs`;
if (!pkg.includes(anchor)) throw new Error('package.json contract anchor not found');
if (!pkg.includes('product-360-rpc-contract-alignment-contract.mjs')) pkg = pkg.replace(anchor, next);
fs.writeFileSync(packagePath, pkg);

console.log('Applied Product 360 RPC contract alignment across Root, Lovable, Studio');
