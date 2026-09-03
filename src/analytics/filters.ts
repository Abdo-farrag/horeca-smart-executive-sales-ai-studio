import { callAnalyticsRpc } from './client';
import { assertDateRange } from './validation';
import { toFiniteNumber } from './normalizers';
import { GovernorateOption, AreaOption, GeographyQualitySummary } from './types';

export interface CompanyOption {
  companyId: number;
  companyName: string;
  ordersCount: number;
  customersCount: number;
  salesValue: number;
}

export interface SalespersonOption {
  optionKey: string;
  companyId: number;
  companyName: string;
  salespersonName: string;
  ordersCount: number;
  customersCount: number;
  salesValue: number;
}

export interface CustomerOption {
  customerId: number;
  customerName: string;
  city?: string | null;
  companyId: number;
  companyName: string;
  primarySalesperson: string;
  governorateCode?: string | null;
  governorateNameAr?: string | null;
  areaCode?: string | null;
  areaNameAr?: string | null;
  ordersCount: number;
  salesValue: number;
  lastOrderDate: string;
}

export interface ProductOption {
  productId: number;
  productName: string;
  ordersCount: number;
  customersCount: number;
  qtySold: number;
  salesValue: number;
}

export interface CustomerStatusOption {
  statusCode: string;
  statusLabelAr: string;
  customersCount: number;
}

export interface CustomerActionOption {
  optionType: 'PRIORITY' | 'RISK' | 'ACTION_TYPE';
  optionCode: string;
  optionLabelAr: string;
  customersCount: number;
  recoveryOpportunity: number;
}

export const filters = {
  async companies(params: { startDate: string; endDate: string }): Promise<CompanyOption[]> {
    assertDateRange(params.startDate, params.endDate);
    return callAnalyticsRpc(
      'analytics_filter_companies',
      {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
      },
      (row) => ({
        companyId: toFiniteNumber(row.company_id ?? 0, 'company_id'),
        companyName: String(row.company_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        customersCount: toFiniteNumber(row.customers_count ?? 0, 'customers_count'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
      })
    );
  },

  async salespeople(params: {
    startDate: string;
    endDate: string;
    companyId?: number | null;
  }): Promise<SalespersonOption[]> {
    assertDateRange(params.startDate, params.endDate);
    return callAnalyticsRpc(
      'analytics_filter_salespeople',
      {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_id: params.companyId ?? null,
      },
      (row) => ({
        optionKey: String(row.option_key ?? ''),
        companyId: toFiniteNumber(row.company_id ?? 0, 'company_id'),
        companyName: String(row.company_name ?? ''),
        salespersonName: String(row.salesperson_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        customersCount: toFiniteNumber(row.customers_count ?? 0, 'customers_count'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
      })
    );
  },

  async customers(params: {
    startDate: string;
    endDate: string;
    companyId?: number | null;
    salespersonName?: string | null;
    governorateCode?: string | null;
    areaCode?: string | null;
    productId?: number | null;
    city?: string | null;
    search?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<CustomerOption[]> {
    assertDateRange(params.startDate, params.endDate);
    return callAnalyticsRpc(
      'analytics_filter_customers_v2',
      {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_id: params.companyId ?? null,
        p_salesperson: params.salespersonName ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_product_id: params.productId ?? null,
        p_search: params.search ?? null,
        p_limit: params.limit ?? 1000,
        p_offset: params.offset ?? 0,
      },
      (row) => ({
        customerId: toFiniteNumber(row.customer_id ?? 0, 'customer_id'),
        customerName: String(row.customer_name ?? ''),
        city: row.city ? String(row.city) : null,
        companyId: toFiniteNumber(row.company_id ?? 0, 'company_id'),
        companyName: String(row.company_name ?? ''),
        primarySalesperson: String(row.primary_salesperson ?? ''),
        governorateCode: row.governorate_code ? String(row.governorate_code) : null,
        governorateNameAr: row.governorate_name_ar ? String(row.governorate_name_ar) : null,
        areaCode: row.area_code ? String(row.area_code) : null,
        areaNameAr: row.area_name_ar ? String(row.area_name_ar) : null,
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        lastOrderDate: String(row.last_order_date ?? ''),
      })
    );
  },

  async products(params: {
    startDate: string;
    endDate: string;
    companyId?: number | null;
    salespersonName?: string | null;
    governorateCode?: string | null;
    areaCode?: string | null;
    customerId?: number | null;
    city?: string | null;
    search?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<ProductOption[]> {
    assertDateRange(params.startDate, params.endDate);
    return callAnalyticsRpc(
      'analytics_filter_products_v2',
      {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_id: params.companyId ?? null,
        p_salesperson: params.salespersonName ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_area_code: params.areaCode ?? null,
        p_customer_id: params.customerId ?? null,
        p_search: params.search ?? null,
        p_limit: params.limit ?? 1000,
        p_offset: params.offset ?? 0,
      },
      (row) => ({
        productId: toFiniteNumber(row.product_id ?? 0, 'product_id'),
        productName: String(row.product_name ?? ''),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        customersCount: toFiniteNumber(row.customers_count ?? 0, 'customers_count'),
        qtySold: toFiniteNumber(row.qty_sold ?? 0, 'qty_sold'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
      })
    );
  },

  async customerStatuses(params: {
    effectiveEndDate: string;
    companyName?: string | null;
    salespersonName?: string | null;
  }): Promise<CustomerStatusOption[]> {
    try {
      return await callAnalyticsRpc(
        'analytics_filter_customer_statuses',
        {
          p_as_of_date: params.effectiveEndDate,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salespersonName ?? null,
        },
        (row) => ({
          statusCode: String(row.status_code ?? ''),
          statusLabelAr: String(row.status_label_ar ?? ''),
          customersCount: toFiniteNumber(row.customers_count ?? 0, 'customers_count'),
        })
      );
    } catch (err) {
      console.warn('analytics_filter_customer_statuses query timed out or failed:', err);
      return [];
    }
  },

  async customerActionOptions(params: {
    effectiveEndDate: string;
    companyName?: string | null;
    salespersonName?: string | null;
  }): Promise<CustomerActionOption[]> {
    try {
      return await callAnalyticsRpc(
        'analytics_filter_customer_action_options',
        {
          p_as_of_date: params.effectiveEndDate,
          p_company_name: params.companyName ?? null,
          p_salesperson: params.salespersonName ?? null,
        },
        (row) => ({
          optionType: String(row.option_type ?? '') as 'PRIORITY' | 'RISK' | 'ACTION_TYPE',
          optionCode: String(row.option_code ?? ''),
          optionLabelAr: String(row.option_label_ar ?? ''),
          customersCount: toFiniteNumber(row.customers_count ?? 0, 'customers_count'),
          recoveryOpportunity: toFiniteNumber(row.recovery_opportunity ?? 0, 'recovery_opportunity'),
        })
      );
    } catch (err) {
      console.warn('analytics_filter_customer_action_options query timed out or failed:', err);
      return [];
    }
  },

  async governorates(params: {
    startDate: string;
    endDate: string;
    companyId?: number | null;
    salespersonName?: string | null;
  }): Promise<GovernorateOption[]> {
    assertDateRange(params.startDate, params.endDate);
    return callAnalyticsRpc(
      'analytics_filter_governorates',
      {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_id: params.companyId ?? null,
        p_salesperson: params.salespersonName ?? null,
      },
      (row) => ({
        governorateCode: String(row.governorate_code ?? ''),
        governorateNameAr: String(row.governorate_name_ar ?? row.governorate_code ?? ''),
        customersCount: toFiniteNumber(row.customers_count ?? 0, 'customers_count'),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        mappedCustomers: row.mapped_customers != null ? toFiniteNumber(row.mapped_customers, 'mapped_customers') : undefined,
        coveragePct: row.coverage_pct != null ? toFiniteNumber(row.coverage_pct, 'coverage_pct') : undefined,
      })
    );
  },

  async areas(params: {
    startDate: string;
    endDate: string;
    companyId?: number | null;
    salespersonName?: string | null;
    governorateCode?: string | null;
    highConfidenceOnly?: boolean;
  }): Promise<AreaOption[]> {
    assertDateRange(params.startDate, params.endDate);
    return callAnalyticsRpc(
      'analytics_filter_areas',
      {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_id: params.companyId ?? null,
        p_salesperson: params.salespersonName ?? null,
        p_governorate_code: params.governorateCode ?? null,
        p_high_confidence_only: params.highConfidenceOnly ?? true,
      },
      (row) => ({
        areaCode: String(row.area_code ?? ''),
        areaNameAr: String(row.area_name_ar ?? row.area_code ?? ''),
        governorateCode: String(row.governorate_code ?? ''),
        governorateNameAr: String(row.governorate_name_ar ?? ''),
        customersCount: toFiniteNumber(row.customers_count ?? 0, 'customers_count'),
        ordersCount: toFiniteNumber(row.orders_count ?? 0, 'orders_count'),
        salesValue: toFiniteNumber(row.sales_value ?? 0, 'sales_value'),
        highConfidenceCustomers: row.high_confidence_customers != null ? toFiniteNumber(row.high_confidence_customers, 'high_confidence_customers') : undefined,
        avgConfidence: row.avg_confidence != null ? toFiniteNumber(row.avg_confidence, 'avg_confidence') : undefined,
        needsReviewCustomers: row.needs_review_customers != null ? toFiniteNumber(row.needs_review_customers, 'needs_review_customers') : undefined,
      })
    );
  },

  async geographyQuality(params: {
    startDate: string;
    endDate: string;
    companyId?: number | null;
    salespersonName?: string | null;
  }): Promise<GeographyQualitySummary[]> {
    assertDateRange(params.startDate, params.endDate);
    return callAnalyticsRpc(
      'analytics_geography_quality_summary',
      {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_company_id: params.companyId ?? null,
        p_salesperson: params.salespersonName ?? null,
      },
      (row) => ({
        salesCustomers: toFiniteNumber(row.sales_customers ?? 0, 'sales_customers'),
        governorateMapped: toFiniteNumber(row.governorate_mapped ?? 0, 'governorate_mapped'),
        areaMapped: toFiniteNumber(row.area_mapped ?? 0, 'area_mapped'),
        highConfidenceArea: toFiniteNumber(row.high_confidence_area ?? 0, 'high_confidence_area'),
        needsReview: toFiniteNumber(row.needs_review ?? 0, 'needs_review'),
        governorateCoveragePct: toFiniteNumber(row.governorate_coverage_pct ?? 0, 'governorate_coverage_pct'),
        areaCoveragePct: toFiniteNumber(row.area_coverage_pct ?? 0, 'area_coverage_pct'),
        highConfidencePct: toFiniteNumber(row.high_confidence_pct ?? 0, 'high_confidence_pct'),
      })
    );
  },
};
