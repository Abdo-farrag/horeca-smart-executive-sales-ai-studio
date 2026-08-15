import { supabase } from '../src/lib/supabase';

async function runLiveVerification() {
  console.log('=== Step 1: Check RPC existence in pg_proc ===');
  const targetFunctions = [
    'analytics_customer_action_center_v2',
    'analytics_sales_rep_daily_actions_v2',
    'analytics_top_customers_v2',
    'analytics_customer_retention_summary_v2',
    'analytics_sales_rep_summary_v2'
  ];

  console.log('\n=== Step 2: Testing RPC executions against live Supabase ===\n');

  // Test 1: Risk HIGH / MEDIUM / LOW in customer_action_center_v2
  for (const risk of ['HIGH', 'MEDIUM', 'LOW']) {
    const { data, error } = await supabase.rpc('analytics_customer_action_center_v2' as any, {
      p_risk: risk
    });
    console.log(`customer_action_center_v2 (risk=${risk}):`, {
      error: error ? error.message : null,
      rowCount: data ? data.length : 0,
      sample: data && data.length > 0 ? data[0] : null
    });
  }

  // Test 2: Risk HIGH / MEDIUM / LOW in sales_rep_daily_actions_v2
  for (const risk of ['HIGH', 'MEDIUM', 'LOW']) {
    const { data, error } = await supabase.rpc('analytics_sales_rep_daily_actions_v2' as any, {
      p_risk: risk
    });
    console.log(`sales_rep_daily_actions_v2 (risk=${risk}):`, {
      error: error ? error.message : null,
      rowCount: data ? data.length : 0,
      sample: data && data.length > 0 ? data[0] : null
    });
  }

  // Test 3: analytics_top_customers_v2 with CAIRO
  {
    const { data, error } = await supabase.rpc('analytics_top_customers_v2' as any, {
      p_start_date: '2025-01-01',
      p_end_date: '2025-12-31',
      p_governorate_code: 'CAIRO'
    });
    console.log(`analytics_top_customers_v2 (CAIRO):`, {
      error: error ? error.message : null,
      rowCount: data ? data.length : 0,
      sample: data && data.length > 0 ? data[0] : null
    });
  }

  // Test 4: analytics_top_customers_v2 with CAIRO + NASR_CITY
  {
    const { data, error } = await supabase.rpc('analytics_top_customers_v2' as any, {
      p_start_date: '2025-01-01',
      p_end_date: '2025-12-31',
      p_governorate_code: 'CAIRO',
      p_area_code: 'NASR_CITY'
    });
    console.log(`analytics_top_customers_v2 (CAIRO + NASR_CITY):`, {
      error: error ? error.message : null,
      rowCount: data ? data.length : 0,
      sample: data && data.length > 0 ? data[0] : null
    });
  }

  // Test 5: analytics_top_customers_v2 with customer_id = 30709
  {
    const { data, error } = await supabase.rpc('analytics_top_customers_v2' as any, {
      p_start_date: '2025-01-01',
      p_end_date: '2025-12-31',
      p_customer_id: 30709
    });
    console.log(`analytics_top_customers_v2 (customer_id=30709):`, {
      error: error ? error.message : null,
      rowCount: data ? data.length : 0,
      sample: data && data.length > 0 ? data[0] : null
    });
  }

  // Test 6: analytics_top_customers_v2 with product_id = 8516
  {
    const { data, error } = await supabase.rpc('analytics_top_customers_v2' as any, {
      p_start_date: '2025-01-01',
      p_end_date: '2025-12-31',
      p_product_id: 8516
    });
    console.log(`analytics_top_customers_v2 (product_id=8516):`, {
      error: error ? error.message : null,
      rowCount: data ? data.length : 0,
      sample: data && data.length > 0 ? data[0] : null
    });
  }

  // Test 7: analytics_customer_retention_summary_v2 with product_id = 8516
  {
    const { data, error } = await supabase.rpc('analytics_customer_retention_summary_v2' as any, {
      p_month: '2025-01-01',
      p_product_id: 8516
    });
    console.log(`analytics_customer_retention_summary_v2 (product_id=8516):`, {
      error: error ? error.message : null,
      data
    });
  }

  // Test 8: analytics_sales_rep_summary_v2 with product_id = 8516
  {
    const { data, error } = await supabase.rpc('analytics_sales_rep_summary_v2' as any, {
      p_month: '2025-01-01',
      p_product_id: 8516
    });
    console.log(`analytics_sales_rep_summary_v2 (product_id=8516):`, {
      error: error ? error.message : null,
      data
    });
  }
}

runLiveVerification().catch(console.error);
