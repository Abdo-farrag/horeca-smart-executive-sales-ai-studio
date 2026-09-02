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

  it('Verify parameter mapping for analytics_product_360 live period_qty schema', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        product_id: 8516,
        product_name: '[202069] Juhayna Barista Milk 1 L - 6 Pack',
        product_category: null,
        period_sales: 3817985.56,
        period_qty: 15421,
        period_orders: 13,
        period_customers: 3,
        period_salespeople: 1,
        period_companies: 1,
        average_unit_value: 247.58352636015823,
        first_order_date: '2026-08-01',
        last_order_date: '2026-08-07',
        lifetime_sales: 11384199.56,
        lifetime_qty: 45878,
        lifetime_orders: 63,
        lifetime_customers: 9,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await products.get360({
      productId: 8516,
      startDate: '2026-08-01',
      endDate: '2026-08-09',
      companyName: 'MAS',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_360', {
      p_product_id: 8516,
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-09',
      p_company_name: 'MAS',
    });

    expect(res).toHaveLength(1);
    expect(res[0].productId).toBe(8516);
    expect(res[0].periodOrders).toBe(13);
    expect(res[0].periodCustomers).toBe(3);
    expect(res[0].periodSalespeople).toBe(1);
    expect(res[0].periodCompanies).toBe(1);
    expect(res[0].periodQuantity).toBe(15421);
    expect(res[0].periodSales).toBe(3817985.56);
    expect(res[0].averageUnitValue).toBeCloseTo(247.58352636015823, 8);
    expect(res[0].lifetimeOrders).toBe(63);
    expect(res[0].lifetimeCustomers).toBe(9);
    expect(res[0].lifetimeQuantity).toBe(45878);
    expect(res[0].lifetimeSales).toBe(11384199.56);
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

    const res = await products.trend({
      productId: 8516,
      companyName: null,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_trend', {
      p_product_id: 8516,
      p_company_name: null,
    });

    expect(res).toHaveLength(1);
    expect(res[0].orderMonth).toBe('2026-08-01');
  });

  it('Verify parameter mapping for analytics_product_top_customers', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 101,
        customer_name: 'Hotel Al Masra',
        company_name: 'Horeca Smart',
        orders_count: 5,
        quantity_sold: 1000,
        sales_value: 250000,
        last_order_date: '2026-08-02',
        primary_salesperson: 'Reham Maher',
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await products.topCustomers({
      productId: 8516,
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      limit: 10,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_top_customers', {
      p_product_id: 8516,
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-04',
      p_company_name: null,
      p_limit: 10,
      p_offset: null,
    });

    expect(res).toHaveLength(1);
    expect(res[0].customerId).toBe(101);
  });

  it('Verify parameter mapping for analytics_product_top_salespeople', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        salesperson: 'Reham Maher',
        company_name: 'Horeca Smart',
        orders_count: 11,
        unique_customers: 3,
        quantity_sold: 14966,
        sales_value: 3704906.00,
        average_order_value: 336809.64,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await products.topSalespeople({
      productId: 8516,
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      limit: 10,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_top_salespeople', {
      p_product_id: 8516,
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-04',
      p_company_name: null,
      p_limit: 10,
    });
  });
});
