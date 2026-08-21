import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customers } from '../customers';
import { sales } from '../sales';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '../../lib/supabase';

describe('Customer Action Center Freshness & Enterprise Scope Tests (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. recent buyer is not falsely shown as WIN_BACK', async () => {
    // Customer 33927 bought on 2026-08-17, asOfDate is 2026-08-19 (2 days ago)
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 33927,
        customer_name: 'ناديةمحمد عبد الغنى ابو طالب',
        company_name: 'MAS',
        salesperson: 'AbdElrhaman Farrag',
        priority: 'HIGH',
        action_type: 'MONITOR',
        action_reason: 'أداء مستقر - استمرار المتابعة الدورية',
        last_order_date: '2026-08-17',
        days_since_last_order: 2,
        median_buying_interval: 10,
        previous_30d_sales: 1500000,
        recent_30d_sales: 2084160,
        sales_change_pct: 38.94,
        recovery_opportunity: 0,
        risk: 'LOW',
        salesperson_changed: false,
      }],
      error: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.actionCenter({ asOfDate: '2026-08-19' });
    const target = res.find((r) => r.customerId === 33927);

    expect(target).toBeDefined();
    expect(target!.lastOrderDate).toBe('2026-08-17');
    expect(target!.daysSinceLastOrder).toBe(2);
    expect(target!.actionType).not.toBe('WIN_BACK');
    expect(target!.actionType).not.toBe('REACTIVATE_LOST');
  });

  it('2. recent buyer is not falsely shown as OVERDUE', async () => {
    // Customer has median interval of 7 days, last order was 3 days ago (2026-08-16 vs asOf 2026-08-19)
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 33824,
        customer_name: 'Chicken Balalm',
        company_name: 'MAS',
        salesperson: 'Haddil Haron',
        priority: 'HIGH',
        action_type: 'RECOVER_DECLINE',
        action_reason: 'انخفاض في المبيعات مقارنة بالفترة السابقة',
        last_order_date: '2026-08-16',
        days_since_last_order: 3,
        median_buying_interval: 7,
        previous_30d_sales: 950000,
        recent_30d_sales: 340231.58,
        sales_change_pct: -64.19,
        recovery_opportunity: 609768.42,
        risk: 'HIGH',
        salesperson_changed: false,
      }],
      error: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.actionCenter({ asOfDate: '2026-08-19' });
    const target = res.find((r) => r.customerId === 33824);

    expect(target).toBeDefined();
    expect(target!.lastOrderDate).toBe('2026-08-16');
    expect(target!.daysSinceLastOrder).toBe(3);
    expect(target!.actionType).not.toBe('OVERDUE_FOLLOWUP');
  });

  it('3. cross-company customer active in MAS but stale in Horeca Smart is resolved at enterprise grain', async () => {
    // In database when p_company_name is NULL, if raw RPC returns 2 separate company rows for customer 33927:
    // Row 1: Horeca Smart, last_order 2026-07-08 (42 days ago, stale WIN_BACK)
    // Row 2: MAS, last_order 2026-08-17 (2 days ago, active)
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        {
          customer_id: 33927,
          customer_name: 'ناديةمحمد عبد الغنى ابو طالب',
          company_name: 'Horeca Smart',
          salesperson: 'AbdElrhaman Farrag',
          priority: 'HIGH',
          action_type: 'WIN_BACK',
          action_reason: 'عميل متوقف عن الشراء لأكثر من 30 يوما',
          last_order_date: '2026-07-08',
          days_since_last_order: 42,
          median_buying_interval: 10,
          previous_30d_sales: 500000,
          recent_30d_sales: 0,
          sales_change_pct: -100,
          recovery_opportunity: 500000,
          risk: 'MEDIUM',
          salesperson_changed: false,
        },
        {
          customer_id: 33927,
          customer_name: 'ناديةمحمد عبد الغنى ابو طالب',
          company_name: 'MAS',
          salesperson: 'AbdElrhaman Farrag',
          priority: 'LOW',
          action_type: 'MONITOR',
          action_reason: 'أداء مستقر - استمرار المتابعة الدورية',
          last_order_date: '2026-08-17',
          days_since_last_order: 2,
          median_buying_interval: 10,
          previous_30d_sales: 1000000,
          recent_30d_sales: 2084160,
          sales_change_pct: 108.41,
          recovery_opportunity: 0,
          risk: 'LOW',
          salesperson_changed: false,
        },
      ],
      error: null,
      status: 200,
      statusText: 'OK',
    } as any);

    // When queried with companyName = null (Enterprise scope)
    const enterpriseRes = await customers.actionCenter({ asOfDate: '2026-08-19', companyName: null });
    
    // Must consolidate to 1 enterprise customer row without duplicate/ghost WIN_BACK row
    const targetRows = enterpriseRes.filter((r) => r.customerId === 33927);
    expect(targetRows).toHaveLength(1);
    const enterpriseCustomer = targetRows[0];
    expect(enterpriseCustomer.lastOrderDate).toBe('2026-08-17');
    expect(enterpriseCustomer.daysSinceLastOrder).toBe(2);
    expect(enterpriseCustomer.actionType).not.toBe('WIN_BACK');
    expect(enterpriseCustomer.recent30dSales).toBe(2084160);
  });

  it('4. null or missing asOfDate falls back gracefully without hardcoded dates', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 32582,
        customer_name: 'نولا',
        company_name: 'MAS',
        salesperson: 'Haddil Haron',
        priority: 'LOW',
        action_type: 'MONITOR',
        action_reason: 'أداء مستقر - استمرار المتابعة الدورية',
        last_order_date: '2026-08-18',
        days_since_last_order: 1,
        median_buying_interval: 4,
        previous_30d_sales: 1253055.70,
        recent_30d_sales: 1528778.70,
        sales_change_pct: 22.0,
        recovery_opportunity: 0,
        risk: 'LOW',
        salesperson_changed: false,
      }],
      error: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.actionCenter({ asOfDate: null });
    expect(res).toHaveLength(1);
    expect(res[0].customerId).toBe(32582);
    expect(res[0].daysSinceLastOrder).toBe(1);
    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_action_center_v2', expect.objectContaining({
      p_as_of_date: null,
    }));
  });

  it('5. explicit historical asOfDate still works correctly and is passed to RPC', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 30709,
        customer_name: 'خالد حسين (عميل - مورد)',
        company_name: 'MAS',
        salesperson: 'Haddil Haron',
        priority: 'MEDIUM',
        action_type: 'MONITOR',
        action_reason: 'أداء مستقر',
        last_order_date: '2026-07-10',
        days_since_last_order: 5,
        median_buying_interval: 3,
        previous_30d_sales: 400000,
        recent_30d_sales: 450000,
        sales_change_pct: 12.5,
        recovery_opportunity: 0,
        risk: 'LOW',
        salesperson_changed: false,
      }],
      error: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.actionCenter({ asOfDate: '2026-07-15' });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_action_center_v2', expect.objectContaining({
      p_as_of_date: '2026-07-15',
    }));
    expect(res[0].lastOrderDate).toBe('2026-07-10');
    expect(res[0].daysSinceLastOrder).toBe(5);
  });
});
