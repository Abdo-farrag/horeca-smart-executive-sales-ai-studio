import { callAnalyticsRpc } from './client';
import { assertIsoDate } from './validation';
import { toFiniteNumber } from './normalizers';
import {
  ProductSummaryParams,
  ProductSummaryResult,
  Product360Params,
  Product360Result,
  ProductTrendParams,
  ProductTrendResult,
  ProductDailyTrendParams,
  ProductDailyTrendResult,
  ProductCompanySplitParams,
  ProductCompanySplitResult,
  ProductLifecycleParams,
  ProductLifecycleResult,
  ProductDataQualityParams,
  ProductDataQualityResult,
  ProductAlertsParams,
  ProductAlertResult,
  ProductScoreParams,
  ProductScoreResult,
  ProductReconciliationParams,
  ProductReconciliationResult,
  ProductTopCustomerParams,
  ProductTopCustomerResult,
  ProductTopSalespersonParams,
  ProductTopSalespersonResult,
  ProductCustomerRetentionParams,
  ProductCustomerRetentionResult,
  ProductCustomerRetentionSummaryParams,
  ProductCustomerRetentionSummaryResult,
  ProductTopCustomersV2Params,
  ProductTopCustomersV2Result,
} from './types';

export const products = {
  async summary(params: ProductSummaryParams = {}): Promise<ProductSummaryResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_summary_v2',
      {
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_customer_id: params.customerId ?? null,
        p_product_id: params.productId ?? null,
        p_search: params.search ?? null,
        p_limit: params.limit ?? null,
        p_offset: params.offset ?? null,
      },
      (row) => ({
        productId: toFiniteNumber(row.product_id, 'product_id'),
        productName: String(row.product_name ?? ''),
        productCategory: row.product_category ? String(row.product_category) : null,
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        uniqueCustomers: toFiniteNumber(row.unique_customers ?? 0, 'unique_customers'),
        quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0, 'qty_sold'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        averageUnitValue: toFiniteNumber(row.average_unit_value ?? 0, 'average_unit_value'),
        firstOrderDate: row.first_order_date ? String(row.first_order_date) : null,
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        activeSalespeople: toFiniteNumber(row.salespeople_count ?? row.active_salespeople ?? 0, 'salespeople_count'),
        companiesCount: toFiniteNumber(row.companies_count ?? 0, 'companies_count'),
      })
    );
  },

  async get360(params: Product360Params): Promise<Product360Result[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_360',
      {
        p_product_id: params.productId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        productId: toFiniteNumber(row.product_id, 'product_id'),
        productName: String(row.product_name ?? ''),
        productCategory: row.product_category ? String(row.product_category) : null,
        periodSales: toFiniteNumber(row.period_sales ?? 0, 'period_sales'),
        periodQuantity: toFiniteNumber(row.period_quantity ?? row.period_qty ?? 0, 'period_quantity'),
        periodOrders: toFiniteNumber(row.period_orders ?? 0, 'period_orders'),
        periodCustomers: toFiniteNumber(row.period_customers ?? 0, 'period_customers'),
        periodSalespeople: toFiniteNumber(row.period_salespeople ?? 0, 'period_salespeople'),
        periodCompanies: toFiniteNumber(row.period_companies ?? 0, 'period_companies'),
        averageUnitValue: toFiniteNumber(row.average_unit_value ?? 0, 'average_unit_value'),
        firstOrderDate: row.first_order_date ? String(row.first_order_date) : null,
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        lifetimeSales: toFiniteNumber(row.lifetime_sales ?? 0, 'lifetime_sales'),
        lifetimeQuantity: toFiniteNumber(row.lifetime_quantity ?? row.lifetime_qty ?? 0, 'lifetime_quantity'),
        lifetimeOrders: toFiniteNumber(row.lifetime_orders ?? 0, 'lifetime_orders'),
        lifetimeCustomers: toFiniteNumber(row.lifetime_customers ?? 0, 'lifetime_customers'),
        lifetimeFirstOrderDate: row.lifetime_first_order_date ? String(row.lifetime_first_order_date) : (row.first_order_date ? String(row.first_order_date) : null),
        lifetimeLastOrderDate: row.lifetime_last_order_date ? String(row.lifetime_last_order_date) : (row.last_order_date ? String(row.last_order_date) : null),
      })
    );
  },

  async trend(params: ProductTrendParams): Promise<ProductTrendResult[]> {
    return callAnalyticsRpc(
      'analytics_product_trend',
      {
        p_product_id: params.productId,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        orderMonth: String(row.order_month ?? ''),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0, 'qty_sold'),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        uniqueCustomers: toFiniteNumber(row.unique_customers ?? 0, 'unique_customers'),
        averageUnitValue: toFiniteNumber(row.average_unit_value ?? 0, 'average_unit_value'),
      })
    );
  },

  async dailyTrend(params: ProductDailyTrendParams): Promise<ProductDailyTrendResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_daily_trend',
      {
        p_product_id: params.productId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        reportDate: String(row.report_date ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        customersCount: toFiniteNumber(row.customers_count ?? row.unique_customers ?? 0, 'customers_count'),
        quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0, 'qty_sold'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        averageUnitValue: toFiniteNumber(row.average_unit_value ?? 0, 'average_unit_value'),
      })
    );
  },

  async companySplit(params: ProductCompanySplitParams): Promise<ProductCompanySplitResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_company_split',
      {
        p_product_id: params.productId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
      },
      (row) => ({
        companyName: String(row.company_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        customersCount: toFiniteNumber(row.customers_count ?? 0, 'customers_count'),
        quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0, 'qty_sold'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        salesSharePct: toFiniteNumber(row.sales_share_pct ?? 0, 'sales_share_pct'),
      })
    );
  },

  async lifecycle(input: ProductLifecycleParams | number): Promise<ProductLifecycleResult[]> {
    const productId = typeof input === 'number' ? input : input.productId;

    return callAnalyticsRpc(
      'analytics_product_lifecycle',
      {
        p_product_id: productId,
      },
      (row) => ({
        firstSaleDate: row.first_sale_date ? String(row.first_sale_date) : null,
        lastSaleDate: row.last_sale_date ? String(row.last_sale_date) : null,
        daysSinceLastSale: toFiniteNumber(row.days_since_last_sale ?? 0, 'days_since_last_sale'),
        lifetimeOrders: toFiniteNumber(row.lifetime_orders ?? 0, 'lifetime_orders'),
        lifetimeCustomers: toFiniteNumber(row.lifetime_customers ?? 0, 'lifetime_customers'),
        lifetimeQuantity: toFiniteNumber(row.lifetime_qty ?? row.lifetime_quantity ?? 0, 'lifetime_qty'),
        lifetimeSales: toFiniteNumber(row.lifetime_sales ?? 0, 'lifetime_sales'),
        activeMonths: toFiniteNumber(row.active_months ?? 0, 'active_months'),
        averageDaysBetweenSales: toFiniteNumber(row.average_days_between_sales ?? 0, 'average_days_between_sales'),
      })
    );
  },

  async dataQuality(input: ProductDataQualityParams | number): Promise<ProductDataQualityResult[]> {
    const productId = typeof input === 'number' ? input : input.productId;

    return callAnalyticsRpc(
      'analytics_product_data_quality',
      {
        p_product_id: productId,
      },
      (row) => ({
        productId: toFiniteNumber(row.product_id, 'product_id'),
        productName: String(row.product_name ?? ''),
        internalReference: row.internal_reference ? String(row.internal_reference) : null,
        barcode: row.barcode ? String(row.barcode) : null,
        categoryName: row.category_name ? String(row.category_name) : null,
        cost: row.cost !== null && row.cost !== undefined ? toFiniteNumber(row.cost, 'cost') : null,
        salePrice: row.sale_price !== null && row.sale_price !== undefined ? toFiniteNumber(row.sale_price, 'sale_price') : null,
        productType: row.product_type ? String(row.product_type) : null,
        isActive: Boolean(row.is_active),
        hasName: Boolean(row.has_name),
        hasInternalReference: Boolean(row.has_internal_reference),
        hasBarcode: Boolean(row.has_barcode),
        hasCategory: Boolean(row.has_category),
        hasCost: Boolean(row.has_cost),
        hasSalePrice: Boolean(row.has_sale_price),
        qualityScore: toFiniteNumber(row.quality_score ?? 0, 'quality_score'),
      })
    );
  },

  async alerts(params: ProductAlertsParams): Promise<ProductAlertResult[]> {
    if (params.asOfDate) assertIsoDate(params.asOfDate, 'asOfDate');

    return callAnalyticsRpc(
      'analytics_product_alerts',
      {
        p_product_id: params.productId,
        p_as_of_date: params.asOfDate ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        alertCode: String(row.alert_code ?? ''),
        severity: String(row.severity ?? 'info'),
        titleAr: String(row.title_ar ?? ''),
        detailsAr: String(row.details_ar ?? ''),
        metricValue: row.metric_value !== null && row.metric_value !== undefined ? toFiniteNumber(row.metric_value, 'metric_value') : null,
      })
    );
  },

  async score(params: ProductScoreParams): Promise<ProductScoreResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_score',
      {
        p_product_id: params.productId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        salesStrengthScore: toFiniteNumber(row.sales_strength_score ?? row.sales_strength ?? 0, 'sales_strength_score'),
        growthScore: toFiniteNumber(row.growth_score ?? row.growth ?? 0, 'growth_score'),
        coverageScore: toFiniteNumber(row.coverage_score ?? row.coverage ?? 0, 'coverage_score'),
        consistencyScore: toFiniteNumber(row.consistency_score ?? row.consistency ?? 0, 'consistency_score'),
        dataQualityScore: toFiniteNumber(row.data_quality_score ?? row.data_quality ?? 0, 'data_quality_score'),
        totalScore: toFiniteNumber(row.total_score ?? row.score ?? 0, 'total_score'),
        methodologyVersion: String(row.methodology_version ?? row.methodology ?? 'P1_v1'),
      })
    );
  },

  async reconciliation(params: ProductReconciliationParams = {}): Promise<ProductReconciliationResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_reconciliation',
      {
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        orderSales: toFiniteNumber(row.order_sales ?? 0, 'order_sales'),
        productLineSales: toFiniteNumber(row.product_line_sales ?? 0, 'product_line_sales'),
        differenceValue: toFiniteNumber(row.difference_value ?? row.difference ?? 0, 'difference_value'),
        reconciliationPct: toFiniteNumber(row.reconciliation_pct ?? 0, 'reconciliation_pct'),
        status: String(row.status ?? 'mismatch'),
      })
    );
  },

  async topCustomers(params: ProductTopCustomerParams): Promise<ProductTopCustomerResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_top_customers',
      {
        p_product_id: params.productId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
        p_limit: params.limit ?? null,
        p_offset: params.offset ?? null,
      },
      (row) => ({
        customerId: toFiniteNumber(row.customer_id, 'customer_id'),
        customerName: String(row.customer_name ?? ''),
        companyName: String(row.company_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0, 'qty_sold'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
        primarySalesperson: row.primary_salesperson ? String(row.primary_salesperson) : null,
      })
    );
  },

  async topSalespeople(params: ProductTopSalespersonParams): Promise<ProductTopSalespersonResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_top_salespeople',
      {
        p_product_id: params.productId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
        p_limit: params.limit ?? null,
        p_offset: params.offset ?? null,
      },
      (row) => ({
        salesperson: String(row.salesperson ?? ''),
        companyName: String(row.company_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        uniqueCustomers: toFiniteNumber(row.unique_customers ?? 0, 'unique_customers'),
        quantitySold: toFiniteNumber(row.qty_sold ?? row.quantity_sold ?? 0, 'qty_sold'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        averageOrderValue: toFiniteNumber(row.average_order_value ?? 0, 'average_order_value'),
      })
    );
  },

  async customerRetention(params: ProductCustomerRetentionParams): Promise<ProductCustomerRetentionResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_customer_retention',
      {
        p_product_id: params.productId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        customerId: toFiniteNumber(row.customer_id, 'customer_id'),
        customerName: String(row.customer_name ?? ''),
        companyName: String(row.company_name ?? row.company ?? ''),
        primarySalesperson: row.primary_salesperson ? String(row.primary_salesperson) : (row.salesperson_name ? String(row.salesperson_name) : (row.salesperson ? String(row.salesperson) : null)),
        previousOrders: toFiniteNumber(row.previous_orders ?? row.prev_orders ?? 0, 'previous_orders'),
        currentOrders: toFiniteNumber(row.current_orders ?? row.curr_orders ?? 0, 'current_orders'),
        previousQuantity: toFiniteNumber(row.previous_quantity ?? row.prev_qty ?? row.previous_qty ?? 0, 'previous_quantity'),
        currentQuantity: toFiniteNumber(row.current_quantity ?? row.curr_qty ?? row.current_qty ?? 0, 'current_quantity'),
        previousSales: toFiniteNumber(row.previous_sales ?? row.prev_sales ?? 0, 'previous_sales'),
        currentSales: toFiniteNumber(row.current_sales ?? row.curr_sales ?? 0, 'current_sales'),
        salesChangePct: toFiniteNumber(row.sales_change_pct ?? row.sales_change_percent ?? row.change_pct ?? 0, 'sales_change_pct'),
        previousLastOrder: row.previous_last_order ? String(row.previous_last_order) : (row.previous_last_order_date ? String(row.previous_last_order_date) : (row.prev_last_order ? String(row.prev_last_order) : null)),
        currentLastOrder: row.current_last_order ? String(row.current_last_order) : (row.current_last_order_date ? String(row.current_last_order_date) : (row.curr_last_order ? String(row.curr_last_order) : null)),
        status: String(row.status ?? row.retention_status ?? ''),
        recoveryPriority: String(row.recovery_priority ?? row.priority ?? 'LOW'),
      })
    );
  },

  async customerRetentionSummary(params: ProductCustomerRetentionSummaryParams): Promise<ProductCustomerRetentionSummaryResult[]> {
    if (params.startDate) assertIsoDate(params.startDate, 'startDate');
    if (params.endDate) assertIsoDate(params.endDate, 'endDate');

    return callAnalyticsRpc(
      'analytics_product_customer_retention_summary',
      {
        p_product_id: params.productId,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_company_name: params.companyName ?? null,
      },
      (row) => ({
        previousCustomers: toFiniteNumber(row.previous_customers ?? row.prev_customers ?? row.previous_period_customers ?? 0, 'previous_customers'),
        currentCustomers: toFiniteNumber(row.current_customers ?? row.curr_customers ?? row.current_period_customers ?? 0, 'current_customers'),
        retainedCustomers: toFiniteNumber(row.retained_customers ?? 0, 'retained_customers'),
        newToProductCustomers: toFiniteNumber(row.new_customers ?? row.new_to_product_customers ?? row.new_to_product ?? 0, 'new_to_product_customers'),
        stoppedBuyingCustomers: toFiniteNumber(row.stopped_customers ?? row.stopped_buying_customers ?? row.stopped_buying ?? 0, 'stopped_buying_customers'),
        decliningCustomers: toFiniteNumber(row.declining_customers ?? 0, 'declining_customers'),
        previousSales: toFiniteNumber(row.previous_sales ?? row.prev_sales ?? 0, 'previous_sales'),
        currentSales: toFiniteNumber(row.current_sales ?? row.curr_sales ?? 0, 'current_sales'),
        stoppedSalesOpportunity: toFiniteNumber(row.stopped_sales_opportunity ?? row.stopped_opportunity_value ?? row.stopped_opportunity ?? 0, 'stopped_sales_opportunity'),
        decliningSalesGap: toFiniteNumber(row.declining_sales_gap ?? row.declining_gap_value ?? row.declining_gap ?? 0, 'declining_sales_gap'),
        retentionRate: toFiniteNumber(row.retention_rate ?? row.retention_rate_pct ?? row.retention_pct ?? 0, 'retention_rate'),
      })
    );
  },

  async productTopCustomersV2(params: ProductTopCustomersV2Params): Promise<ProductTopCustomersV2Result[]> {
    if (!params.productId) throw new Error('productId is required for productTopCustomersV2');
    assertIsoDate(params.startDate, 'startDate');
    assertIsoDate(params.endDate, 'endDate');

    const limit = params.limit != null ? Math.min(Math.max(params.limit, 1), 20) : 20;

    return callAnalyticsRpc(
      'analytics_product_top_customers_v2',
      {
        p_product_id: params.productId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_name: params.companyName ?? null,
        p_salesperson: params.salesperson ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_customer_id: params.customerId ?? null,
        p_limit: limit,
      },
      (row) => ({
        customerId: toFiniteNumber(row.customer_id, 'customer_id'),
        customerName: String(row.customer_name ?? ''),
        companyName: String(row.company_name ?? ''),
        salesperson: String(row.salesperson ?? ''),
        governorateName: String(row.governorate_name ?? ''),
        areaName: String(row.area_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        quantity: toFiniteNumber(row.quantity ?? 0, 'quantity'),
        lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
      })
    );
  },
};
