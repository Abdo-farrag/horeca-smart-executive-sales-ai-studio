import { callAnalyticsRpc } from './client';
import { normalizeMonthStart, assertIsoDate } from './validation';
import { toFiniteNumber } from './normalizers';
import {
  CustomerRetentionSummaryResult,
  CustomerSummaryParams,
  CustomerSummaryResult,
  Customer360Params,
  Customer360Result,
  CustomerTrendParams,
  CustomerTrendResult,
  CustomerOrderParams,
  CustomerOrderResult,
  CustomerBuyingFrequencyParams,
  CustomerBuyingFrequencyResult,
  CustomerFavoriteProductsParams,
  CustomerFavoriteProductsResult,
  CustomerSalespersonHistoryParams,
  CustomerSalespersonHistoryResult,
  CustomerRiskParams,
  CustomerRiskResult,
  CustomerProductDropoffParams,
  CustomerProductDropoffResult,
  CustomerCrossSellCandidatesParams,
  CustomerCrossSellCandidatesResult,
  CustomerPortfolioSummaryParams,
  CustomerPortfolioSummaryResult,
  CustomerRiskDistributionParams,
  CustomerRiskDistributionResult,
  CustomerActionCenterParams,
  CustomerActionCenterResult,
  CustomerRecoveryOpportunitiesParams,
  CustomerRecoveryOpportunitiesResult,
  CustomerOrdersV2Params,
  CustomerOrdersV2Result,
  CustomerProductDropoffV2Params,
  CustomerProductDropoffV2Result,
  CustomerFavoriteProductsV2Params,
  CustomerFavoriteProductsV2Result,
  CustomerRetentionDetailsV2Params,
  CustomerRetentionDetailsV2Result,
  CustomerActionCenterScopedV2Params,
  CustomerActionCenterScopedV2Result,
} from './types';

export interface CustomerRetentionParams {
  month: string;
  companyName?: string | null;
  salesperson?: string | null;
  governorateCode?: string | null;
  areaCode?: string | null;
  customerId?: number | null;
  productId?: number | null;
}

export const customers = {
  async summary(params: CustomerSummaryParams = {}): Promise<CustomerSummaryResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    try {
      return await callAnalyticsRpc(
        'analytics_customer_summary_v2',
        {
          p_start_date: params.startDate ?? null,
          p_end_date: params.endDate ?? null,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
          p_governorate_code: params.governorateCode ?? null,
          p_area_code: params.areaCode ?? null,
          p_customer_id: params.customerId ?? null,
          p_product_id: params.productId ?? null,
          p_status: params.status ?? null,
          p_search: params.search ?? null,
          p_limit: params.limit ?? null,
          p_offset: params.offset ?? null,
        },
        (row) => ({
          customerId: toFiniteNumber(row.customer_id, 'customer_id'),
          customerName: String(row.customer_name ?? ''),
          companyName: String(row.company_name ?? ''),
          primarySalesperson: String(row.primary_salesperson ?? ''),
          ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
          salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
          averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
          firstOrderDate: row.first_order_date ? String(row.first_order_date) : null,
          lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
          daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
          customerStatus: String(row.customer_status ?? 'ACTIVE'),
          previousPeriodSales: toFiniteNumber(row.previous_period_sales ?? 0, 'previous_period_sales'),
          salesChangePct: row.sales_change_pct != null ? toFiniteNumber(row.sales_change_pct, 'sales_change_pct') : null,
        })
      );
    } catch (_v2Error: any) {
      try {
        return await callAnalyticsRpc(
          'analytics_top_customers',
          {
            p_start_date: params.startDate ?? null,
            p_end_date: params.endDate ?? null,
            p_company_name: params.companyName ?? null,
            p_salesperson: params.salesperson ?? null,
            p_limit: params.limit ?? 200,
          },
          (row) => ({
            customerId: toFiniteNumber(row.customer_id, 'customer_id'),
            customerName: String(row.customer_name ?? ''),
            companyName: String(row.company_name ?? ''),
            primarySalesperson: String(row.primary_salesperson ?? ''),
            ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
            salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
            averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
            firstOrderDate: null,
            lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
            daysSinceLastOrder: 0,
            customerStatus: 'ACTIVE',
            previousPeriodSales: 0,
            salesChangePct: null,
          })
        );
      } catch {
        throw _v2Error;
      }
    }
  },

  async get360(params: Customer360Params): Promise<Customer360Result[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    let primaryRes: Customer360Result[] = [];
    try {
      primaryRes = await callAnalyticsRpc(
        'analytics_customer_360',
        {
          p_customer_id: params.customerId,
          p_start_date: params.startDate ?? null,
          p_end_date: params.endDate ?? null,
          p_company_name: params.companyName ?? null,
        },
        (row) => ({
          customerId: toFiniteNumber(row.customer_id, 'customer_id'),
          customerName: String(row.customer_name ?? ''),
          companyName: String(row.company_name ?? ''),
          currentSalesperson: String(row.current_salesperson ?? ''),
          phone: row.phone ? String(row.phone) : null,
          mobile: row.mobile ? String(row.mobile) : null,
          email: row.email ? String(row.email) : null,
          city: row.city ? String(row.city) : null,
          periodOrders: toFiniteNumber(row.period_orders ?? 0, 'period_orders'),
          periodSales: toFiniteNumber(row.period_sales ?? 0, 'period_sales'),
          averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
          firstOrderDate: row.first_order_date ? String(row.first_order_date) : null,
          lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
          daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
          averageDaysBetweenOrders: toFiniteNumber(row.average_days_between_orders ?? 0, 'average_days_between_orders'),
          lifetimeOrders: toFiniteNumber(row.lifetime_orders ?? 0, 'lifetime_orders'),
          lifetimeSales: toFiniteNumber(row.lifetime_sales ?? 0, 'lifetime_sales'),
          uniqueProductsCount: toFiniteNumber(row.unique_products_count ?? 0, 'unique_products_count'),
          customerStatus: String(row.customer_status ?? 'ACTIVE'),
        })
      );
    } catch (_err: any) {
      primaryRes = [];
    }

    if (primaryRes.length > 0) {
      return primaryRes;
    }

    // Fallback if analytics_customer_360 returned [] or timed out/errored
    const [periodSummaryRes, lifetimeSummaryRes, freqRes, favRes] = await Promise.allSettled([
      callAnalyticsRpc('analytics_customer_summary_v2', {
        p_start_date: params.startDate ?? '2000-01-01',
        p_end_date: params.endDate ?? '2099-12-31',
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null
      }, (row) => row),
      callAnalyticsRpc('analytics_customer_summary_v2', {
        p_start_date: '2000-01-01',
        p_end_date: '2099-12-31',
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null
      }, (row) => row),
      callAnalyticsRpc('analytics_customer_buying_frequency', {
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null
      }, (row) => row),
      callAnalyticsRpc('analytics_customer_favorite_products', {
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null,
        p_limit: 100
      }, (row) => row)
    ]);

    const pSummary = periodSummaryRes.status === 'fulfilled' && periodSummaryRes.value.length > 0 ? (periodSummaryRes.value[0] as any) : null;
    const lSummary = (lifetimeSummaryRes.status === 'fulfilled' && lifetimeSummaryRes.value.length > 0 ? (lifetimeSummaryRes.value[0] as any) : null) || pSummary;
    const freq = freqRes.status === 'fulfilled' && freqRes.value.length > 0 ? (freqRes.value[0] as any) : null;
    const favs = favRes.status === 'fulfilled' ? favRes.value : [];

    if (!pSummary && !lSummary && !freq) {
      return [];
    }

    return [{
      customerId: params.customerId,
      customerName: String(lSummary?.customer_name || pSummary?.customer_name || `Customer #${params.customerId}`),
      companyName: String(lSummary?.company_name || pSummary?.company_name || params.companyName || ''),
      currentSalesperson: String(lSummary?.primary_salesperson || pSummary?.primary_salesperson || ''),
      phone: lSummary?.phone ? String(lSummary.phone) : null,
      mobile: lSummary?.mobile ? String(lSummary.mobile) : null,
      email: lSummary?.email ? String(lSummary.email) : null,
      city: lSummary?.city ? String(lSummary.city) : null,
      periodOrders: toFiniteNumber(pSummary?.orders_count ?? 0, 'period_orders'),
      periodSales: toFiniteNumber(pSummary?.sales_value ?? 0, 'period_sales'),
      averageOrderValue: toFiniteNumber(pSummary?.average_order_value ?? 0, 'average_order_value'),
      firstOrderDate: pSummary?.first_order_date ? String(pSummary.first_order_date) : (freq?.first_order_date ? String(freq.first_order_date) : null),
      lastOrderDate: pSummary?.last_order_date ? String(pSummary.last_order_date) : (freq?.last_order_date ? String(freq.last_order_date) : null),
      daysSinceLastOrder: toFiniteNumber(freq?.days_since_last_order ?? pSummary?.days_since_last_order ?? 0, 'days_since_last_order'),
      averageDaysBetweenOrders: toFiniteNumber(freq?.average_days_between_orders ?? 0, 'average_days_between_orders'),
      lifetimeOrders: toFiniteNumber(freq?.orders_count ?? lSummary?.orders_count ?? 0, 'lifetime_orders'),
      lifetimeSales: toFiniteNumber(lSummary?.sales_value ?? 0, 'lifetime_sales'),
      uniqueProductsCount: favs.length,
      customerStatus: String(lSummary?.customer_status || pSummary?.customer_status || 'ACTIVE')
    }];
  },

  async trend(params: CustomerTrendParams): Promise<CustomerTrendResult[]> {
    return callAnalyticsRpc(
      'analytics_customer_trend',
      {
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        orderMonth: String(row.order_month ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
        activeSalespeople: toFiniteNumber(row.active_salespeople ?? 0, 'active_salespeople'),
      })
    );
  },

  async orders(params: CustomerOrderParams): Promise<CustomerOrderResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_customer_orders',
      {
        p_customer_id: params.customerId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
        p_limit: params.limit ?? null,
        p_offset: params.offset ?? null,
      },
      (row) => ({
        orderId: toFiniteNumber(row.order_id, 'order_id'),
        orderName: String(row.order_name ?? ''),
        orderDate: String(row.order_date ?? ''),
        companyName: String(row.company_name ?? ''),
        salesperson: String(row.salesperson ?? ''),
        orderValue: toFiniteNumber(row.order_value ?? 0, 'order_value'),
        linesCount: toFiniteNumber(row.lines_count ?? 0, 'lines_count'),
        productsCount: toFiniteNumber(row.products_count ?? 0, 'products_count'),
        totalQty: toFiniteNumber(row.total_qty ?? 0, 'total_qty'),
      })
    );
  },

  async buyingFrequency(params: CustomerBuyingFrequencyParams): Promise<CustomerBuyingFrequencyResult[]> {
    return callAnalyticsRpc(
      'analytics_customer_buying_frequency',
      {
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        activeDays: toFiniteNumber(row.active_days ?? row.active_purchase_days ?? 0, 'active_days'),
        firstOrderDate: row.first_order_date ? String(row.first_order_date) : null,
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        averageDaysBetweenOrders: toFiniteNumber(row.average_days_between_orders ?? row.avg_days_between_orders ?? 0, 'average_days_between_orders'),
        medianDaysBetweenOrders: toFiniteNumber(row.median_days_between_orders ?? row.median_days ?? 0, 'median_days_between_orders'),
        daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
        expectedNextOrderDate: (row.expected_next_order_date || row.expected_next_order) ? String(row.expected_next_order_date || row.expected_next_order) : null,
        frequencyStatus: String(row.frequency_status ?? 'ON_TIME'),
      })
    );
  },

  async favoriteProducts(params: CustomerFavoriteProductsParams): Promise<CustomerFavoriteProductsResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_customer_favorite_products',
      {
        p_customer_id: params.customerId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
        p_limit: params.limit ?? null,
      },
      (row) => ({
        productId: toFiniteNumber(row.product_id, 'product_id'),
        productName: String(row.product_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        quantity: toFiniteNumber(row.quantity ?? row.total_qty ?? 0, 'quantity'),
        salesValue: toFiniteNumber(row.sales_value ?? row.sales ?? 0, 'sales_value'),
        salesSharePct: toFiniteNumber(row.sales_share_pct ?? row.sales_share_percent ?? row.share_pct ?? 0, 'sales_share_pct'),
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        primarySalesperson: row.primary_salesperson ? String(row.primary_salesperson) : null,
      })
    );
  },

  async salespersonHistory(params: CustomerSalespersonHistoryParams): Promise<CustomerSalespersonHistoryResult[]> {
    return callAnalyticsRpc(
      'analytics_customer_salesperson_history',
      {
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        orderMonth: String(row.order_month ?? row.month ?? ''),
        salespersonName: String(row.salesperson_name ?? row.salesperson ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        salesValue: toFiniteNumber(row.sales_value ?? row.sales ?? 0, 'sales_value'),
        firstOrderDate: row.first_order_date ? String(row.first_order_date) : null,
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        isPrimary: Boolean(row.is_primary ?? row.primary_flag ?? false),
      })
    );
  },

  async risk(params: CustomerRiskParams): Promise<CustomerRiskResult[]> {
    return callAnalyticsRpc(
      'analytics_customer_risk',
      {
        p_customer_id: params.customerId,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        riskLevel: String(row.risk_level ?? 'LOW'),
        riskReason: String(row.risk_reason ?? row.reason ?? ''),
        recoveryPriority: String(row.recovery_priority ?? row.priority ?? 'LOW'),
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
        medianBuyingInterval: toFiniteNumber(row.median_buying_interval ?? row.median_interval ?? 0, 'median_buying_interval'),
        recent30DaySales: toFiniteNumber(row.recent_30day_sales ?? row.recent_30d_sales ?? 0, 'recent_30day_sales'),
        previous30DaySales: toFiniteNumber(row.previous_30day_sales ?? row.previous_30d_sales ?? 0, 'previous_30day_sales'),
        salesChangePct: toFiniteNumber(row.sales_change_pct ?? row.sales_change_percent ?? 0, 'sales_change_pct'),
      })
    );
  },

  async productDropoff(params: CustomerProductDropoffParams): Promise<CustomerProductDropoffResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_customer_product_dropoff',
      {
        p_customer_id: params.customerId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        productId: toFiniteNumber(row.product_id, 'product_id'),
        productName: String(row.product_name ?? ''),
        previousSales: toFiniteNumber(row.previous_sales ?? row.prev_sales ?? 0, 'previous_sales'),
        currentSales: toFiniteNumber(row.current_sales ?? row.curr_sales ?? 0, 'current_sales'),
        previousQuantity: toFiniteNumber(row.previous_quantity ?? row.prev_qty ?? 0, 'previous_quantity'),
        currentQuantity: toFiniteNumber(row.current_quantity ?? row.curr_qty ?? 0, 'current_quantity'),
        salesChangePct: toFiniteNumber(row.sales_change_pct ?? row.change_pct ?? 0, 'sales_change_pct'),
        status: String(row.status ?? row.dropoff_status ?? 'STABLE_OR_GROWING'),
        recoveryValue: toFiniteNumber(row.recovery_value ?? row.recovery_opp ?? 0, 'recovery_value'),
      })
    );
  },

  async crossSellCandidates(params: CustomerCrossSellCandidatesParams): Promise<CustomerCrossSellCandidatesResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_customer_cross_sell_candidates',
      {
        p_customer_id: params.customerId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
        p_limit: params.limit ?? null,
      },
      (row) => ({
        productId: toFiniteNumber(row.product_id, 'product_id'),
        productName: String(row.product_name ?? ''),
        peerCustomersCount: toFiniteNumber(row.peer_customers_count ?? row.peer_customers ?? 0, 'peer_customers_count'),
        peerOrdersCount: toFiniteNumber(row.peer_orders_count ?? row.peer_orders ?? 0, 'peer_orders_count'),
        peerSalesValue: toFiniteNumber(row.peer_sales_value ?? row.peer_sales ?? 0, 'peer_sales_value'),
        affinityScore: toFiniteNumber(row.affinity_score ?? row.score ?? 0, 'affinity_score'),
      })
    );
  },

  async retention(params: CustomerRetentionParams): Promise<CustomerRetentionSummaryResult[]> {
    const normalizedMonth = normalizeMonthStart(params.month, 'month');

    const mapper = (row: any) => ({
      previousActiveCustomers: toFiniteNumber(row.previous_active_customers ?? 0, 'previous_active_customers'),
      retainedWithSameRep: toFiniteNumber(row.retained_same_rep ?? row.retained_with_same_rep ?? 0, 'retained_same_rep'),
      transferredCustomers: toFiniteNumber(row.transferred_customers ?? 0, 'transferred_customers'),
      trueLostCustomers: toFiniteNumber(row.true_lost_customers ?? 0, 'true_lost_customers'),
      newCustomers: toFiniteNumber(row.new_customers ?? 0, 'new_customers'),
      companyRetentionRate: toFiniteNumber(row.company_retention_rate ?? 0, 'company_retention_rate'),
      sameRepRetentionRate: toFiniteNumber(row.same_rep_retention_rate ?? 0, 'same_rep_retention_rate'),
      lostCustomerRevenueEgp: toFiniteNumber(row.lost_previous_sales ?? row.lost_customer_revenue_egp ?? 0, 'lost_previous_sales'),
    });

    try {
      return await callAnalyticsRpc(
        'analytics_customer_retention_summary_v2',
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
        'analytics_customer_retention_summary',
        {
          p_month: normalizedMonth,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
        },
        mapper
      );
    }
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
        highPriority: toFiniteNumber(row.high_priority ?? row.high_priority_count ?? 0, 'high_priority'),
        mediumPriority: toFiniteNumber(row.medium_priority ?? row.medium_priority_count ?? 0, 'medium_priority'),
        lowPriority: toFiniteNumber(row.low_priority ?? row.low_priority_count ?? 0, 'low_priority'),
        winBackCustomers: toFiniteNumber(row.win_back_customers ?? row.winback_customers ?? 0, 'win_back_customers'),
        decliningCustomers: toFiniteNumber(row.declining_customers ?? 0, 'declining_customers'),
        overdueCustomers: toFiniteNumber(row.overdue_customers ?? 0, 'overdue_customers'),
        salespersonTransferReviews: toFiniteNumber(
          row.salesperson_transfer_reviews ?? row.owner_transfer_customers ?? row.transfer_reviews ?? 0,
          'salesperson_transfer_reviews'
        ),
        totalRecoveryOpportunity: toFiniteNumber(
          row.total_recovery_opportunity ?? row.total_recovery_opportunity_egp ?? 0,
          'total_recovery_opportunity'
        ),
        highPriorityRecoveryOpportunity: toFiniteNumber(
          row.high_priority_recovery_opportunity ?? row.high_priority_recovery_opportunity_egp ?? 0,
          'high_priority_recovery_opportunity'
        ),
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
        customersPct: toFiniteNumber(row.customers_pct ?? row.pct ?? row.percentage ?? 0, 'customers_pct'),
        recoveryOpportunity: toFiniteNumber(
          row.recovery_opportunity ?? row.recovery_value ?? row.recovery_opportunity_value ?? 0,
          'recovery_opportunity'
        ),
      })
    );
  },

  async actionCenter(params: CustomerActionCenterParams = {}): Promise<CustomerActionCenterResult[]> {
    if (params.asOfDate) assertIsoDate(params.asOfDate, 'asOfDate');

    const mapper = (row: any) => ({
      customerId: toFiniteNumber(row.customer_id, 'customer_id'),
      customerName: String(row.customer_name ?? ''),
      companyName: String(row.company_name ?? ''),
      salesperson: String(row.salesperson ?? row.current_salesperson ?? row.primary_salesperson ?? ''),
      priority: String(row.priority ?? row.action_priority ?? 'LOW'),
      actionType: String(row.action_type ?? 'MONITOR'),
      actionReason: String(row.action_reason ?? row.reason ?? ''),
      lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
      daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
      medianBuyingInterval: toFiniteNumber(row.median_buying_interval ?? row.median_interval ?? 0, 'median_buying_interval'),
      previous30dSales: toFiniteNumber(row.previous_30d_sales ?? row.previous_30day_sales ?? 0, 'previous_30d_sales'),
      recent30dSales: toFiniteNumber(row.recent_30d_sales ?? row.recent_30day_sales ?? 0, 'recent_30d_sales'),
      salesChangePct: row.sales_change_pct != null ? toFiniteNumber(row.sales_change_pct, 'sales_change_pct') : null,
      recoveryOpportunity: toFiniteNumber(row.recovery_opportunity ?? row.recovery_value ?? 0, 'recovery_opportunity'),
      risk: String(row.risk ?? row.risk_level ?? 'LOW'),
      salespersonChanged: Boolean(row.salesperson_changed ?? row.is_salesperson_changed ?? false),
    });

    let rawRows: CustomerActionCenterResult[] = [];

    try {
      rawRows = await callAnalyticsRpc(
        'analytics_customer_action_center_v2',
        {
          p_as_of_date: params.asOfDate ?? null,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
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
        'analytics_customer_action_center',
        {
          p_as_of_date: params.asOfDate ?? null,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salesperson ?? null,
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
      rawRows = rows;
    }

    // If companyName is specified (e.g. 'MAS' or 'Horeca Smart'), preserve company-scoped behavior
    if (params.companyName) {
      return rawRows;
    }

    // Enterprise customer grain consolidation (p_company_name IS NULL)
    // Check if there are multiple company rows for the same customer_id
    const customerMap = new Map<number, CustomerActionCenterResult[]>();
    for (const row of rawRows) {
      const list = customerMap.get(row.customerId) || [];
      list.push(row);
      customerMap.set(row.customerId, list);
    }

    let hasMultiCompanyRows = false;
    for (const list of customerMap.values()) {
      if (list.length > 1) {
        hasMultiCompanyRows = true;
        break;
      }
    }

    if (!hasMultiCompanyRows && !params.limit && !params.offset) {
      return rawRows;
    }

    const consolidated: CustomerActionCenterResult[] = [];
    for (const [, rows] of customerMap.entries()) {
      if (rows.length === 1) {
        consolidated.push(rows[0]);
        continue;
      }

      // Sort by lastOrderDate descending
      rows.sort((a, b) => {
        const dateA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
        const dateB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
        return dateB - dateA;
      });

      const mostRecentRow = rows[0];
      const latestOrderDate = mostRecentRow.lastOrderDate;
      const minDaysSince = Math.min(...rows.map((r) => r.daysSinceLastOrder));
      const totalPrevious30d = rows.reduce((sum, r) => sum + r.previous30dSales, 0);
      const totalRecent30d = rows.reduce((sum, r) => sum + r.recent30dSales, 0);
      const recoveryOpp = Math.max(0, totalPrevious30d - totalRecent30d);
      const salesChangePct = totalPrevious30d > 0
        ? ((totalRecent30d - totalPrevious30d) / totalPrevious30d) * 100
        : null;
      const medianInterval = mostRecentRow.medianBuyingInterval || 0;
      const salespersonChanged = rows.some((r) => r.salespersonChanged);

      // Business risk rules
      let risk = 'LOW';
      if (minDaysSince > 120) {
        risk = 'LOST';
      } else if (minDaysSince > 60 || (totalPrevious30d > 0 && totalRecent30d <= totalPrevious30d * 0.5)) {
        risk = 'HIGH';
      } else if (minDaysSince > 30 || (totalPrevious30d > 0 && totalRecent30d < totalPrevious30d * 0.7)) {
        risk = 'MEDIUM';
      }

      // Business action_type rules
      let actionType = 'MONITOR';
      let actionReason = 'أداء مستقر - استمرار المتابعة الدورية';
      if (minDaysSince > 120) {
        actionType = 'REACTIVATE_LOST';
        actionReason = 'عميل متوقف عن الشراء لأكثر من 120 يوما';
      } else if (minDaysSince > 30) {
        actionType = 'WIN_BACK';
        actionReason = 'عميل متوقف عن الشراء لأكثر من 30 يوما';
      } else if (totalPrevious30d > 0 && totalRecent30d < totalPrevious30d * 0.7) {
        actionType = 'RECOVER_DECLINE';
        actionReason = 'انخفاض في المبيعات مقارنة بالفترة السابقة';
      } else if (medianInterval > 0 && minDaysSince > Math.max(7, Math.ceil(medianInterval * 2))) {
        actionType = 'OVERDUE_FOLLOWUP';
        actionReason = 'تأخر في الشراء عن الدورة المعتادة';
      } else if (salespersonChanged) {
        actionType = 'OWNER_TRANSFER_REVIEW';
        actionReason = 'تغيير في مسؤول المبيعات يتطلب متابعة';
      }

      // Business priority rules
      let priority = 'LOW';
      if (minDaysSince > 120 || minDaysSince > 60 || recoveryOpp >= 100000) {
        priority = 'HIGH';
      } else if (minDaysSince > 30 || recoveryOpp >= 25000 || (medianInterval > 0 && minDaysSince > Math.max(7, Math.ceil(medianInterval * 2)))) {
        priority = 'MEDIUM';
      }

      consolidated.push({
        customerId: mostRecentRow.customerId,
        customerName: mostRecentRow.customerName,
        companyName: 'All',
        salesperson: mostRecentRow.salesperson,
        priority,
        actionType,
        actionReason,
        lastOrderDate: latestOrderDate,
        daysSinceLastOrder: minDaysSince,
        medianBuyingInterval: medianInterval,
        previous30dSales: totalPrevious30d,
        recent30dSales: totalRecent30d,
        salesChangePct,
        recoveryOpportunity: recoveryOpp,
        risk,
        salespersonChanged,
      });
    }

    // Filter consolidated items if priority, risk, actionType or search were requested
    let finalRows = consolidated;
    if (params.priority) {
      const p = params.priority.toUpperCase();
      finalRows = finalRows.filter((r) => r.priority.toUpperCase() === p);
    }
    if (params.risk) {
      const r = params.risk.toUpperCase();
      finalRows = finalRows.filter((row) => row.risk.toUpperCase() === r);
    }
    if (params.actionType) {
      const a = params.actionType.toUpperCase();
      finalRows = finalRows.filter((r) => r.actionType.toUpperCase() === a);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      finalRows = finalRows.filter((r) =>
        r.customerName.toLowerCase().includes(q) || String(r.customerId).includes(q)
      );
    }

    if (params.limit != null || params.offset != null) {
      const offset = params.offset ?? 0;
      const limit = params.limit ?? finalRows.length;
      return finalRows.slice(offset, offset + limit);
    }

    return finalRows;
  },

  async customerOrdersV2(params: CustomerOrdersV2Params): Promise<CustomerOrdersV2Result[]> {
    if (!params.customerId) throw new Error('customerId is required for customerOrdersV2');
    assertIsoDate(params.startDate, 'startDate');
    assertIsoDate(params.endDate, 'endDate');

    const limit = params.limit != null ? Math.min(Math.max(params.limit, 1), 20) : 10;
    const offset = params.offset != null ? Math.max(params.offset, 0) : 0;

    return callAnalyticsRpc(
      'analytics_customer_orders_v2',
      {
        p_customer_id: params.customerId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_product_id: params.productId ?? null,
        p_limit: limit,
        p_offset: offset,
      },
      (row) => ({
        orderId: toFiniteNumber(row.order_id, 'order_id'),
        orderName: String(row.order_name ?? ''),
        orderDate: String(row.order_date ?? ''),
        companyName: String(row.company_name ?? ''),
        salesperson: String(row.salesperson ?? ''),
        governorateName: String(row.governorate_name ?? ''),
        areaName: String(row.area_name ?? ''),
        orderValue: toFiniteNumber(row.order_value ?? 0, 'order_value'),
        linesCount: toFiniteNumber(row.lines_count ?? 0, 'lines_count'),
        productsCount: toFiniteNumber(row.products_count ?? 0, 'products_count'),
        totalQty: toFiniteNumber(row.total_qty ?? 0, 'total_qty'),
        orderStatus: String(row.order_status ?? 'CONFIRMED'),
      })
    );
  },

  async customerProductDropoffV2(params: CustomerProductDropoffV2Params): Promise<CustomerProductDropoffV2Result[]> {
    if (!params.customerId) throw new Error('customerId is required for customerProductDropoffV2');
    assertIsoDate(params.startDate, 'startDate');
    assertIsoDate(params.endDate, 'endDate');

    const limit = params.limit != null ? Math.min(Math.max(params.limit, 1), 20) : 20;

    return callAnalyticsRpc(
      'analytics_customer_product_dropoff_v2',
      {
        p_customer_id: params.customerId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_product_id: params.productId ?? null,
        p_limit: limit,
      },
      (row) => ({
        productId: toFiniteNumber(row.product_id, 'product_id'),
        productName: String(row.product_name ?? ''),
        categoryName: String(row.category_name ?? ''),
        previousSales: toFiniteNumber(row.previous_sales ?? 0, 'previous_sales'),
        currentSales: toFiniteNumber(row.current_sales ?? 0, 'current_sales'),
        previousQty: toFiniteNumber(row.previous_qty ?? 0, 'previous_qty'),
        currentQty: toFiniteNumber(row.current_qty ?? 0, 'current_qty'),
        salesChangePct: row.sales_change_pct != null ? toFiniteNumber(row.sales_change_pct, 'sales_change_pct') : null,
        status: String(row.status ?? 'STABLE'),
        recoveryValue: toFiniteNumber(row.recovery_value ?? 0, 'recovery_value'),
      })
    );
  },

  async customerFavoriteProductsV2(params: CustomerFavoriteProductsV2Params): Promise<CustomerFavoriteProductsV2Result[]> {
    if (!params.customerId) throw new Error('customerId is required for customerFavoriteProductsV2');
    assertIsoDate(params.startDate, 'startDate');
    assertIsoDate(params.endDate, 'endDate');

    const limit = params.limit != null ? Math.min(Math.max(params.limit, 1), 20) : 20;

    return callAnalyticsRpc(
      'analytics_customer_favorite_products_v2',
      {
        p_customer_id: params.customerId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_limit: limit,
      },
      (row) => ({
        productId: toFiniteNumber(row.product_id, 'product_id'),
        productName: String(row.product_name ?? ''),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        quantity: toFiniteNumber(row.quantity ?? 0, 'quantity'),
        salesSharePct: row.sales_share_pct != null ? toFiniteNumber(row.sales_share_pct, 'sales_share_pct') : null,
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
      })
    );
  },

  async customerRetentionDetailsV2(params: CustomerRetentionDetailsV2Params): Promise<CustomerRetentionDetailsV2Result[]> {
    const month = normalizeMonthStart(params.month, 'month');
    const limit = params.limit != null ? Math.min(Math.max(params.limit, 1), 20) : 20;
    const offset = params.offset != null ? Math.max(params.offset, 0) : 0;

    return callAnalyticsRpc(
      'analytics_customer_retention_details_v2',
      {
        p_month: month,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_customer_id: params.customerId ?? null,
        p_product_id: params.productId ?? null,
        p_status: params.status ?? null,
        p_limit: limit,
        p_offset: offset,
      },
      (row) => ({
        companyName: String(row.company_name ?? ''),
        customerId: toFiniteNumber(row.customer_id, 'customer_id'),
        customerName: String(row.customer_name ?? ''),
        previousSalesperson: row.previous_salesperson ? String(row.previous_salesperson) : null,
        currentSalesperson: row.current_salesperson ? String(row.current_salesperson) : null,
        previousOrders: toFiniteNumber(row.previous_orders ?? 0, 'previous_orders'),
        currentOrders: toFiniteNumber(row.current_orders ?? 0, 'current_orders'),
        previousSales: toFiniteNumber(row.previous_sales ?? 0, 'previous_sales'),
        currentSales: toFiniteNumber(row.current_sales ?? 0, 'current_sales'),
        retentionStatus: String(row.retention_status ?? 'RETAINED'),
        salesChangePct: row.sales_change_pct != null ? toFiniteNumber(row.sales_change_pct, 'sales_change_pct') : null,
        previousLastOrderDate: row.previous_last_order_date ? String(row.previous_last_order_date) : null,
        currentLastOrderDate: row.current_last_order_date ? String(row.current_last_order_date) : null,
      })
    );
  },

  async customerActionCenterScopedV2(params: CustomerActionCenterScopedV2Params = {}): Promise<CustomerActionCenterScopedV2Result[]> {
    if (params.asOfDate) assertIsoDate(params.asOfDate, 'asOfDate');

    const limit = params.limit != null ? Math.min(Math.max(params.limit, 1), 20) : 20;
    const offset = params.offset != null ? Math.max(params.offset, 0) : 0;

    return callAnalyticsRpc(
      'analytics_customer_action_center_scoped_v2',
      {
        p_as_of_date: params.asOfDate ?? null,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_customer_id: params.customerId ?? null,
        p_product_id: params.productId ?? null,
        p_priority: params.priority ?? null,
        p_action_type: params.actionType ?? null,
        p_risk: params.risk ?? null,
        p_search: params.search ?? null,
        p_limit: limit,
        p_offset: offset,
      },
      (row) => ({
        customerId: toFiniteNumber(row.customer_id, 'customer_id'),
        customerName: String(row.customer_name ?? ''),
        companyName: String(row.company_name ?? ''),
        currentSalesperson: String(row.current_salesperson ?? row.salesperson ?? ''),
        salesperson: String(row.current_salesperson ?? row.salesperson ?? ''),
        priority: String(row.priority ?? 'LOW'),
        actionType: String(row.action_type ?? 'MONITOR'),
        actionReason: String(row.action_reason ?? ''),
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
        medianDaysBetweenOrders: toFiniteNumber(row.median_days_between_orders ?? row.median_buying_interval ?? 0, 'median_days_between_orders'),
        medianBuyingInterval: toFiniteNumber(row.median_days_between_orders ?? row.median_buying_interval ?? 0, 'median_buying_interval'),
        previous30dSales: toFiniteNumber(row.previous_30d_sales ?? 0, 'previous_30d_sales'),
        recent30dSales: toFiniteNumber(row.recent_30d_sales ?? 0, 'recent_30d_sales'),
        salesChangePct: row.sales_change_pct != null ? toFiniteNumber(row.sales_change_pct, 'sales_change_pct') : null,
        recoveryOpportunity: toFiniteNumber(row.recovery_opportunity ?? 0, 'recovery_opportunity'),
        riskLevel: String(row.risk_level ?? row.risk ?? 'LOW'),
        risk: String(row.risk_level ?? row.risk ?? 'LOW'),
        salespersonChanged: Boolean(row.salesperson_changed ?? false),
      })
    );
  },

  async recoveryOpportunities(params: CustomerRecoveryOpportunitiesParams = {}): Promise<CustomerRecoveryOpportunitiesResult[]> {
    if (params.asOfDate) assertIsoDate(params.asOfDate, 'asOfDate');

    return callAnalyticsRpc(
      'analytics_customer_recovery_opportunities',
      {
        p_as_of_date: params.asOfDate ?? null,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_limit: params.limit ?? null,
      },
      (row) => ({
        customerId: toFiniteNumber(row.customer_id, 'customer_id'),
        customerName: String(row.customer_name ?? ''),
        companyName: String(row.company_name ?? ''),
        salesperson: String(row.salesperson ?? row.responsible_salesperson ?? row.current_salesperson ?? ''),
        recoveryValue: toFiniteNumber(row.recovery_value ?? row.recovery_opportunity ?? 0, 'recovery_value'),
        previous30dSales: toFiniteNumber(row.previous_30d_sales ?? row.previous_30day_sales ?? 0, 'previous_30d_sales'),
        recent30dSales: toFiniteNumber(row.recent_30d_sales ?? row.recent_30day_sales ?? 0, 'recent_30d_sales'),
        salesDeclinePct:
          row.sales_decline_pct != null
            ? toFiniteNumber(row.sales_decline_pct, 'sales_decline_pct')
            : row.sales_change_pct != null
            ? toFiniteNumber(row.sales_change_pct, 'sales_change_pct')
            : null,
        daysSinceLastOrder: toFiniteNumber(row.days_since_last_order ?? 0, 'days_since_last_order'),
        actionReason: String(row.action_reason ?? row.reason ?? ''),
      })
    );
  },
};
