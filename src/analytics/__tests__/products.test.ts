import { describe, it, expect, vi, beforeEach } from 'vitest';
import { products } from '../products';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '../../lib/supabase';

describe('Products SDK Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Verify parameter mapping for analytics_product_summary', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        product_id: 8516,
        product_name: '[202069] Juhayna Barista Milk 1 L - 6 Pack',
        product_category: null,
        orders_count: 11,
        unique_customers: 3,
        quantity_sold: 14966,
        sales_value: 3704906.00,
        average_unit_value: 247.55,
        first_order_date: '2026-08-01',
        last_order_date: '2026-08-02',
        active_salespeople: 1,
        companies_count: 1,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await products.summary({
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      companyName: 'Horeca Smart',
      salesperson: null,
      search: 'Juhayna',
      limit: 50,
      offset: 0,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_summary_v2', {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-04',
      p_company_name: 'Horeca Smart',
      p_salesperson: null,
      p_governorate_code: null,
      p_area_code: null,
      p_customer_id: null,
      p_product_id: null,
      p_search: 'Juhayna',
      p_limit: 50,
      p_offset: 0,
    });

    expect(res).toHaveLength(1);
    expect(res[0].productId).toBe(8516);
    expect(res[0].productName).toBe('[202069] Juhayna Barista Milk 1 L - 6 Pack');
    expect(res[0].salesValue).toBe(3704906.00);
    expect(res[0].quantitySold).toBe(14966);
  });

  it('Verify parameter mapping for analytics_product_360', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        product_id: 8516,
        product_name: '[202069] Juhayna Barista Milk 1 L - 6 Pack',
        product_category: null,
        period_sales: 3704906.00,
        period_quantity: 14966,
        period_orders: 11,
        period_customers: 3,
        period_salespeople: 1,
        period_companies: 1,
        average_unit_value: 247.55,
        first_order_date: '2026-08-01',
        last_order_date: '2026-08-02',
        lifetime_sales: 7920429.00,
        lifetime_quantity: 31890,
        lifetime_orders: 104,
        lifetime_customers: 34,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await products.get360({
      productId: 8516,
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      companyName: null,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_360', {
      p_product_id: 8516,
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-04',
      p_company_name: null,
    });

    expect(res).toHaveLength(1);
    expect(res[0].productId).toBe(8516);
    expect(res[0].periodOrders).toBe(11);
    expect(res[0].periodCustomers).toBe(3);
    expect(res[0].periodSalespeople).toBe(1);
    expect(res[0].periodCompanies).toBe(1);
    expect(res[0].periodQuantity).toBe(14966);
    expect(res[0].periodSales).toBe(3704906.00);
    expect(res[0].averageUnitValue).toBe(247.55);
    expect(res[0].lifetimeOrders).toBe(104);
    expect(res[0].lifetimeCustomers).toBe(34);
    expect(res[0].lifetimeQuantity).toBe(31890);
    expect(res[0].lifetimeSales).toBe(7920429.00);
  });

  it('Verify parameter mapping for analytics_product_trend', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        order_month: '2026-08-01',
        sales_value: 3704906.00,
        quantity_sold: 14966,
        orders_count: 11,
        unique_customers: 3,
        average_unit_value: 247.55,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await products.trend({ productId: 8516, companyName: null });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_trend', { p_product_id: 8516, p_company_name: null });
    expect(res).toHaveLength(1);
    expect(res[0].orderMonth).toBe('2026-08-01');
  });

  it('Verify parameter mapping for analytics_product_top_customers', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ customer_id: 101, customer_name: 'Hotel Al Masra', company_name: 'Horeca Smart', orders_count: 5, quantity_sold: 1000, sales_value: 250000, last_order_date: '2026-08-02', primary_salesperson: 'Reham Maher' }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.topCustomers({ productId: 8516, startDate: '2026-08-01', endDate: '2026-08-04', limit: 10 });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_top_customers', { p_product_id: 8516, p_start_date: '2026-08-01', p_end_date: '2026-08-04', p_company_name: null, p_limit: 10, p_offset: null });
    expect(res).toHaveLength(1);
    expect(res[0].customerId).toBe(101);
  });

  it('Verify parameter mapping for analytics_product_top_salespeople', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ salesperson: 'Reham Maher', company_name: 'Horeca Smart', orders_count: 11, unique_customers: 3, quantity_sold: 14966, sales_value: 3704906.00, average_order_value: 336809.64 }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.topSalespeople({ productId: 8516, startDate: '2026-08-01', endDate: '2026-08-04', limit: 10 });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_top_salespeople', { p_product_id: 8516, p_start_date: '2026-08-01', p_end_date: '2026-08-04', p_company_name: null, p_limit: 10, p_offset: null });
    expect(res).toHaveLength(1);
    expect(res[0].salesperson).toBe('Reham Maher');
  });

  it('Verify parameter mapping for analytics_product_daily_trend', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ report_date: '2026-08-01', orders_count: 5, customers_count: 2, quantity_sold: 500, sales_value: 120000, average_unit_value: 240 }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.dailyTrend({ productId: 8516, startDate: '2026-08-01', endDate: '2026-08-04', companyName: 'Horeca Smart' });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_daily_trend', { p_product_id: 8516, p_start_date: '2026-08-01', p_end_date: '2026-08-04', p_company_name: 'Horeca Smart' });
    expect(res).toHaveLength(1);
    expect(res[0].reportDate).toBe('2026-08-01');
    expect(res[0].salesValue).toBe(120000);
  });

  it('Verify parameter mapping for analytics_product_company_split', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ company_name: 'Horeca Smart', orders_count: 10, customers_count: 3, quantity_sold: 1000, sales_value: 250000, sales_share_pct: 100.0 }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.companySplit({ productId: 8516, startDate: '2026-08-01', endDate: '2026-08-04' });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_company_split', { p_product_id: 8516, p_start_date: '2026-08-01', p_end_date: '2026-08-04' });
    expect(res).toHaveLength(1);
    expect(res[0].companyName).toBe('Horeca Smart');
    expect(res[0].salesSharePct).toBe(100.0);
  });

  it('Verify parameter mapping for analytics_product_lifecycle', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ first_sale_date: '2026-01-01', last_sale_date: '2026-08-02', days_since_last_sale: 4, lifetime_orders: 104, lifetime_customers: 34, lifetime_quantity: 31890, lifetime_sales: 7920429.00, active_months: 8, average_days_between_sales: 2.1 }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.lifecycle(8516);
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_lifecycle', { p_product_id: 8516 });
    expect(res).toHaveLength(1);
    expect(res[0].firstSaleDate).toBe('2026-01-01');
    expect(res[0].daysSinceLastSale).toBe(4);
  });

  it('Verify parameter mapping for analytics_product_data_quality', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ product_id: 8516, product_name: '[202069] Juhayna Barista Milk 1 L - 6 Pack', internal_reference: '202069', barcode: null, category_name: null, cost: 200, sale_price: 247.55, product_type: 'consu', is_active: true, has_name: true, has_internal_reference: true, has_barcode: false, has_category: false, has_cost: true, has_sale_price: true, quality_score: 66.67 }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.dataQuality(8516);
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_data_quality', { p_product_id: 8516 });
    expect(res).toHaveLength(1);
    expect(res[0].qualityScore).toBe(66.67);
    expect(res[0].hasBarcode).toBe(false);
  });

  it('Verify parameter mapping for analytics_product_alerts', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ alert_code: 'NO_RECENT_SALES', severity: 'high', title_ar: 'توقف المبيعات المؤخرة', details_ar: 'لم يتم تسجبل مبيعات للمنتج منذ أكثر من 30 يوماً', metric_value: 35 }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.alerts({ productId: 8516, asOfDate: '2026-08-04', companyName: null });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_alerts', { p_product_id: 8516, p_as_of_date: '2026-08-04', p_company_name: null });
    expect(res).toHaveLength(1);
    expect(res[0].alertCode).toBe('NO_RECENT_SALES');
    expect(res[0].severity).toBe('high');
  });

  it('Verify parameter mapping for analytics_product_score', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ sales_strength_score: 35, growth_score: 18, coverage_score: 15, consistency_score: 8, data_quality_score: 7, total_score: 83, methodology_version: 'P1_v1' }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.score({ productId: 8516, startDate: '2026-08-01', endDate: '2026-08-04', companyName: null });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_score', { p_product_id: 8516, p_start_date: '2026-08-01', p_end_date: '2026-08-04', p_company_name: null });
    expect(res).toHaveLength(1);
    expect(res[0].totalScore).toBe(83);
    expect(res[0].methodologyVersion).toBe('P1_v1');
  });

  it('Verify parameter mapping for analytics_product_reconciliation', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ order_sales: 3704906.00, product_line_sales: 3704906.00, difference_value: 0, reconciliation_pct: 100.0, status: 'verified' }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.reconciliation({ startDate: '2026-08-01', endDate: '2026-08-04' });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_reconciliation', { p_start_date: '2026-08-01', p_end_date: '2026-08-04', p_company_name: null });
    expect(res).toHaveLength(1);
    expect(res[0].status).toBe('verified');
    expect(res[0].reconciliationPct).toBe(100.0);
  });

  it('Verify parameter mapping for analytics_product_customer_retention', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ customer_id: 101, customer_name: 'Super Market Cairo', company_name: 'Horeca Smart', primary_salesperson: 'Ahmed Hassan', previous_orders: 8, current_orders: 0, previous_quantity: 120, current_quantity: 0, previous_sales: 218050.50, current_sales: 0, sales_change_pct: -100.0, previous_last_order: '2026-06-15', current_last_order: null, status: 'STOPPED_BUYING', recovery_priority: 'HIGH' }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.customerRetention({ productId: 8516, startDate: '2026-07-01', endDate: '2026-07-31', companyName: 'Horeca Smart' });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_customer_retention', { p_product_id: 8516, p_start_date: '2026-07-01', p_end_date: '2026-07-31', p_company_name: 'Horeca Smart' });
    expect(res).toHaveLength(1);
    expect(res[0].customerId).toBe(101);
    expect(res[0].customerName).toBe('Super Market Cairo');
    expect(res[0].status).toBe('STOPPED_BUYING');
    expect(res[0].recoveryPriority).toBe('HIGH');
  });

  it('Verify parameter mapping for analytics_product_customer_retention_summary', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({ data: [{ previous_customers: 20, current_customers: 24, retained_customers: 4, new_customers: 14, stopped_customers: 10, declining_customers: 6, previous_sales: 949455.50, current_sales: 3266067.50, stopped_sales_opportunity: 218050.50, declining_sales_gap: 90840.00, retention_rate: 50.00 }], error: null, count: null, status: 200, statusText: 'OK' } as any);
    const res = await products.customerRetentionSummary({ productId: 8516, startDate: '2026-07-01', endDate: '2026-07-31', companyName: null });
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_customer_retention_summary', { p_product_id: 8516, p_start_date: '2026-07-01', p_end_date: '2026-07-31', p_company_name: null });
    expect(res).toHaveLength(1);
    expect(res[0].previousCustomers).toBe(20);
    expect(res[0].currentCustomers).toBe(24);
    expect(res[0].retainedCustomers).toBe(4);
    expect(res[0].newToProductCustomers).toBe(14);
    expect(res[0].stoppedBuyingCustomers).toBe(10);
    expect(res[0].decliningCustomers).toBe(6);
    expect(res[0].retentionRate).toBe(50.00);
    expect(res[0].stoppedSalesOpportunity).toBe(218050.50);
    expect(res[0].decliningSalesGap).toBe(90840.00);
  });
});
