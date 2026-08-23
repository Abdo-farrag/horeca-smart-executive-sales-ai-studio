import { describe, it, expect, vi } from 'vitest';
import * as mockData from '../../data/mockData';
import { fetchSalesOrders } from '../../services/salesService';
import { getFallbackExecutiveData } from '../../services/executiveService';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  getSupabaseHostOnly: () => 'mock-host',
  supabase: {
    from: vi.fn(() => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) =>
          resolve({
            data: [
              {
                order_id: 101,
                order_name: 'SO/2026/001',
                order_date_cairo: '2026-08-05',
                company_name: 'MAS',
                customer_id: 30709,
                customer_name: 'خالد حسين',
                salesperson: 'Haddil Haron',
                order_value: 50000,
              },
            ],
            error: null,
          }),
      };
      return builder;
    }),
  },
}));

describe('P0 Audit: Non-Existence of Fake / Mock / Demo Data', () => {
  it('should export empty arrays for all mockData exports', () => {
    expect(mockData.INITIAL_KPIS).toEqual([]);
    expect(mockData.SALES_REPS).toEqual([]);
    expect(mockData.CUSTOMERS).toEqual([]);
    expect(mockData.PRODUCTS).toEqual([]);
    expect(mockData.CATEGORIES).toEqual([]);
    expect(mockData.AREAS).toEqual([]);
    expect(mockData.LOST_CUSTOMERS).toEqual([]);
    expect(mockData.RECENT_ORDERS).toEqual([]);
    expect(mockData.MONTHLY_REVENUE_TREND).toEqual([]);
  });

  it('should not contain known fake order IDs anywhere in mockData', () => {
    const serialized = JSON.stringify(mockData);
    expect(serialized).not.toContain('ORD-2026-8801');
    expect(serialized).not.toContain('ORD-2026-8802');
    expect(serialized).not.toContain('ORD-2026-8803');
    expect(serialized).not.toContain('ORD-2026-8804');
  });

  it('should not contain known fake entity names in mockData', () => {
    const serialized = JSON.stringify(mockData);
    expect(serialized).not.toContain('ريتز كارلتون');
    expect(serialized).not.toContain('مكة أوركيد');
    expect(serialized).not.toContain('أورورا أرتيزان');
    expect(serialized).not.toContain('التموين الملكي');
    expect(serialized).not.toContain('طارق الغامدي');
    expect(serialized).not.toContain('ريم الخطيب');
    expect(serialized).not.toContain('خالد فاروق');
  });

  it('salesService returned orders should not contain fake order IDs or fake customer names', async () => {
    const filterState: any = {
      dateRange: { startDate: '2026-08-01', endDate: '2026-08-31' },
      company: 'All',
      salespersonName: null,
    };
    const res = await fetchSalesOrders(filterState);
    const serialized = JSON.stringify(res.orders);
    expect(serialized).not.toContain('ORD-2026-8801');
    expect(serialized).not.toContain('ORD-2026-8802');
    expect(serialized).not.toContain('ORD-2026-8803');
    expect(serialized).not.toContain('ORD-2026-8804');
    expect(serialized).not.toContain('ريتز كارلتون');
    expect(serialized).not.toContain('مكة أوركيد');
    expect(serialized).not.toContain('أورورا أرتيزان');
    expect(serialized).not.toContain('التموين الملكي');
    expect(serialized).not.toContain('طارق الغامدي');
  }, 25000);

  it('executiveService fallback should return zeroed KPIs and empty lists', () => {
    const filterState: any = {
      dateRange: { startDate: '2026-08-01', endDate: '2026-08-31' },
      company: 'All',
    };
    const fallback = getFallbackExecutiveData(filterState, 'Test fallback', '2026-08-12T00:00:00Z');
    expect(fallback.kpis).toEqual([]);
    expect(fallback.salesByCompany).toEqual([]);
    expect(fallback.topSalesReps).toEqual([]);
    expect(fallback.topCustomers).toEqual([]);
    expect(fallback.confirmedOrdersCount).toBe(0);
    expect(fallback.totalSales).toBe(0);
  });
});
