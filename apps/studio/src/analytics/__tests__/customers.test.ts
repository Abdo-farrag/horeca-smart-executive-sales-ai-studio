import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customers } from '../customers';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '../../lib/supabase';

describe('Customers SDK Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Verify parameter mapping for analytics_customer_summary', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 30709,
        customer_name: 'خالد حسين (عميل - مورد)',
        company_name: 'MAS',
        primary_salesperson: 'Haddil Haron',
        orders_count: 11,
        sales_value: 5257626,
        average_order_value: 477966,
        first_order_date: '2026-08-01',
        last_order_date: '2026-08-02',
        days_since_last_order: 2,
        customer_status: 'ACTIVE',
        previous_period_sales: 0,
        sales_change_pct: null,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.summary({
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      companyName: 'MAS',
      salesperson: null,
      status: 'ACTIVE',
      search: 'خالد',
      limit: 10,
      offset: 0,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_summary_v2', {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-04',
      p_company_name: 'MAS',
      p_salesperson: null,
      p_governorate_code: null,
      p_area_code: null,
      p_customer_id: null,
      p_product_id: null,
      p_status: 'ACTIVE',
      p_search: 'خالد',
      p_limit: 10,
      p_offset: 0,
    });

    expect(res).toHaveLength(1);
    expect(res[0].customerId).toBe(30709);
    expect(res[0].salesValue).toBe(5257626);
    expect(res[0].ordersCount).toBe(11);
  });

  it('Verify parameter mapping for analytics_customer_360', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 30709,
        customer_name: 'خالد حسين (عميل - مورد)',
        company_name: 'MAS',
        current_salesperson: 'Haddil Haron',
        phone: null,
        mobile: null,
        email: null,
        city: null,
        period_orders: 11,
        period_sales: 5257626,
        average_order_value: 477966,
        first_order_date: '2026-06-03',
        last_order_date: '2026-08-02',
        days_since_last_order: 2,
        average_days_between_orders: 1.818,
        lifetime_orders: 33,
        lifetime_sales: 12601226.54,
        unique_products_count: 0,
        customer_status: 'ACTIVE',
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.get360({
      customerId: 30709,
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      companyName: 'MAS',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_360', {
      p_customer_id: 30709,
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-04',
      p_company_name: 'MAS',
    });

    expect(res).toHaveLength(1);
    expect(res[0].customerId).toBe(30709);
    expect(res[0].periodOrders).toBe(11);
    expect(res[0].lifetimeSales).toBe(12601226.54);
  });

  it('Verify parameter mapping for analytics_customer_trend', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        order_month: '2026-08-01',
        orders_count: 11,
        sales_value: 5257626,
        average_order_value: 477966,
        active_salespeople: 1,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.trend({
      customerId: 30709,
      companyName: 'MAS',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_trend', {
      p_customer_id: 30709,
      p_company_name: 'MAS',
    });

    expect(res).toHaveLength(1);
    expect(res[0].orderMonth).toBe('2026-08-01');
    expect(res[0].salesValue).toBe(5257626);
  });

  it('Verify parameter mapping for analytics_customer_orders', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        order_id: 13578,
        order_name: 'MS00734',
        order_date: '2026-08-02',
        company_name: 'MAS',
        salesperson: 'Haddil Haron',
        order_value: 199732.5,
        lines_count: 1,
        products_count: 1,
        total_qty: 807,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.orders({
      customerId: 30709,
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      companyName: 'MAS',
      limit: 10,
      offset: 0,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_orders', {
      p_customer_id: 30709,
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-04',
      p_company_name: 'MAS',
      p_limit: 10,
      p_offset: 0,
    });

    expect(res).toHaveLength(1);
    expect(res[0].orderName).toBe('MS00734');
    expect(res[0].orderValue).toBe(199732.5);
  });

  it('Verify parameter mapping and validation values for analytics_customer_buying_frequency', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        orders_count: 34,
        active_days: 20,
        first_order_date: '2026-06-03',
        last_order_date: '2026-08-06',
        average_days_between_orders: 1.94,
        median_days_between_orders: 1,
        days_since_last_order: 4,
        expected_next_order_date: '2026-08-07',
        frequency_status: 'OVERDUE',
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.buyingFrequency({
      customerId: 30709,
      companyName: 'MAS',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_buying_frequency', {
      p_customer_id: 30709,
      p_company_name: 'MAS',
    });

    expect(res).toHaveLength(1);
    expect(res[0].ordersCount).toBe(34);
    expect(res[0].activeDays).toBe(20);
    expect(res[0].averageDaysBetweenOrders).toBe(1.94);
    expect(res[0].medianDaysBetweenOrders).toBe(1);
    expect(res[0].frequencyStatus).toBe('OVERDUE');
  });

  it('Verify parameter mapping and validation values for analytics_customer_favorite_products', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        product_id: 8516,
        product_name: 'Juhayna Barista Milk 1 L - 6 Pack',
        orders_count: 21,
        quantity: 21997,
        sales_value: 5447507.50,
        sales_share_pct: 42.46,
        last_order_date: '2026-08-06',
        primary_salesperson: 'Haddil Haron',
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.favoriteProducts({
      customerId: 30709,
      startDate: '2026-06-01',
      endDate: '2026-08-10',
      companyName: 'MAS',
      limit: 20,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_favorite_products', {
      p_customer_id: 30709,
      p_start_date: '2026-06-01',
      p_end_date: '2026-08-10',
      p_company_name: 'MAS',
      p_limit: 20,
    });

    expect(res).toHaveLength(1);
    expect(res[0].productId).toBe(8516);
    expect(res[0].quantity).toBe(21997);
    expect(res[0].salesValue).toBe(5447507.50);
    expect(res[0].salesSharePct).toBe(42.46);
  });

  it('Verify parameter mapping and validation values for analytics_customer_salesperson_history', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { order_month: '2026-06', salesperson_name: 'Haddil Haron', orders_count: 7, sales_value: 1114699.21, first_order_date: '2026-06-03', last_order_date: '2026-06-29', is_primary: true },
        { order_month: '2026-07', salesperson_name: 'Haddil Haron', orders_count: 15, sales_value: 6228901.33, first_order_date: '2026-07-01', last_order_date: '2026-07-30', is_primary: true },
        { order_month: '2026-08', salesperson_name: 'Haddil Haron', orders_count: 12, sales_value: 5485626.00, first_order_date: '2026-08-01', last_order_date: '2026-08-06', is_primary: true },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.salespersonHistory({
      customerId: 30709,
      companyName: 'MAS',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_salesperson_history', {
      p_customer_id: 30709,
      p_company_name: 'MAS',
    });

    expect(res).toHaveLength(3);
    expect(res[0].salespersonName).toBe('Haddil Haron');
    expect(res[0].salesValue).toBe(1114699.21);
    expect(res[1].salesValue).toBe(6228901.33);
    expect(res[2].salesValue).toBe(5485626.00);
  });

  it('Verify parameter mapping and validation values for analytics_customer_risk', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        risk_level: 'LOW',
        risk_reason: 'Regular purchasing pattern with strong volume growth',
        recovery_priority: 'LOW',
        last_order_date: '2026-08-06',
        days_since_last_order: 4,
        median_buying_interval: 1,
        recent_30day_sales: 7878818.83,
        previous_30day_sales: 4736567.71,
        sales_change_pct: 66.34,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.risk({
      customerId: 30709,
      companyName: 'MAS',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_risk', {
      p_customer_id: 30709,
      p_company_name: 'MAS',
    });

    expect(res).toHaveLength(1);
    expect(res[0].riskLevel).toBe('LOW');
    expect(res[0].recent30DaySales).toBe(7878818.83);
    expect(res[0].previous30DaySales).toBe(4736567.71);
    expect(res[0].salesChangePct).toBe(66.34);
  });

  it('Verify parameter mapping and validation values for analytics_customer_product_dropoff', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        product_id: 8139,
        product_name: 'Revana Oil Olein 20 L',
        previous_sales: 96285.70,
        current_sales: 0,
        previous_quantity: 100,
        current_quantity: 0,
        sales_change_pct: -100.0,
        status: 'STOPPED_BUYING',
        recovery_value: 96285.70,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.productDropoff({
      customerId: 30709,
      startDate: '2026-07-01',
      endDate: '2026-08-10',
      companyName: 'MAS',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_product_dropoff', {
      p_customer_id: 30709,
      p_start_date: '2026-07-01',
      p_end_date: '2026-08-10',
      p_company_name: 'MAS',
    });

    expect(res).toHaveLength(1);
    expect(res[0].productId).toBe(8139);
    expect(res[0].status).toBe('STOPPED_BUYING');
    expect(res[0].recoveryValue).toBe(96285.70);
  });

  it('Verify parameter mapping for analytics_customer_cross_sell_candidates', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { product_id: 8047, product_name: 'GSF Ranch Sauce', peer_customers_count: 12, peer_orders_count: 45, peer_sales_value: 320000, affinity_score: 88.5 },
        { product_id: 8040, product_name: 'Juhayna Whipping Cream', peer_customers_count: 10, peer_orders_count: 38, peer_sales_value: 290000, affinity_score: 82.1 },
        { product_id: 8567, product_name: 'El Nada Olein Oil', peer_customers_count: 8, peer_orders_count: 30, peer_sales_value: 210000, affinity_score: 75.0 },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.crossSellCandidates({
      customerId: 30709,
      companyName: 'MAS',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_cross_sell_candidates', {
      p_customer_id: 30709,
      p_start_date: null,
      p_end_date: null,
      p_company_name: 'MAS',
      p_limit: null,
    });

    expect(res).toHaveLength(3);
    expect(res[0].productName).toBe('GSF Ranch Sauce');
    expect(res[1].productName).toBe('Juhayna Whipping Cream');
    expect(res[2].productName).toBe('El Nada Olein Oil');
  });

  it('Verify parameter mapping for analytics_customer_portfolio_summary', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        total_customers: 670,
        high_priority: 64,
        medium_priority: 185,
        low_priority: 421,
        win_back_customers: 155,
        declining_customers: 104,
        overdue_customers: 32,
        salesperson_transfer_reviews: 19,
        total_recovery_opportunity: 17037396.32,
        high_priority_recovery_opportunity: 12845314.89,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.portfolioSummary({ asOfDate: '2026-08-10', companyName: 'MAS' });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_portfolio_summary', {
      p_as_of_date: '2026-08-10',
      p_company_name: 'MAS',
      p_salesperson: null,
    });

    expect(res[0].totalCustomers).toBe(670);
    expect(res[0].highPriority).toBe(64);
    expect(res[0].mediumPriority).toBe(185);
    expect(res[0].winBackCustomers).toBe(155);
    expect(res[0].totalRecoveryOpportunity).toBe(17037396.32);
  });

  it('Verify parameter mapping for analytics_customer_risk_distribution', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { risk_level: 'HIGH', customers_count: 95, customers_pct: 14.18, recovery_opportunity: 6350435.26 },
        { risk_level: 'MEDIUM', customers_count: 164, customers_pct: 24.48, recovery_opportunity: 9550853.09 },
        { risk_level: 'LOW', customers_count: 411, customers_pct: 61.34, recovery_opportunity: 1136107.97 },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.riskDistribution({ asOfDate: '2026-08-10' });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_risk_distribution', {
      p_as_of_date: '2026-08-10',
      p_company_name: null,
      p_salesperson: null,
    });

    expect(res).toHaveLength(3);
    expect(res[0].riskLevel).toBe('HIGH');
    expect(res[0].customersCount).toBe(95);
  });

  it('Verify parameter mapping for analytics_customer_action_center', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 30709,
        customer_name: 'خالد حسين (عميل - مورد)',
        company_name: 'MAS',
        salesperson: 'Haddil Haron',
        priority: 'HIGH',
        action_type: 'WIN_BACK',
        action_reason: 'توقف عن الشراء منذ 45 يوماً',
        last_order_date: '2026-06-25',
        days_since_last_order: 45,
        median_buying_interval: 7,
        previous_30d_sales: 120000,
        recent_30d_sales: 0,
        sales_change_pct: -100,
        recovery_opportunity: 120000,
        risk: 'HIGH',
        salesperson_changed: false,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.actionCenter({ priority: 'HIGH', limit: 10 });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_action_center_v2', {
      p_as_of_date: null,
      p_company_name: null,
      p_salesperson: null,
      p_priority: 'HIGH',
      p_risk: null,
      p_action_type: null,
      p_search: null,
      p_limit: 10,
      p_offset: null,
    });

    expect(res[0].customerId).toBe(30709);
    expect(res[0].actionType).toBe('WIN_BACK');
  });

  it('Verify parameter mapping for analytics_customer_recovery_opportunities', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        customer_id: 30101,
        customer_name: 'ناديةمحمد عبد الغنى ابو طالب',
        company_name: 'MAS',
        salesperson: 'Haddil Haron',
        recovery_value: 2571865.27,
        previous_30d_sales: 2571865.27,
        recent_30d_sales: 0,
        sales_decline_pct: -100,
        days_since_last_order: 33,
        action_reason: 'انقطاع كامل عن الطلب',
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.recoveryOpportunities({ limit: 5 });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_recovery_opportunities', {
      p_as_of_date: null,
      p_company_name: null,
      p_salesperson: null,
      p_limit: 5,
    });

    expect(res[0].recoveryValue).toBe(2571865.27);
  });

  it('Verify parameter mapping and column resolution for analytics_customer_retention_summary_v2', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        current_month: '2026-07-01',
        previous_active_customers: 85,
        retained_same_rep: 65,
        transferred_customers: 2,
        true_lost_customers: 18,
        new_customers: 21,
        company_retention_rate: 78.82,
        same_rep_retention_rate: 76.47,
        lost_previous_sales: 2814924.60,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await customers.retention({
      month: '2026-07-01',
      companyName: 'MAS',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_retention_summary_v2', {
      p_month: '2026-07-01',
      p_company_name: 'MAS',
      p_salesperson: null,
      p_governorate_code: null,
      p_area_code: null,
      p_customer_id: null,
      p_product_id: null,
    });

    expect(res).toHaveLength(1);
    // 1. retained_same_rep = 65 maps to retainedWithSameRep = 65
    expect(res[0].retainedWithSameRep).toBe(65);
    // 2. lost_previous_sales = 2814924.60 maps to lostCustomerRevenueEgp = 2814924.60
    expect(res[0].lostCustomerRevenueEgp).toBe(2814924.60);
    // 3. valid source values are not overwritten by fallback zero
    expect(res[0].previousActiveCustomers).toBe(85);
    expect(res[0].transferredCustomers).toBe(2);
    expect(res[0].trueLostCustomers).toBe(18);
    expect(res[0].newCustomers).toBe(21);
    expect(res[0].companyRetentionRate).toBe(78.82);
    expect(res[0].sameRepRetentionRate).toBe(76.47);
  });
});

