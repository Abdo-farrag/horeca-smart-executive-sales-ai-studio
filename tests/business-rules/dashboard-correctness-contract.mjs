import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

const dateCore = read('packages/core/src/filters/dateFilters.ts');
expect(!dateCore.includes("'2026-08-10'"), 'date filters must not default to the hard-coded 2026-08-10 date');
expect(/getCurrentMonthRange\(referenceDate: Date \| string = new Date\(\)\)/.test(dateCore), 'current-month helper must default to runtime current date');
expect(/getPreviousMonthRange\(referenceDate: Date \| string = new Date\(\)\)/.test(dateCore), 'previous-month helper must default to runtime current date');

const actionCenter = read('src/views/CustomerActionCenter.tsx');
expect(actionCenter.includes("selectedCompany === 'Horeca Smart' ? 2 : selectedCompany === 'MAS' ? 1"), 'Action Center company IDs must map Horeca Smart=2 and MAS=1');

const customers = read('src/analytics/customers.ts');
expect(customers.includes('row.high_priority_customers'), 'portfolio summary mapper must read high_priority_customers');
expect(customers.includes('row.medium_priority_customers'), 'portfolio summary mapper must read medium_priority_customers');
expect(customers.includes('row.low_priority_customers'), 'portfolio summary mapper must read low_priority_customers');
expect(customers.includes('row.share_pct'), 'risk distribution mapper must read share_pct');
expect(customers.includes('row.median_days_between_orders'), 'customer action/risk mappers must read median_days_between_orders');

const customerService = read('src/services/customerService.ts');
expect(customerService.includes('startDate: filters.effectiveStartDate'), 'buying-frequency service must pass effectiveStartDate');
expect(customerService.includes('endDate: filters.effectiveEndDate'), 'buying-frequency service must pass effectiveEndDate');

const productDashboard = read('src/views/ProductDashboard.tsx');
expect(!/totalOrders\s*=\s*data\.reduce\([^\n]*ordersCount/.test(productDashboard), 'Product Dashboard must not sum per-SKU order counts as distinct total orders');
expect(!/totalCustomers\s*=\s*data\.reduce\([^\n]*uniqueCustomers/.test(productDashboard), 'Product Dashboard must not sum per-SKU unique customers as distinct total customers');

assert.deepEqual(errors, [], `Dashboard correctness contract failures:\n${errors.map((e) => `- ${e}`).join('\n')}`);
console.log('✓ Dashboard correctness contract passed');
