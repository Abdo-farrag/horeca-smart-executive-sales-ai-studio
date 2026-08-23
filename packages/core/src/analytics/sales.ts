import { callAnalyticsRpc } from './client';
import { assertDateRange } from './validation';
import { toFiniteNumber } from './normalizers';
import { AnalyticsError } from './errors';
import {
  ExecutiveKpisResult,
  DailySalesSummaryResult,
  TopCustomerResult,
  DataFreshnessResult,
} from './types';

export interface SalesExecutiveParams {
  startDate: string;
  endDate: string;
  companyName?: string | null;
  salesperson?: string | null;
  governorateCode?: string | null;
  areaCode?: string | null;
  customerId?: number | null;
  productId?: number | null;
}

export interface SalesDailyParams {
  startDate: string;
  endDate: string;
  companyName?: string | null;
  salesperson?: string | null;
  governorateCode?: string | null;
  areaCode?: string | null;
  customerId?: number | null;
  productId?: number | null;
}

export interface SalesTopCustomersParams {
  startDate: string;
  endDate: string;
  companyName?: string | null;
  salesperson?: string | null;
  governorateCode?: string | null;
  areaCode?: string | null;
  customerId?: number | null;
  productId?: number | null;
  limit?: number;
}

export const sales = {
  async executive(params: SalesExecutiveParams): Promise<ExecutiveKpisResult[]> {
    assertDateRange(params.startDate, params.endDate);

    return callAnalyticsRpc(
      'analytics_sales_executive_kpis_v2',
      {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_customer_id: params.customerId ?? null,
        p_product_id: params.productId ?? null,
      },
      (row) => ({
        salesValue: toFiniteNumber(row.sales_value ?? row.total_sales ?? 0, 'sales_value'),
        ordersCount: toFiniteNumber(row.orders_count ?? row.confirmed_orders ?? 0, 'orders_count'),
        activeCustomers: toFiniteNumber(row.active_customers ?? 0, 'active_customers'),
        averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
        previousSalesValue: toFiniteNumber(row.previous_sales_value ?? row.previous_total_sales ?? 0, 'previous_sales_value'),
        revenueGrowthPct: toFiniteNumber(row.revenue_growth_pct ?? 0, 'revenue_growth_pct'),
        minOrderDate: row.min_order_date ? String(row.min_order_date) : null,
        maxOrderDate: row.max_order_date ? String(row.max_order_date) : null,
        lastSourceUpdate: row.last_source_update ? String(row.last_source_update) : null,
      })
    );
  },

  async daily(params: SalesDailyParams): Promise<DailySalesSummaryResult[]> {
    assertDateRange(params.startDate, params.endDate);

    return callAnalyticsRpc(
      'analytics_sales_daily_summary_v2',
      {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_customer_id: params.customerId ?? null,
        p_product_id: params.productId ?? null,
      },
      (row) => ({
        orderDate: String(row.order_date ?? row.sales_date ?? ''),
        horecaSales: toFiniteNumber(row.horeca_sales ?? 0, 'horeca_sales'),
        masSales: toFiniteNumber(row.mas_sales ?? 0, 'mas_sales'),
        totalSales: toFiniteNumber(row.total_sales ?? 0, 'total_sales'),
        ordersCount: toFiniteNumber(row.orders_count ?? row.confirmed_orders ?? 0, 'orders_count'),
      })
    );
  },

  async topCustomers(params: SalesTopCustomersParams): Promise<TopCustomerResult[]> {
    assertDateRange(params.startDate, params.endDate);

    const limit = params.limit ?? 20;
    if (limit < 1 || limit > 500) {
      throw new AnalyticsError({
        message: `Limit must be between 1 and 500, received ${limit}`,
        code: 'ANALYTICS_INVALID_INPUT',
      });
    }

    try {
      return await callAnalyticsRpc(
        'analytics_top_customers_v2',
        {
          p_start_date: params.startDate,
          p_end_date: params.endDate,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
          p_governorate_code: params.governorateCode ?? null,
          p_area_code: params.areaCode ?? null,
          p_customer_id: params.customerId ?? null,
          p_product_id: params.productId ?? null,
          p_limit: limit,
        },
        (row) => ({
          customerId: (row.customer_id as number | string) ?? '',
          customerName: String(row.customer_name ?? ''),
          companyName: String(row.company_name ?? ''),
          ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
          salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
          averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
          lastOrderAt: String(row.last_order_at ?? ''),
          primarySalesperson: String(row.primary_salesperson ?? ''),
        })
      );
    } catch (_err: any) {
      return await callAnalyticsRpc(
        'analytics_top_customers',
        {
          p_start_date: params.startDate,
          p_end_date: params.endDate,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
          p_limit: limit,
        },
        (row) => ({
          customerId: (row.customer_id as number | string) ?? '',
          customerName: String(row.customer_name ?? ''),
          companyName: String(row.company_name ?? ''),
          ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
          salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
          averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
          lastOrderAt: String(row.last_order_date ?? row.last_order_at ?? ''),
          primarySalesperson: String(row.primary_salesperson ?? ''),
        })
      );
    }
  },

  async freshness(): Promise<DataFreshnessResult[]> {
    return callAnalyticsRpc(
      'analytics_sales_data_freshness',
      {},
      (row) => ({
        maxOrderDate: row.max_order_date ? String(row.max_order_date) : null,
        maxSourceUpdatedAt: row.max_source_updated_at ? String(row.max_source_updated_at) : null,
        lastSuccessfulSalesSyncStartedAt: row.last_successful_sales_sync_started_at ? String(row.last_successful_sales_sync_started_at) : null,
        lastSuccessfulSalesSyncFinishedAt: row.last_successful_sales_sync_finished_at ? String(row.last_successful_sales_sync_finished_at) : null,
        lastSalesSyncRowsCount: toFiniteNumber(row.last_sales_sync_rows_count ?? 0, 'last_sales_sync_rows_count'),
        lastFailedFullSyncStartedAt: row.last_failed_full_sync_started_at ? String(row.last_failed_full_sync_started_at) : null,
        lastFailedFullSyncMessage: row.last_failed_full_sync_message ? String(row.last_failed_full_sync_message) : null,
      })
    );
  },
};
