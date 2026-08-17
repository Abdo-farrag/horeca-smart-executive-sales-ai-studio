import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sales } from '../sales';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '../../lib/supabase';

describe('Sales SDK Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Verify parameter mapping for analytics_sales_executive_kpis', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        sales_value: 64749427.11,
        orders_count: 1460,
        active_customers: 501,
        average_order_value: 44348.92,
        previous_sales_value: 43910000,
        revenue_growth_pct: 47.46
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await sales.executive({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      companyName: 'Horeca Smart',
      salesperson: null,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_executive_kpis_v2', {
      p_start_date: '2026-07-01',
      p_end_date: '2026-07-31',
      p_company_name: 'Horeca Smart',
      p_salesperson: null,
      p_governorate_code: null,
      p_area_code: null,
      p_customer_id: null,
      p_product_id: null,
    });

    expect(res).toHaveLength(1);
    expect(res[0].salesValue).toBe(64749427.11);
    expect(res[0].ordersCount).toBe(1460);
  });

  it('Verify parameter mapping for analytics_sales_daily_summary', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        order_date: '2026-07-01',
        horeca_sales: 10000,
        mas_sales: 5000,
        total_sales: 15000,
        orders_count: 10
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    await sales.daily({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      companyName: null,
      salesperson: null,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_daily_summary_v2', {
      p_start_date: '2026-07-01',
      p_end_date: '2026-07-31',
      p_company_name: null,
      p_salesperson: null,
      p_governorate_code: null,
      p_area_code: null,
      p_customer_id: null,
      p_product_id: null,
    });
  });

  it('Verify parameter mapping for analytics_top_customers', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 101,
        customer_name: 'Hotel Al Masra',
        company_name: 'Horeca Smart',
        orders_count: 15,
        sales_value: 500000,
        average_order_value: 33333.33,
        last_order_at: '2026-07-30',
        primary_salesperson: 'Mona Mohamed'
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    await sales.topCustomers({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      companyName: null,
      salesperson: null,
      limit: 20,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_top_customers_v2', {
      p_start_date: '2026-07-01',
      p_end_date: '2026-07-31',
      p_company_name: null,
      p_salesperson: null,
      p_governorate_code: null,
      p_area_code: null,
      p_customer_id: null,
      p_product_id: null,
      p_limit: 20,
    });
  });

  it('Verify parameter mapping for analytics_sales_data_freshness', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        max_order_date: '2026-08-04',
        max_source_updated_at: '2026-08-04T12:00:06.558+00:00',
        last_successful_sales_sync_started_at: '2026-08-04T12:00:02.275+00:00',
        last_successful_sales_sync_finished_at: '2026-08-04T12:00:19.8+00:00',
        last_sales_sync_rows_count: 15209,
        last_failed_full_sync_started_at: '2026-08-04T08:46:50.294079+00:00',
        last_failed_full_sync_message: "{'message': 'DELETE requires a WHERE clause'}"
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await sales.freshness();

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_sales_data_freshness', {});
    expect(res).toHaveLength(1);
    expect(res[0].maxOrderDate).toBe('2026-08-04');
    expect(res[0].lastSalesSyncRowsCount).toBe(15209);
  });
});
