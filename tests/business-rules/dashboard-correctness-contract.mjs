import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

const dateCore = read('packages/core/src/filters/dateFilters.ts');
expect(!dateCore.includes("'2026-08-10'"), 'date filters must not default to the hard-coded 2026-08-10 date');
expect(/getCurrentMonthRange\(referenceDate: Date \| string = new Date\(\)\)/.test(dateCore), 'current-month helper must default to runtime current date');
expect(/getPreviousMonthRange\(referenceDate: Date \| string = new Date\(\)\)/.test(dateCore), 'previous-month helper must default to runtime current date');

const filtersAdapter = read('src/analytics/filters.ts');
expect(filtersAdapter.includes('if (companyId === 1) return 2;'), 'legacy salesperson-filter company id 1 must normalize to Horeca Smart id 2');
expect(filtersAdapter.includes('if (companyId === 2) return 1;'), 'legacy salesperson-filter company id 2 must normalize to MAS id 1');
expect(filtersAdapter.includes('p_company_id: normalizeLegacySalespeopleCompanyId(params.companyId)'), 'salespeople filter RPC must use canonical company-id normalization');

const customerOperational = read('src/analytics/customerOperational.ts');
expect(customerOperational.includes('row.high_priority_customers'), 'portfolio summary mapper must read high_priority_customers');
expect(customerOperational.includes('row.medium_priority_customers'), 'portfolio summary mapper must read medium_priority_customers');
expect(customerOperational.includes('row.low_priority_customers'), 'portfolio summary mapper must read low_priority_customers');
expect(customerOperational.includes('row.share_pct'), 'risk distribution mapper must read share_pct');
expect(customerOperational.includes('row.median_days_between_orders'), 'customer action/risk mappers must read median_days_between_orders');
expect(customerOperational.includes('p_start_date: params.startDate'), 'buying frequency RPC must receive start date');
expect(customerOperational.includes('p_end_date: params.endDate'), 'buying frequency RPC must receive end date');
expect(customerOperational.includes('p_as_of_date: params.asOfDate'), 'customer risk RPC must receive as-of date');

const customerService = read('src/services/customerService.ts');
expect(customerService.includes('startDate: effectiveStartDate'), 'buying-frequency service must pass effectiveStartDate');
expect(customerService.includes('endDate: effectiveEndDate'), 'buying-frequency service must pass effectiveEndDate');

const productDashboard = read('src/views/ProductDashboard.tsx');
expect(!/totalOrders\s*=\s*data\.reduce\([^\n]*ordersCount/.test(productDashboard), 'Product Dashboard must not sum per-SKU order counts as distinct total orders');
expect(!/totalCustomers\s*=\s*data\.reduce\([^\n]*uniqueCustomers/.test(productDashboard), 'Product Dashboard must not sum per-SKU unique customers as distinct total customers');
expect(productDashboard.includes('scopeKpis?.ordersCount'), 'Product Dashboard total orders must use canonical scoped distinct-order KPI');
expect(productDashboard.includes('scopeKpis?.activeCustomers'), 'Product Dashboard unique customers must use canonical scoped distinct-customer KPI');

assert.deepEqual(errors, [], `Dashboard correctness contract failures:\n${errors.map((e) => `- ${e}`).join('\n')}`);
console.log('✓ Dashboard correctness contract passed');
