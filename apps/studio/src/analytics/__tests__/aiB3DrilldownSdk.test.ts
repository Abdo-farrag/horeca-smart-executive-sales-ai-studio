import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customers } from '../customers';
import { products } from '../products';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '../../lib/supabase';

describe('B3 Drill-Down v2 RPCs - SDK Parameter Mapping & Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. customerOrdersV2', () => {
    it('maps all global parameters and enforces limit clamp (1..20)', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: [
          {
            order_id: 101,
            order_name: 'SO-101',
            order_date: '2026-08-05',
            company_name: 'MAS',
            salesperson: 'Haddil Haron',
            governorate_name: 'Cairo',
            area_name: 'Nasr City',
            order_value: 125000,
            lines_count: 5,
            products_count: 4,
            total_qty: 50,
            order_status: 'CONFIRMED',
          },
        ],
        error: null,
      });

      const res = await customers.customerOrdersV2({
        customerId: 30709,
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        companyName: 'MAS',
        salesperson: 'Haddil Haron',
        governorateCode: 'EGY.1_1',
        areaCode: 'EGY.1.1_1',
        productId: 8516,
        limit: 100, // should clamp to 20
        offset: 5,
      });

      expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_orders_v2', {
        p_customer_id: 30709,
        p_start_date: '2026-08-01',
        p_end_date: '2026-08-15',
        p_company_name: 'MAS',
        p_salesperson: 'Haddil Haron',
        p_governorate_code: 'EGY.1_1',
        p_area_code: 'EGY.1.1_1',
        p_product_id: 8516,
        p_limit: 20,
        p_offset: 5,
      });

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        orderId: 101,
        orderName: 'SO-101',
        orderDate: '2026-08-05',
        companyName: 'MAS',
        salesperson: 'Haddil Haron',
        governorateName: 'Cairo',
        areaName: 'Nasr City',
        orderValue: 125000,
        linesCount: 5,
        productsCount: 4,
        totalQty: 50,
        orderStatus: 'CONFIRMED',
      });
    });

    it('requires customerId and valid dates', async () => {
      await expect(
        customers.customerOrdersV2({
          customerId: 0,
          startDate: '2026-08-01',
          endDate: '2026-08-15',
        })
      ).rejects.toThrow();

      await expect(
        customers.customerOrdersV2({
          customerId: 123,
          startDate: 'not-a-date',
          endDate: '2026-08-15',
        })
      ).rejects.toThrow();
    });

    it('does NOT silently fall back to legacy RPC on error', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'function analytics_customer_orders_v2 does not exist' },
      });

      await expect(
        customers.customerOrdersV2({
          customerId: 30709,
          startDate: '2026-08-01',
          endDate: '2026-08-15',
        })
      ).rejects.toThrow();
    });
  });

  describe('2. customerProductDropoffV2', () => {
    it('maps all parameters and returns structured recovery/status fields', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: [
          {
            product_id: 8516,
            product_name: 'Product A',
            category_name: 'Category 1',
            previous_sales: 50000,
            current_sales: 0,
            previous_qty: 100,
            current_qty: 0,
            sales_change_pct: null,
            status: 'STOPPED_BUYING',
            recovery_value: 50000,
          },
        ],
        error: null,
      });

      const res = await customers.customerProductDropoffV2({
        customerId: 30709,
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        companyName: 'MAS',
        salesperson: 'Haddil Haron',
        governorateCode: 'EGY.1_1',
        areaCode: 'EGY.1.1_1',
        productId: 8516,
        limit: 50, // should clamp to 20
      });

      expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_product_dropoff_v2', {
        p_customer_id: 30709,
        p_start_date: '2026-08-01',
        p_end_date: '2026-08-15',
        p_company_name: 'MAS',
        p_salesperson: 'Haddil Haron',
        p_governorate_code: 'EGY.1_1',
        p_area_code: 'EGY.1.1_1',
        p_product_id: 8516,
        p_limit: 20,
      });

      expect(res).toHaveLength(1);
      expect(res[0].status).toBe('STOPPED_BUYING');
      expect(res[0].recoveryValue).toBe(50000);
    });

    it('handles NEW_PRODUCT status when previous_sales is 0 and current_sales > 0', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: [
          {
            product_id: 9999,
            product_name: 'Brand New Item',
            category_name: 'Category 2',
            previous_sales: 0,
            current_sales: 45000,
            previous_qty: 0,
            current_qty: 30,
            sales_change_pct: null,
            status: 'NEW_PRODUCT',
            recovery_value: 0,
          },
        ],
        error: null,
      });

      const res = await customers.customerProductDropoffV2({
        customerId: 30709,
        startDate: '2026-08-01',
        endDate: '2026-08-15',
      });

      expect(res[0].status).toBe('NEW_PRODUCT');
      expect(res[0].currentSales).toBe(45000);
      expect(res[0].previousSales).toBe(0);
      expect(res[0].recoveryValue).toBe(0);
    });

    it('does NOT silently fall back to legacy on error', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(
        customers.customerProductDropoffV2({
          customerId: 30709,
          startDate: '2026-08-01',
          endDate: '2026-08-15',
        })
      ).rejects.toThrow();
    });
  });

  describe('3. customerFavoriteProductsV2', () => {
    it('maps all parameters including sales_share_pct null handling', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: [
          {
            product_id: 8516,
            product_name: 'Product A',
            sales_value: 40000,
            orders_count: 8,
            quantity: 80,
            sales_share_pct: 65.5,
            last_order_date: '2026-08-10',
          },
        ],
        error: null,
      });

      const res = await customers.customerFavoriteProductsV2({
        customerId: 30709,
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        companyName: 'MAS',
        salesperson: 'Haddil Haron',
        governorateCode: 'EGY.1_1',
        areaCode: 'EGY.1.1_1',
        limit: 15,
      });

      expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_favorite_products_v2', {
        p_customer_id: 30709,
        p_start_date: '2026-08-01',
        p_end_date: '2026-08-15',
        p_company_name: 'MAS',
        p_salesperson: 'Haddil Haron',
        p_governorate_code: 'EGY.1_1',
        p_area_code: 'EGY.1.1_1',
        p_limit: 15,
      });

      expect(res[0].salesSharePct).toBe(65.5);
      expect(res[0].lastOrderDate).toBe('2026-08-10');
    });

    it('does NOT silently fall back to legacy on error', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(
        customers.customerFavoriteProductsV2({
          customerId: 30709,
          startDate: '2026-08-01',
          endDate: '2026-08-15',
        })
      ).rejects.toThrow();
    });
  });

  describe('4. productTopCustomersV2', () => {
    it('maps all parameters including p_customer_id and clamps limit', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: [
          {
            customer_id: 30709,
            customer_name: 'خالد حسين',
            company_name: 'MAS',
            salesperson: 'Haddil Haron',
            governorate_name: 'Cairo',
            area_name: 'Nasr City',
            orders_count: 6,
            sales_value: 30000,
            quantity: 60,
            last_order_date: '2026-08-12',
          },
        ],
        error: null,
      });

      const res = await products.productTopCustomersV2({
        productId: 8516,
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        companyName: 'MAS',
        salesperson: 'Haddil Haron',
        governorateCode: 'EGY.1_1',
        areaCode: 'EGY.1.1_1',
        customerId: 30709,
        limit: 50, // clamp to 20
      });

      expect(supabase!.rpc).toHaveBeenCalledWith('analytics_product_top_customers_v2', {
        p_product_id: 8516,
        p_start_date: '2026-08-01',
        p_end_date: '2026-08-15',
        p_company_name: 'MAS',
        p_salesperson: 'Haddil Haron',
        p_governorate_code: 'EGY.1_1',
        p_area_code: 'EGY.1.1_1',
        p_customer_id: 30709,
        p_limit: 20,
      });

      expect(res).toHaveLength(1);
      expect(res[0].salesValue).toBe(30000);
      expect(res[0].customerName).toBe('خالد حسين');
    });

    it('requires productId and dates', async () => {
      await expect(
        products.productTopCustomersV2({
          productId: 0,
          startDate: '2026-08-01',
          endDate: '2026-08-15',
        })
      ).rejects.toThrow();
    });

    it('does NOT silently fall back to legacy on error', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(
        products.productTopCustomersV2({
          productId: 8516,
          startDate: '2026-08-01',
          endDate: '2026-08-15',
        })
      ).rejects.toThrow();
    });
  });

  describe('5. customerRetentionDetailsV2', () => {
    it('normalizes month and maps all global filter dimensions', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: [
          {
            company_name: 'MAS',
            customer_id: 30709,
            customer_name: 'خالد حسين',
            previous_salesperson: 'Haddil Haron',
            current_salesperson: 'Haddil Haron',
            previous_orders: 5,
            current_orders: 6,
            previous_sales: 50000,
            current_sales: 60000,
            retention_status: 'RETAINED',
            sales_change_pct: 20.0,
            previous_last_order_date: '2026-07-28',
            current_last_order_date: '2026-08-14',
          },
        ],
        error: null,
      });

      const res = await customers.customerRetentionDetailsV2({
        month: '2026-08-15', // should normalize to 2026-08-01
        companyName: 'MAS',
        salesperson: 'Haddil Haron',
        governorateCode: 'EGY.1_1',
        areaCode: 'EGY.1.1_1',
        customerId: 30709,
        productId: 8516,
        status: 'RETAINED',
        limit: 25, // clamp to 20
        offset: 0,
      });

      expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_retention_details_v2', {
        p_month: '2026-08-01',
        p_company_name: 'MAS',
        p_salesperson: 'Haddil Haron',
        p_governorate_code: 'EGY.1_1',
        p_area_code: 'EGY.1.1_1',
        p_customer_id: 30709,
        p_product_id: 8516,
        p_status: 'RETAINED',
        p_limit: 20,
        p_offset: 0,
      });

      expect(res[0].retentionStatus).toBe('RETAINED');
      expect(res[0].salesChangePct).toBe(20.0);
    });

    it('does NOT silently fall back to legacy on error', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(
        customers.customerRetentionDetailsV2({
          month: '2026-08-01',
        })
      ).rejects.toThrow();
    });
  });

  describe('6. customerActionCenterScopedV2', () => {
    it('maps all scope and action/risk parameters and clamps limit', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: [
          {
            customer_id: 30709,
            customer_name: 'خالد حسين',
            company_name: 'MAS',
            current_salesperson: 'Haddil Haron',
            priority: 'HIGH',
            action_type: 'WIN_BACK',
            action_reason: 'عميل متوقف عن الشراء لأكثر من 30 يوما',
            last_order_date: '2026-06-10',
            days_since_last_order: 65,
            median_days_between_orders: 15.5,
            previous_30d_sales: 80000,
            recent_30d_sales: 0,
            sales_change_pct: null,
            recovery_opportunity: 80000,
            risk_level: 'HIGH',
            salesperson_changed: false,
          },
        ],
        error: null,
      });

      const res = await customers.customerActionCenterScopedV2({
        asOfDate: '2026-08-16',
        companyName: 'MAS',
        salesperson: 'Haddil Haron',
        governorateCode: 'EGY.1_1',
        areaCode: 'EGY.1.1_1',
        customerId: 30709,
        productId: 8516,
        priority: 'HIGH',
        actionType: 'WIN_BACK',
        risk: 'HIGH',
        search: 'خالد',
        limit: 30, // clamp to 20
        offset: 0,
      });

      expect(supabase!.rpc).toHaveBeenCalledWith('analytics_customer_action_center_scoped_v2', {
        p_as_of_date: '2026-08-16',
        p_company_name: 'MAS',
        p_salesperson: 'Haddil Haron',
        p_governorate_code: 'EGY.1_1',
        p_area_code: 'EGY.1.1_1',
        p_customer_id: 30709,
        p_product_id: 8516,
        p_priority: 'HIGH',
        p_action_type: 'WIN_BACK',
        p_risk: 'HIGH',
        p_search: 'خالد',
        p_limit: 20,
        p_offset: 0,
      });

      expect(res[0].currentSalesperson).toBe('Haddil Haron');
      expect(res[0].salesperson).toBe('Haddil Haron');
      expect(res[0].medianDaysBetweenOrders).toBe(15.5);
      expect(res[0].medianBuyingInterval).toBe(15.5);
      expect(res[0].priority).toBe('HIGH');
      expect(res[0].riskLevel).toBe('HIGH');
      expect(res[0].risk).toBe('HIGH');
      expect(res[0].recoveryOpportunity).toBe(80000);
    });

    it('does NOT silently fall back to legacy on error', async () => {
      (supabase!.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(
        customers.customerActionCenterScopedV2({
          asOfDate: '2026-08-16',
        })
      ).rejects.toThrow();
    });
  });
});
