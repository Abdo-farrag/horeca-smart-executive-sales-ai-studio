import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salesReps } from '../salesReps';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '../../lib/supabase';

describe('Sales Reps SDK Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Verify parameter mapping for analytics_sales_rep_summary', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        order_month: '2026-07-01',
        company_name: 'Horeca Smart',
        salesperson: 'Mona Mohamed',
        active_customers: 83,
        orders_count: 229,
        sales_value: 4270814.41,
        average_order_value: 18649.84,
        previous_customers: 75,
        retained_customers: 65,
        lost_customers: 10,
        transferred_out_customers: 2,
        transferred_in_customers: 5,
        new_customers: 13,
        reactivated_customers: 0,
        lost_previous_sales: 120000,
        retention_rate: 0.866
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await salesReps.summary({
      month: '2026-07-01',
      companyName: 'Horeca Smart',
      salesperson: 'Mona Mohamed',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_summary', {
      p_month: '2026-07-01',
      p_company_name: 'Horeca Smart',
      p_salesperson: 'Mona Mohamed',
    });

    expect(res).toHaveLength(1);
    expect(res[0].salesperson).toBe('Mona Mohamed');
    expect(res[0].salesValue).toBe(4270814.41);
  });

  it('Verify parameter mapping for analytics_sales_rep_trend', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        order_month: '2026-07-01',
        company_name: 'Horeca Smart',
        salesperson: 'Mona Mohamed',
        active_customers: 83,
        orders_count: 229,
        sales_value: 4270814.41,
        average_order_value: 18649.84,
        retention_rate: 0.866,
        lost_customers: 10,
        new_customers: 13
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    await salesReps.trend({
      startMonth: '2026-01-01',
      endMonth: '2026-12-01',
      companyName: null,
      salesperson: 'Mona Mohamed',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_trend', {
      p_start_month: '2026-01-01',
      p_end_month: '2026-12-01',
      p_company_name: null,
      p_salesperson: 'Mona Mohamed',
    });
  });

  it('Verify parameter mapping for analytics_sales_rep_customers', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        company_name: 'Horeca Smart',
        salesperson: 'Mona Mohamed',
        customer_id: 101,
        customer_name: 'Grand Nile Hotel',
        orders_count: 5,
        sales_value: 250000,
        average_order_value: 50000,
        first_order_at: '2026-07-02',
        last_order_at: '2026-07-28'
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    await salesReps.customers({
      month: '2026-07-01',
      salesperson: 'Mona Mohamed',
      companyName: null,
      limit: 50,
      offset: 0,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_customers', {
      p_month: '2026-07-01',
      p_salesperson: 'Mona Mohamed',
      p_company_name: null,
      p_limit: 50,
      p_offset: 0,
    });
  });

  it('Verify parameter mapping for analytics_sales_rep_retention_details', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        company_name: 'Horeca Smart',
        customer_id: 101,
        customer_name: 'Grand Nile Hotel',
        previous_salesperson: 'Mona Mohamed',
        current_salesperson: 'Mona Mohamed',
        previous_orders: 4,
        current_orders: 5,
        previous_sales: 200000,
        current_sales: 250000,
        retention_status: 'RETAINED',
        sales_change_pct: 25.0,
        previous_last_order_at: '2026-06-25',
        current_last_order_at: '2026-07-28'
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    await salesReps.retentionDetails({
      month: '2026-07-01',
      salesperson: 'Mona Mohamed',
      companyName: null,
      status: 'RETAINED',
      limit: 50,
      offset: 0,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_retention_details', {
      p_month: '2026-07-01',
      p_salesperson: 'Mona Mohamed',
      p_company_name: null,
      p_status: 'RETAINED',
      p_limit: 50,
      p_offset: 0,
    });
  });

  it('Verify parameter mapping for analytics_sales_rep_daily_summary', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        report_date: '2026-08-03',
        salesperson: 'Reham Maher',
        company_name: 'Horeca Smart',
        orders_count: 11,
        unique_customers: 9,
        sales_value: 100036.60,
        average_order_value: 9094.24,
        orders_rank: 1
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await salesReps.daily({
      date: '2026-08-03',
      companyName: 'Horeca Smart',
      salesperson: 'Reham Maher',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_daily_summary', {
      p_date: '2026-08-03',
      p_company_name: 'Horeca Smart',
      p_salesperson: 'Reham Maher',
    });

    expect(res).toHaveLength(1);
    expect(res[0].salesperson).toBe('Reham Maher');
    expect(res[0].ordersCount).toBe(11);
    expect(res[0].uniqueCustomers).toBe(9);
    expect(res[0].salesValue).toBe(100036.60);
    expect(res[0].ordersRank).toBe(1);
  });

  it('Verify parameter mapping for analytics_sales_rep_daily_kpis', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        requested_date: '2026-08-04',
        report_date: '2026-08-04',
        orders_count: 10,
        unique_customers: 10,
        active_salespeople: 6,
        representative_company_rows: 6,
        sales_value: 1508146.34,
        average_order_value: 150814.634,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await salesReps.dailyKpis({
      date: '2026-08-04',
      companyName: null,
      salesperson: null,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_daily_kpis', {
      p_date: '2026-08-04',
      p_company_name: null,
      p_salesperson: null,
    });

    expect(res).toHaveLength(1);
    expect(res[0].ordersCount).toBe(10);
    expect(res[0].salesValue).toBe(1508146.34);
    expect(res[0].uniqueCustomers).toBe(10);
    expect(res[0].activeSalespeople).toBe(6);
  });

  it('Verify parameter mapping for analytics_sales_rep_daily_actions', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        action_rank: 1,
        customer_id: 201,
        customer_name: 'شركة اسينا للمقاولات',
        company_name: 'MAS',
        salesperson: 'Haddil Haron',
        priority: 'HIGH',
        action_type: 'WIN_BACK',
        action_reason: 'No order in 33 days',
        risk: 'HIGH',
        last_order_date: '2026-07-08',
        days_since_last_order: 33,
        median_buying_interval: 14,
        previous_30d_sales: 940000,
        recent_30d_sales: 0,
        sales_change_pct: -100,
        recovery_opportunity: 940000
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await salesReps.dailyActions({
      asOfDate: '2026-08-10',
      salesperson: 'Haddil Haron',
      companyName: 'MAS',
      priority: 'HIGH',
      actionType: 'WIN_BACK',
      search: 'أسينا',
      limit: 20,
      offset: 0
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_daily_actions', {
      p_as_of_date: '2026-08-10',
      p_salesperson: 'Haddil Haron',
      p_company_name: 'MAS',
      p_priority: 'HIGH',
      p_action_type: 'WIN_BACK',
      p_search: 'أسينا',
      p_limit: 20,
      p_offset: 0
    });

    expect(res).toHaveLength(1);
    expect(res[0].actionRank).toBe(1);
    expect(res[0].customerName).toBe('شركة اسينا للمقاولات');
    expect(res[0].recoveryOpportunity).toBe(940000);
  });

  it('Verify parameter mapping for analytics_sales_rep_action_summary', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        total_customers: 87,
        actionable_customers: 29,
        high_priority: 14,
        medium_priority: 21,
        low_priority: 52,
        win_back_customers: 6,
        declining_customers: 18,
        overdue_customers: 5,
        transfer_review_customers: 0,
        total_recovery_opportunity: 7324763.86,
        high_priority_recovery_opportunity: 6392346.49,
        previous_30d_sales: 31112876.90,
        recent_30d_sales: 48594412.06
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await salesReps.actionSummary({
      asOfDate: '2026-08-10',
      salesperson: 'Haddil Haron',
      companyName: null
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_action_summary', {
      p_as_of_date: '2026-08-10',
      p_salesperson: 'Haddil Haron',
      p_company_name: null
    });

    expect(res).toHaveLength(1);
    expect(res[0].totalCustomers).toBe(87);
    expect(res[0].actionableCustomers).toBe(29);
    expect(res[0].highPriority).toBe(14);
    expect(res[0].totalRecoveryOpportunity).toBe(7324763.86);
  });

  it('Verify parameter mapping for analytics_sales_rep_recovery_pipeline', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 201,
        customer_name: 'Chicken Balalm',
        company_name: 'MAS',
        salesperson: 'Haddil Haron',
        priority: 'HIGH',
        action_type: 'RECOVER_DECLINE',
        previous_30d_sales: 1451090.51,
        recent_30d_sales: 609375.44,
        sales_gap: 841715.07,
        sales_change_pct: -58.01,
        days_since_last_order: 12,
        recovery_opportunity: 841715.07
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await salesReps.recoveryPipeline({
      asOfDate: '2026-08-10',
      salesperson: 'Haddil Haron',
      companyName: null,
      limit: 10
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_recovery_pipeline', {
      p_as_of_date: '2026-08-10',
      p_salesperson: 'Haddil Haron',
      p_company_name: null,
      p_limit: 10
    });

    expect(res).toHaveLength(1);
    expect(res[0].customerName).toBe('Chicken Balalm');
    expect(res[0].recoveryOpportunity).toBe(841715.07);
  });

  it('Verify parameter mapping for analytics_sales_rep_customer_priorities', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { priority: 'HIGH', customers_count: 14, customers_pct: 16.09, recovery_opportunity: 6392346.49 },
        { priority: 'MEDIUM', customers_count: 21, customers_pct: 24.14, recovery_opportunity: 856861.29 },
        { priority: 'LOW', customers_count: 52, customers_pct: 59.77, recovery_opportunity: 75556.08 }
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await salesReps.customerPriorities({
      asOfDate: '2026-08-10',
      salesperson: 'Haddil Haron',
      companyName: null
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_rep_customer_priorities', {
      p_as_of_date: '2026-08-10',
      p_salesperson: 'Haddil Haron',
      p_company_name: null
    });

    expect(res).toHaveLength(3);
    expect(res[0].priority).toBe('HIGH');
    expect(res[0].customersCount).toBe(14);
    expect(res[0].recoveryOpportunity).toBe(6392346.49);
  });
});
