import { callAnalyticsRpc } from './client';
import { normalizeMonthStart, assertIsoDate } from './validation';
import { toFiniteNumber, toNullableFiniteNumber } from './normalizers';
import { AnalyticsError } from './errors';
import {
  SalesRepSummaryResult,
  SalesRepTrendResult,
  SalesRepCustomerResult,
  SalesRepRetentionDetailResult,
  DailySalesRepPerformanceParams,
  DailySalesRepPerformanceRow,
  DailySalesRepKpisResult,
  SalesRepDailyActionsParams,
  SalesRepDailyActionResult,
  SalesRepActionSummaryParams,
  SalesRepActionSummaryResult,
  SalesRepRecoveryPipelineParams,
  SalesRepRecoveryPipelineResult,
  SalesRepCustomerPrioritiesParams,
  SalesRepCustomerPrioritiesResult,
} from './types';

export interface SalesRepSummaryParams {
  month: string;
  companyName?: string | null;
  salesperson?: string | null;
  governorateCode?: string | null;
  areaCode?: string | null;
  customerId?: number | null;
  productId?: number | null;
}

export interface SalesRepTrendParams {
  startMonth: string;
  endMonth: string;
  companyName?: string | null;
  salesperson?: string | null;
}

export interface SalesRepCustomersParams {
  month: string;
  companyName?: string | null;
  salesperson?: string | null;
  limit?: number;
  offset?: number;
}

export interface SalesRepRetentionDetailsParams {
  month: string;
  companyName?: string | null;
  salesperson?: string | null;
  status?: string | null;
  limit?: number;
  offset?: number;
}

export const salesReps = {
  async summary(params: SalesRepSummaryParams): Promise<SalesRepSummaryResult[]> {
    const normalizedMonth = normalizeMonthStart(params.month, 'month');

    const mapper = (row: any) => ({
      orderMonth: String(row.order_month ?? ''),
      companyName: String(row.company_name ?? ''),
      salesperson: String(row.salesperson ?? ''),
      activeCustomers: toFiniteNumber(row.active_customers ?? 0, 'active_customers'),
      ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
      salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
      averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
      previousCustomers: toFiniteNumber(row.previous_customers ?? 0, 'previous_customers'),
      retainedCustomers: toFiniteNumber(row.retained_customers ?? 0, 'retained_customers'),
      lostCustomers: toFiniteNumber(row.lost_customers ?? 0, 'lost_customers'),
      transferredOutCustomers: toFiniteNumber(row.transferred_out_customers ?? 0, 'transferred_out_customers'),
      transferredInCustomers: toFiniteNumber(row.transferred_in_customers ?? 0, 'transferred_in_customers'),
      newCustomers: toFiniteNumber(row.new_customers ?? 0, 'new_customers'),
      reactivatedCustomers: toFiniteNumber(row.reactivated_customers ?? 0, 'reactivated_customers'),
      lostPreviousSales: toFiniteNumber(row.lost_previous_sales ?? 0, 'lost_previous_sales'),
      retentionRate: toNullableFiniteNumber(row.retention_rate, 'retention_rate'),
    });

    try {
      return await callAnalyticsRpc(
        'analytics_sales_rep_summary_v2',
        {
          p_month: normalizedMonth,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
          p_governorate_code: params.governorateCode ?? null,
          p_area_code: params.areaCode ?? null,
          p_customer_id: params.customerId ?? null,
          p_product_id: params.productId ?? null,
        },
        mapper
      );
    } catch (_err: any) {
      return await callAnalyticsRpc(
        'analytics_sales_rep_summary',
        {
          p_month: normalizedMonth,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
        },
        mapper
      );
    }
  },

  async trend(params: SalesRepTrendParams): Promise<SalesRepTrendResult[]> {
    const startMonth = normalizeMonthStart(params.startMonth, 'startMonth');
    const endMonth = normalizeMonthStart(params.endMonth, 'endMonth');

    return callAnalyticsRpc(
      'analytics_sales_rep_trend',
      {
        p_start_month: startMonth,
        p_end_month: endMonth,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
      },
      (row) => ({
        orderMonth: String(row.order_month ?? ''),
        companyName: String(row.company_name ?? ''),
        salesperson: String(row.salesperson ?? ''),
        activeCustomers: toFiniteNumber(row.active_customers ?? 0, 'active_customers'),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
        retentionRate: toNullableFiniteNumber(row.retention_rate, 'retention_rate'),
        lostCustomers: toFiniteNumber(row.lost_customers ?? 0, 'lost_customers'),
        newCustomers: toFiniteNumber(row.new_customers ?? 0, 'new_customers'),
      })
    );
  },

  async customers(params: SalesRepCustomersParams): Promise<SalesRepCustomerResult[]> {
    const normalizedMonth = normalizeMonthStart(params.month, 'month');
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    if (limit < 1 || limit > 1000) {
      throw new AnalyticsError({
        message: `Limit must be between 1 and 1000, received ${limit}`,
        code: 'ANALYTICS_INVALID_INPUT',
      });
    }

    return callAnalyticsRpc(
      'analytics_sales_rep_customers',
      {
        p_month: normalizedMonth,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_limit: limit,
        p_offset: offset,
      },
      (row) => ({
        companyName: String(row.company_name ?? ''),
        salesperson: String(row.salesperson ?? ''),
        customerId: (row.customer_id as number | string) ?? '',
        customerName: String(row.customer_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
        firstOrderAt: String(row.first_order_at ?? ''),
        lastOrderAt: String(row.last_order_at ?? ''),
      })
    );
  },

  async retentionDetails(
    params: SalesRepRetentionDetailsParams
  ): Promise<SalesRepRetentionDetailResult[]> {
    const normalizedMonth = normalizeMonthStart(params.month, 'month');
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    if (limit < 1 || limit > 1000) {
      throw new AnalyticsError({
        message: `Limit must be between 1 and 1000, received ${limit}`,
        code: 'ANALYTICS_INVALID_INPUT',
      });
    }

    return callAnalyticsRpc(
      'analytics_sales_rep_retention_details',
      {
        p_month: normalizedMonth,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_status: params.status ?? null,
        p_limit: limit,
        p_offset: offset,
      },
      (row) => ({
        companyName: String(row.company_name ?? ''),
        customerId: (row.customer_id as number | string) ?? '',
        customerName: String(row.customer_name ?? ''),
        previousSalesperson: row.previous_salesperson ? String(row.previous_salesperson) : null,
        currentSalesperson: row.current_salesperson ? String(row.current_salesperson) : null,
        previousOrders: toFiniteNumber(row.previous_orders ?? 0, 'previous_orders'),
        currentOrders: toFiniteNumber(row.current_orders ?? 0, 'current_orders'),
        previousSales: toFiniteNumber(row.previous_sales ?? 0, 'previous_sales'),
        currentSales: toFiniteNumber(row.current_sales ?? 0, 'current_sales'),
        retentionStatus: String(row.retention_status ?? ''),
        salesChangePct: toFiniteNumber(row.sales_change_pct ?? 0, 'sales_change_pct'),
        previousLastOrderAt: row.previous_last_order_at ? String(row.previous_last_order_at) : null,
        currentLastOrderAt: row.current_last_order_at ? String(row.current_last_order_at) : null,
      })
    );
  },

  async daily(params: DailySalesRepPerformanceParams): Promise<DailySalesRepPerformanceRow[]> {
    if (params.date) {
      assertIsoDate(params.date, 'date');
    }

    return callAnalyticsRpc(
      'analytics_sales_rep_daily_summary',
      {
        p_date: params.date ?? null,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
      },
      (row) => ({
        reportDate: String(row.report_date ?? ''),
        salesperson: String(row.salesperson ?? ''),
        companyName: String(row.company_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        uniqueCustomers: toFiniteNumber(row.unique_customers ?? 0, 'unique_customers'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        averageOrderValue: toNullableFiniteNumber(row.average_order_value, 'average_order_value'),
        ordersRank: toFiniteNumber(row.orders_rank ?? 0, 'orders_rank'),
      })
    );
  },

  async dailyKpis(params: DailySalesRepPerformanceParams): Promise<DailySalesRepKpisResult[]> {
    if (params.date) {
      assertIsoDate(params.date, 'date');
    }

    return callAnalyticsRpc(
      'analytics_sales_rep_daily_kpis',
      {
        p_date: params.date ?? null,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
      },
      (row) => ({
        requestedDate: String(row.requested_date ?? ''),
        reportDate: String(row.report_date ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        uniqueCustomers: toFiniteNumber(row.unique_customers ?? 0, 'unique_customers'),
        activeSalespeople: toFiniteNumber(row.active_salespeople ?? 0, 'active_salespeople'),
        representativeCompanyRows: toFiniteNumber(row.representative_company_rows ?? 0, 'representative_company_rows'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
      })
    );
  },

  async dailyActions(params: SalesRepDailyActionsParams = {}): Promise<SalesRepDailyActionResult[]> {
    if (params.asOfDate) {
      assertIsoDate(params.asOfDate, 'asOfDate');
    }

    const mapper = (row: any) => ({
      actionRank: toFiniteNumber(row.action_rank ?? row.rank ?? 0, 'action_rank'),
      customerId: toFiniteNumber(row.customer_id ?? 0, 'customer_id'),
      customerName: String(row.customer_name ?? ''),
      companyName: String(row.company_name ?? ''),
      salesperson: String(row.salesperson ?? ''),
      priority: String(row.priority ?? row.action_priority ?? 'MEDIUM'),
      actionType: String(row.action_type ?? ''),
      actionReason: String(row.action_reason ?? row.reason ?? ''),
      risk: String(row.risk ?? row.risk_level ?? 'LOW'),
      lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
      daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
      medianBuyingInterval: toFiniteNumber(row.median_buying_interval ?? row.median_interval ?? 0, 'median_buying_interval'),
      previous30dSales: toFiniteNumber(row.previous_30d_sales ?? row.previous_30day_sales ?? row.previous_sales ?? 0, 'previous_30d_sales'),
      recent30dSales: toFiniteNumber(row.recent_30d_sales ?? row.recent_30day_sales ?? row.recent_sales ?? 0, 'recent_30d_sales'),
      salesChangePct: toNullableFiniteNumber(row.sales_change_pct ?? row.sales_decline_pct, 'sales_change_pct'),
      recoveryOpportunity: toFiniteNumber(row.recovery_opportunity ?? row.recovery_value ?? 0, 'recovery_opportunity'),
    });

    try {
      return await callAnalyticsRpc(
        'analytics_sales_rep_daily_actions_v2',
        {
          p_as_of_date: params.asOfDate ?? null,
          p_salesperson: params.salesperson ?? null,
          p_company_name: params.companyName ?? null,
          p_priority: params.priority ?? null,
          p_action_type: params.actionType ?? null,
          p_search: params.search ?? null,
          p_limit: params.limit ?? null,
          p_offset: params.offset ?? null,
          p_risk: params.risk ?? null,
        },
        mapper
      );
    } catch (_err: any) {
      let rows = await callAnalyticsRpc(
        'analytics_sales_rep_daily_actions',
        {
          p_as_of_date: params.asOfDate ?? null,
          p_salesperson: params.salesperson ?? null,
          p_company_name: params.companyName ?? null,
          p_priority: params.priority ?? null,
          p_action_type: params.actionType ?? null,
          p_search: params.search ?? null,
          p_limit: params.limit ?? null,
          p_offset: params.offset ?? null,
        },
        mapper
      );

      if (params.risk) {
        const lowerRisk = params.risk.toLowerCase();
        rows = rows.filter((r) => r.risk.toLowerCase() === lowerRisk);
      }
      return rows;
    }
  },

  async actionSummary(params: SalesRepActionSummaryParams = {}): Promise<SalesRepActionSummaryResult[]> {
    if (params.asOfDate) {
      assertIsoDate(params.asOfDate, 'asOfDate');
    }

    return callAnalyticsRpc(
      'analytics_sales_rep_action_summary',
      {
        p_as_of_date: params.asOfDate ?? null,
        p_salesperson: params.salesperson ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        totalCustomers: toFiniteNumber(row.total_customers ?? 0, 'total_customers'),
        actionableCustomers: toFiniteNumber(row.actionable_customers ?? 0, 'actionable_customers'),
        highPriority: toFiniteNumber(row.high_priority ?? row.high_priority_customers ?? 0, 'high_priority'),
        mediumPriority: toFiniteNumber(row.medium_priority ?? row.medium_priority_customers ?? 0, 'medium_priority'),
        lowPriority: toFiniteNumber(row.low_priority ?? row.low_priority_customers ?? 0, 'low_priority'),
        winBackCustomers: toFiniteNumber(row.win_back_customers ?? row.winback_customers ?? 0, 'win_back_customers'),
        decliningCustomers: toFiniteNumber(row.declining_customers ?? 0, 'declining_customers'),
        overdueCustomers: toFiniteNumber(row.overdue_customers ?? 0, 'overdue_customers'),
        transferReviewCustomers: toFiniteNumber(row.transfer_review_customers ?? row.salesperson_transfer_reviews ?? row.owner_transfer_customers ?? 0, 'transfer_review_customers'),
        totalRecoveryOpportunity: toFiniteNumber(row.total_recovery_opportunity ?? row.recovery_opportunity ?? 0, 'total_recovery_opportunity'),
        highPriorityRecoveryOpportunity: toFiniteNumber(row.high_priority_recovery_opportunity ?? row.high_priority_recovery ?? 0, 'high_priority_recovery_opportunity'),
        previous30dSales: toFiniteNumber(row.previous_30d_sales ?? row.previous_sales ?? 0, 'previous_30d_sales'),
        recent30dSales: toFiniteNumber(row.recent_30d_sales ?? row.recent_sales ?? 0, 'recent_30d_sales'),
      })
    );
  },

  async recoveryPipeline(params: SalesRepRecoveryPipelineParams = {}): Promise<SalesRepRecoveryPipelineResult[]> {
    if (params.asOfDate) {
      assertIsoDate(params.asOfDate, 'asOfDate');
    }

    return callAnalyticsRpc(
      'analytics_sales_rep_recovery_pipeline',
      {
        p_as_of_date: params.asOfDate ?? null,
        p_salesperson: params.salesperson ?? null,
        p_company_name: params.companyName ?? null,
        p_limit: params.limit ?? null,
      },
      (row) => ({
        customerId: toFiniteNumber(row.customer_id ?? 0, 'customer_id'),
        customerName: String(row.customer_name ?? ''),
        companyName: String(row.company_name ?? ''),
        salesperson: String(row.salesperson ?? ''),
        priority: String(row.priority ?? 'HIGH'),
        actionType: String(row.action_type ?? ''),
        previous30dSales: toFiniteNumber(row.previous_30d_sales ?? row.previous_sales ?? 0, 'previous_30d_sales'),
        recent30dSales: toFiniteNumber(row.recent_30d_sales ?? row.recent_sales ?? 0, 'recent_30d_sales'),
        salesGap: toFiniteNumber(row.sales_gap ?? row.gap ?? row.decline_amount ?? row.sales_decline_amount ?? 0, 'sales_gap'),
        salesChangePct: toNullableFiniteNumber(row.sales_change_pct ?? row.sales_decline_pct ?? row.change_pct, 'sales_change_pct'),
        daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
        recoveryOpportunity: toFiniteNumber(row.recovery_opportunity ?? row.recovery_value ?? 0, 'recovery_opportunity'),
      })
    );
  },

  async customerPriorities(params: SalesRepCustomerPrioritiesParams = {}): Promise<SalesRepCustomerPrioritiesResult[]> {
    if (params.asOfDate) {
      assertIsoDate(params.asOfDate, 'asOfDate');
    }

    return callAnalyticsRpc(
      'analytics_sales_rep_customer_priorities',
      {
        p_as_of_date: params.asOfDate ?? null,
        p_salesperson: params.salesperson ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        priority: String(row.priority ?? row.priority_level ?? ''),
        customersCount: toFiniteNumber(row.customers_count ?? row.customer_count ?? row.customers ?? 0, 'customers_count'),
        customersPct: toFiniteNumber(row.customers_pct ?? row.pct ?? row.percentage ?? 0, 'customers_pct'),
        recoveryOpportunity: toFiniteNumber(row.recovery_opportunity ?? row.recovery_value ?? 0, 'recovery_opportunity'),
      })
    );
  },
};
