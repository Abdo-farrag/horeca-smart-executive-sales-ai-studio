import { analytics } from '../src/analytics';

async function runAudit() {
  const startDate = '2026-08-01';
  const endDate = '2026-08-12';
  const month = '2026-08-01';

  console.log('=== RUNNING EVIDENCE-BASED QA AUDIT ===\n');

  // 1. BASELINE
  console.log('--- 1. BASELINE ---');
  const baselineExec = await analytics.sales.executive({ startDate, endDate });
  console.log('Executive Baseline:', baselineExec[0]);

  // 2. GOVERNORATE = CAIRO
  console.log('\n--- 2. GOVERNORATE = CAIRO ---');
  const cairoExec = await analytics.sales.executive({ startDate, endDate, governorateCode: 'CAIRO' });
  console.log('Executive Cairo:', cairoExec[0]);

  const cairoDaily = await analytics.sales.daily({ startDate, endDate, governorateCode: 'CAIRO' });
  console.log('Daily Cairo row count:', cairoDaily.length);

  const cairoTopCust = await analytics.sales.topCustomers({ startDate, endDate }); // legacy topCustomers ignores governorateCode
  console.log('Top Cust Cairo (legacy, sent without governorate):', cairoTopCust.slice(0, 2));

  // 3. AREA = NASR_CITY (Governorate = CAIRO)
  console.log('\n--- 3. AREA = NASR_CITY ---');
  const nasrExec = await analytics.sales.executive({ startDate, endDate, governorateCode: 'CAIRO', areaCode: 'NASR_CITY' });
  console.log('Executive Nasr City:', nasrExec[0]);

  // 4. CUSTOMER ID = 30709
  console.log('\n--- 4. CUSTOMER ID = 30709 ---');
  const custExec = await analytics.sales.executive({ startDate, endDate, customerId: 30709 });
  console.log('Executive Customer 30709:', custExec[0]);

  const custSummary = await analytics.customers.summary({ startDate, endDate, customerId: 30709 });
  console.log('Customer Summary 30709:', custSummary[0]);

  const prodSummaryForCust = await analytics.products.summary({ startDate, endDate, customerId: 30709 });
  console.log('Product Summary for Customer 30709 (rows):', prodSummaryForCust.length);

  // 5. PRODUCT ID = 8516
  console.log('\n--- 5. PRODUCT ID = 8516 ---');
  const prodExec = await analytics.sales.executive({ startDate, endDate, productId: 8516 });
  console.log('Executive Product 8516:', prodExec[0]);

  const prodSummary = await analytics.products.summary({ startDate, endDate, productId: 8516 });
  console.log('Product Summary 8516:', prodSummary[0]);

  // 6. CUSTOMER 30709 + PRODUCT 8516
  console.log('\n--- 6. CUSTOMER 30709 + PRODUCT 8516 ---');
  const custProdExec = await analytics.sales.executive({ startDate, endDate, customerId: 30709, productId: 8516 });
  console.log('Executive Customer+Product:', custProdExec[0]);

  const custSummaryCombo = await analytics.customers.summary({ startDate, endDate, customerId: 30709, productId: 8516 });
  console.log('Customer Summary Combo:', custSummaryCombo[0]);

  const prodSummaryCombo = await analytics.products.summary({ startDate, endDate, customerId: 30709, productId: 8516 });
  console.log('Product Summary Combo:', prodSummaryCombo[0]);

  // 7. COMPANY = MAS vs HORECA SMART
  console.log('\n--- 7. COMPANY FILTER ---');
  const masExec = await analytics.sales.executive({ startDate, endDate, companyName: 'MAS' });
  console.log('Executive MAS:', masExec[0]);

  const horecaExec = await analytics.sales.executive({ startDate, endDate, companyName: 'Horeca Smart' });
  console.log('Executive Horeca Smart:', horecaExec[0]);

  // 8. SALESPERSON = Haddil Haron
  console.log('\n--- 8. SALESPERSON = Haddil Haron ---');
  const repExec = await analytics.sales.executive({ startDate, endDate, salesperson: 'Haddil Haron' });
  console.log('Executive Haddil Haron:', repExec[0]);

  // 9. CUSTOMER STATUS TESTS
  console.log('\n--- 9. CUSTOMER STATUS ---');
  const activeCust = await analytics.customers.summary({ startDate, endDate, status: 'ACTIVE' });
  console.log('Active Customers count:', activeCust.length);
  const atRiskCust = await analytics.customers.summary({ startDate, endDate, status: 'AT_RISK' });
  console.log('At Risk Customers count:', atRiskCust.length);

  // 10. PRIORITY TESTS
  console.log('\n--- 10. PRIORITY ---');
  const highAction = await analytics.customers.actionCenter({ priority: 'HIGH' });
  console.log('High Priority Action Center rows:', highAction.length);
  const medAction = await analytics.customers.actionCenter({ priority: 'MEDIUM' });
  console.log('Medium Priority Action Center rows:', medAction.length);

  // 11. ACTION TYPE TESTS
  console.log('\n--- 11. ACTION TYPE ---');
  const winbackAction = await analytics.customers.actionCenter({ actionType: 'WIN_BACK' });
  console.log('WIN_BACK Action Center rows:', winbackAction.length);
  const declineAction = await analytics.customers.actionCenter({ actionType: 'RECOVER_DECLINE' });
  console.log('RECOVER_DECLINE Action Center rows:', declineAction.length);

  // 12. RISK FILTER VERIFICATION
  console.log('\n--- 12. RISK FILTER VERIFICATION ---');
  // Check if risk filter can be passed to customer action center or risk distribution
  console.log('Checking parameters for analytics.customers.actionCenter and analytics.customers.riskDistribution...');

  // 13. LEGACY RPC LIMITATION TEST
  console.log('\n--- 13. LEGACY RPC LIMITATIONS ---');
  const topCustGov = await analytics.sales.topCustomers({ startDate, endDate }); // No governorate parameter
  console.log('Top Customers has no p_governorate_code / p_area_code / p_customer_id / p_product_id');

  const retSummaryGov = await analytics.customers.retention({ month, companyName: null, salesperson: null });
  console.log('Retention summary supports month, companyName, salesperson, BUT NOT governorate, area, customer, product');

  const repSummaryGov = await analytics.salesReps.summary({ month, companyName: null, salesperson: null });
  console.log('SalesRep summary supports month, companyName, salesperson, BUT NOT governorate, area, customer, product');
}

runAudit().catch(console.error);
