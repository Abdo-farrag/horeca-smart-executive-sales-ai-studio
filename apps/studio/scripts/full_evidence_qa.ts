import { analytics } from '../src/analytics';

async function runFullQA() {
  const startDate = '2026-08-01';
  const endDate = '2026-08-12';
  const month = '2026-08-01';
  const asOfDate = '2026-08-12';

  console.log('========================================================================');
  console.log('                 EVIDENCE-BASED FILTER QA RUNNER                        ');
  console.log('========================================================================\n');

  // --- 1. EXECUTIVE KPIS ---
  console.log('>>> 1. EXECUTIVE KPIS (analytics_sales_executive_kpis_v2)');
  const execBase = (await analytics.sales.executive({ startDate, endDate }))[0];
  const execCairo = (await analytics.sales.executive({ startDate, endDate, governorateCode: 'CAIRO' }))[0];
  const execNasr = (await analytics.sales.executive({ startDate, endDate, governorateCode: 'CAIRO', areaCode: 'NASR_CITY' }))[0];
  const execCust30709 = (await analytics.sales.executive({ startDate, endDate, customerId: 30709 }))[0];
  const execProd8516 = (await analytics.sales.executive({ startDate, endDate, productId: 8516 }))[0];
  const execCombo = (await analytics.sales.executive({ startDate, endDate, customerId: 30709, productId: 8516 }))[0];
  const execMAS = (await analytics.sales.executive({ startDate, endDate, companyName: 'MAS' }))[0];
  const execHoreca = (await analytics.sales.executive({ startDate, endDate, companyName: 'Horeca Smart' }))[0];
  const execHaddil = (await analytics.sales.executive({ startDate, endDate, salesperson: 'Haddil Haron' }))[0];

  console.log('Exec Baseline:', execBase);
  console.log('Exec Cairo:', execCairo);
  console.log('Exec Nasr City:', execNasr);
  console.log('Exec Customer 30709:', execCust30709);
  console.log('Exec Product 8516:', execProd8516);
  console.log('Exec Combo (30709+8516):', execCombo);
  console.log('Exec MAS:', execMAS);
  console.log('Exec Horeca:', execHoreca);
  console.log('Exec Haddil Haron:', execHaddil);

  // --- 2. CUSTOMER SUMMARY ---
  console.log('\n>>> 2. CUSTOMER SUMMARY (analytics_customer_summary_v2)');
  const custBase = await analytics.customers.summary({ startDate, endDate });
  const custCairo = await analytics.customers.summary({ startDate, endDate, governorateCode: 'CAIRO' });
  const custNasr = await analytics.customers.summary({ startDate, endDate, governorateCode: 'CAIRO', areaCode: 'NASR_CITY' });
  const cust30709 = await analytics.customers.summary({ startDate, endDate, customerId: 30709 });
  const custProd8516 = await analytics.customers.summary({ startDate, endDate, productId: 8516 });
  const custCombo = await analytics.customers.summary({ startDate, endDate, customerId: 30709, productId: 8516 });
  const custActive = await analytics.customers.summary({ startDate, endDate, status: 'ACTIVE' });
  const custAtRisk = await analytics.customers.summary({ startDate, endDate, status: 'AT_RISK' });

  console.log('Cust Baseline count:', custBase.length, 'Total Sales:', custBase.reduce((s, c) => s + c.salesValue, 0));
  console.log('Cust Cairo count:', custCairo.length, 'Total Sales:', custCairo.reduce((s, c) => s + c.salesValue, 0));
  console.log('Cust Nasr City count:', custNasr.length, 'Total Sales:', custNasr.reduce((s, c) => s + c.salesValue, 0));
  console.log('Cust 30709:', cust30709[0]);
  console.log('Cust Prod 8516 count:', custProd8516.length, 'Total Sales:', custProd8516.reduce((s, c) => s + c.salesValue, 0));
  console.log('Cust Combo:', custCombo[0]);
  console.log('Cust Active count:', custActive.length);
  console.log('Cust At Risk count:', custAtRisk.length);

  // --- 3. PRODUCT SUMMARY ---
  console.log('\n>>> 3. PRODUCT SUMMARY (analytics_product_summary_v2)');
  const prodBase = await analytics.products.summary({ startDate, endDate });
  const prodCairo = await analytics.products.summary({ startDate, endDate, governorateCode: 'CAIRO' });
  const prodNasr = await analytics.products.summary({ startDate, endDate, governorateCode: 'CAIRO', areaCode: 'NASR_CITY' });
  const prodCust30709 = await analytics.products.summary({ startDate, endDate, customerId: 30709 });
  const prod8516 = await analytics.products.summary({ startDate, endDate, productId: 8516 });
  const prodCombo = await analytics.products.summary({ startDate, endDate, customerId: 30709, productId: 8516 });

  console.log('Prod Baseline count:', prodBase.length, 'Total Sales:', prodBase.reduce((s, p) => s + p.salesValue, 0));
  console.log('Prod Cairo count:', prodCairo.length, 'Total Sales:', prodCairo.reduce((s, p) => s + p.salesValue, 0));
  console.log('Prod Nasr City count:', prodNasr.length, 'Total Sales:', prodNasr.reduce((s, p) => s + p.salesValue, 0));
  console.log('Prod Cust 30709 count:', prodCust30709.length, 'Total Sales:', prodCust30709.reduce((s, p) => s + p.salesValue, 0));
  console.log('Prod 8516:', prod8516[0]);
  console.log('Prod Combo:', prodCombo[0]);

  // --- 4. ACTION CENTER & PRIORITY / ACTION TYPE / RISK ---
  console.log('\n>>> 4. CUSTOMER ACTION CENTER (analytics_customer_action_center)');
  const actionBase = await analytics.customers.actionCenter({ asOfDate });
  const actionHigh = await analytics.customers.actionCenter({ asOfDate, priority: 'HIGH' });
  const actionMed = await analytics.customers.actionCenter({ asOfDate, priority: 'MEDIUM' });
  const actionLow = await analytics.customers.actionCenter({ asOfDate, priority: 'LOW' });
  const actionWinback = await analytics.customers.actionCenter({ asOfDate, actionType: 'WIN_BACK' });
  const actionDecline = await analytics.customers.actionCenter({ asOfDate, actionType: 'RECOVER_DECLINE' });
  const actionOverdue = await analytics.customers.actionCenter({ asOfDate, actionType: 'OVERDUE_FOLLOWUP' });
  const actionMonitor = await analytics.customers.actionCenter({ asOfDate, actionType: 'MONITOR' });

  console.log('Action Base count:', actionBase.length);
  console.log('Action High count:', actionHigh.length);
  console.log('Action Med count:', actionMed.length);
  console.log('Action Low count:', actionLow.length);
  console.log('Action Winback count:', actionWinback.length);
  console.log('Action Decline count:', actionDecline.length);
  console.log('Action Overdue count:', actionOverdue.length);
  console.log('Action Monitor count:', actionMonitor.length);

  // --- 5. LEGACY RPCs PARAMETER TEST ---
  console.log('\n>>> 5. LEGACY RPCS PARAMETER TESTS');
  console.log('analytics_top_customers: accepts (p_start_date, p_end_date, p_company_name, p_salesperson, p_limit)');
  const topBase = await analytics.sales.topCustomers({ startDate, endDate });
  const topCompany = await analytics.sales.topCustomers({ startDate, endDate, companyName: 'MAS' });
  console.log('Top Base count:', topBase.length, 'Top 1:', topBase[0]?.customerName, topBase[0]?.salesValue);
  console.log('Top Company MAS count:', topCompany.length, 'Top 1:', topCompany[0]?.customerName, topCompany[0]?.salesValue);

  console.log('\nanalytics_customer_retention_summary: accepts (p_month, p_company_name, p_salesperson)');
  const retBase = await analytics.customers.retention({ month });
  const retMAS = await analytics.customers.retention({ month, companyName: 'MAS' });
  console.log('Ret Base:', retBase[0]);
  console.log('Ret MAS:', retMAS[0]);

  console.log('\nanalytics_sales_rep_summary: accepts (p_month, p_company_name, p_salesperson)');
  const repSumBase = await analytics.salesReps.summary({ month });
  const repSumMAS = await analytics.salesReps.summary({ month, companyName: 'MAS' });
  console.log('Rep Summary Base count:', repSumBase.length);
  console.log('Rep Summary MAS count:', repSumMAS.length);

  console.log('\nanalytics_customer_portfolio_summary: accepts (p_as_of_date, p_company_name, p_salesperson)');
  const portBase = await analytics.customers.portfolioSummary({ asOfDate });
  const portMAS = await analytics.customers.portfolioSummary({ asOfDate, companyName: 'MAS' });
  console.log('Portfolio Base:', portBase[0]);
  console.log('Portfolio MAS:', portMAS[0]);

  console.log('\nanalytics_customer_risk_distribution: accepts (p_as_of_date, p_company_name, p_salesperson)');
  const riskDistBase = await analytics.customers.riskDistribution({ asOfDate });
  const riskDistMAS = await analytics.customers.riskDistribution({ asOfDate, companyName: 'MAS' });
  console.log('Risk Dist Base:', riskDistBase);
  console.log('Risk Dist MAS:', riskDistMAS);
}

runFullQA().catch(console.error);
