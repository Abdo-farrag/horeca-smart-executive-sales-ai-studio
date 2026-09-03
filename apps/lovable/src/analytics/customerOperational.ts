import { callAnalyticsRpc } from './client';
import { assertIsoDate } from './validation';
import { toFiniteNumber } from './normalizers';
import type {
  CustomerBuyingFrequencyParams,
  CustomerBuyingFrequencyResult,
  CustomerRiskParams,
  CustomerRiskResult,
  CustomerPortfolioSummaryParams,
  CustomerPortfolioSummaryResult,
  CustomerRiskDistributionParams,
  CustomerRiskDistributionResult,
  CustomerActionCenterParams,
  CustomerActionCenterResult,
} from './types';

function mapActionCenterRow(row: Record<string, unknown>): CustomerActionCenterResult {
  return {
    customerId: toFiniteNumber(row.customer_id, 'customer_id'),
    customerName: String(row.customer_name ?? ''),
    companyName: String(row.company_name ?? ''),
    salesperson: String(row.salesperson ?? row.current_salesperson ?? row.primary_salesperson ?? ''),
    priority: String(row.priority ?? row.action_priority ?? 'LOW'),
    actionType: String(row.action_type ?? 'MONITOR'),
    actionReason: String(row.action_reason ?? row.reason ?? ''),
    lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
    daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
    medianBuyingInterval: toFiniteNumber(
      row.median_days_between_orders ?? row.median_buying_interval ?? row.median_interval ?? 0,
      'median_days_between_orders'
    ),
    previous30dSales: toFiniteNumber(row.previous_30d_sales ?? row.previous_30day_sales ?? 0, 'previous_30d_sales'),
    recent30dSales: toFiniteNumber(row.recent_30d_sales ?? row.recent_30day_sales ?? 0, 'recent_30d_sales'),
    salesChangePct: row.sales_change_pct != null ? toFiniteNumber(row.sales_change_pct, 'sales_change_pct') : null,
    recoveryOpportunity: toFiniteNumber(row.recovery_opportunity ?? row.recovery_value ?? 0, 'recovery_opportunity'),
    risk: String(row.risk_level ?? row.risk ?? 'LOW'),
    salespersonChanged: Boolean(row.salesperson_changed ?? row.is_salesperson_changed ?? false),
  };
}

export const customerOperational = {
  async buyingFrequency(params: CustomerBuyingFrequencyParams): Promise<CustomerBuyingFrequencyResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');
    return callAnalyticsRpc(
      'analytics_customer_buying_frequency',
      {
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
      },
      (row) => ({
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        activeDays: toFiniteNumber(row.active_days ?? row.active_purchase_days ?? 0, 'active_days'),
        firstOrderDate: row.first_order_date ? String(row.first_order_date) : null,
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        averageDaysBetweenOrders: toFiniteNumber(row.average_days_between_orders ?? row.avg_days_between_orders ?? 0, 'average_days_between_orders'),
        medianDaysBetweenOrders: toFiniteNumber(row.median_days_between_orders ?? row.median_days ?? 0, 'median_days_between_orders'),
        daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
        expectedNextOrderDate: row.expected_next_order_date || row.expected_next_order
          ? String(row.expected_next_order_date ?? row.expected_next_order)
          : null,
        frequencyStatus: String(row.frequency_status ?? 'ON_TIME'),
      })
    );
  },

  async risk(params: CustomerRiskParams): Promise<CustomerRiskResult[]> {
    if (params.asOfDate) assertIsoDate(params.asOfDate, 'asOfDate');
    return callAnalyticsRpc(
      'analytics_customer_risk',
      {
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null,
        p_as_of_date: params.asOfDate ?? null,
      },
      (row) => ({
        riskLevel: String(row.risk_level ?? 'LOW'),
        riskReason: String(row.risk_reason ?? row.reason ?? ''),
        recoveryPriority: String(row.recovery_priority ?? row.priority ?? 'LOW'),
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
        medianBuyingInterval: toFiniteNumber(
          row.median_days_between_orders ?? row.median_buying_interval ?? row.median_interval ?? 0,
          'median_days_between_orders'
        ),
        recent30DaySales: toFiniteNumber(row.recent_30d_sales ?? row.recent_30day_sales ?? 0, 'recent_30d_sales'),
        previous30DaySales: toFiniteNumber(row.previous_30d_sales ?? row.previous_30day_sales ?? 0, 'previous_30d_sales'),
        salesChangePct: row.sales_change_pct != null ? toFiniteNumber(row.sales_change_pct, 'sales_change_pct') : 0,
      })
    );
  },

  async portfolioSummary(params: CustomerPortfolioSummaryParams = {}): Promise<CustomerPortfolioSummaryResult[]> {
    if (params.asOfDate) assertIsoDate(params.asOfDate, 'asOfDate');
    return callAnalyticsRpc(
      'analytics_customer_portfolio_summary',
      {
        p_as_of_date: params.asOfDate ?? null,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
      },
      (row) => ({
        totalCustomers: toFiniteNumber(row.total_customers ?? 0, 'total_customers'),
        highPriority: toFiniteNumber(row.high_priority_customers ?? row.high_priority ?? row.high_priority_count ?? 0, 'high_priority_customers'),
        mediumPriority: toFiniteNumber(row.medium_priority_customers ?? row.medium_priority ?? row.medium_priority_count ?? 0, 'medium_priority_customers'),
        lowPriority: toFiniteNumber(row.low_priority_customers ?? row.low_priority ?? row.low_priority_count ?? 0, 'low_priority_customers'),
        winBackCustomers: toFiniteNumber(row.win_back_customers ?? row.winback_customers ?? 0, 'win_back_customers'),
        decliningCustomers: toFiniteNumber(row.declining_customers ?? 0, 'declining_customers'),
        overdueCustomers: toFiniteNumber(row.overdue_customers ?? 0, 'overdue_customers'),
        salespersonTransferReviews: toFiniteNumber(row.owner_transfer_customers ?? row.salesperson_transfer_reviews ?? row.transfer_reviews ?? 0, 'owner_transfer_customers'),
        totalRecoveryOpportunity: toFiniteNumber(row.total_recovery_opportunity ?? row.total_recovery_opportunity_egp ?? 0, 'total_recovery_opportunity'),
        highPriorityRecoveryOpportunity: toFiniteNumber(row.high_priority_recovery_opportunity ?? row.high_priority_recovery_opportunity_egp ?? 0, 'high_priority_recovery_opportunity'),
      })
    );
  },

  async riskDistribution(params: CustomerRiskDistributionParams = {}): Promise<CustomerRiskDistributionResult[]> {
    if (params.asOfDate) assertIsoDate(params.asOfDate, 'asOfDate');
    return callAnalyticsRpc(
      'analytics_customer_risk_distribution',
      {
        p_as_of_date: params.asOfDate ?? null,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
      },
      (row) => ({
        riskLevel: String(row.risk_level ?? row.risk ?? 'LOW'),
        customersCount: toFiniteNumber(row.customers_count ?? row.customer_count ?? row.customers ?? 0, 'customers_count'),
        customersPct: toFiniteNumber(row.share_pct ?? row.customers_pct ?? row.pct ?? row.percentage ?? 0, 'share_pct'),
        recoveryOpportunity: toFiniteNumber(row.recovery_opportunity ?? row.recovery_value ?? row.recovery_opportunity_value ?? 0, 'recovery_opportunity'),
      })
    );
  },

  async actionCenter(params: CustomerActionCenterParams = {}): Promise<CustomerActionCenterResult[]> {
    if (params.asOfDate) assertIsoDate(params.asOfDate, 'asOfDate');
    const limit = params.limit ?? 500;
    const offset = params.offset ?? 0;

    try {
      return await callAnalyticsRpc(
        'analytics_customer_action_center_v2',
        {
          p_as_of_date: params.asOfDate ?? null,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
          p_priority: params.priority ?? null,
          p_action_type: params.actionType ?? null,
          p_risk: params.risk ?? null,
          p_search: params.search ?? null,
          p_limit: limit,
          p_offset: offset,
        },
        mapActionCenterRow
      );
    } catch {
      let rows = await callAnalyticsRpc(
        'analytics_customer_action_center',
        {
          p_as_of_date: params.asOfDate ?? null,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
          p_priority: params.priority ?? null,
          p_action_type: params.actionType ?? null,
          p_search: params.search ?? null,
          p_limit: 1000000,
          p_offset: 0,
        },
        mapActionCenterRow
      );
      if (params.risk) {
        const wanted = params.risk.toUpperCase();
        rows = rows.filter((row) => row.risk.toUpperCase() === wanted);
      }
      return rows.slice(offset, offset + limit);
    }
  },
};
