import { isSupabaseConfigured } from '../lib/supabase';
import { getEffectiveFilterParams } from '../utils/filterUtils';
import {
  GlobalFilterState,
  SalesRepSummaryRpcRow,
  SalesRepTrendRpcRow,
  SalesRepCustomerRpcRow,
  SalesRepRetentionDetailRpcRow
} from '../types';
import { analytics } from '../analytics';
import {
  DailySalesRepPerformanceRow,
  SalesRepDailyActionResult,
  SalesRepActionSummaryResult,
  SalesRepRecoveryPipelineResult,
  SalesRepCustomerPrioritiesResult,
  SalesRepDailyActionsParams,
  SalesRepActionSummaryParams,
  SalesRepRecoveryPipelineParams,
  SalesRepCustomerPrioritiesParams
} from '../analytics/types';

export interface SalesRepSummaryResponse {
  data: SalesRepSummaryRpcRow[];
  isLive: boolean;
  error: string | null;
}

export interface SalesRep360DetailsResponse {
  trend: SalesRepTrendRpcRow[];
  customers: SalesRepCustomerRpcRow[];
  retentionDetails: SalesRepRetentionDetailRpcRow[];
  isLive: boolean;
  error: string | null;
}

export interface DailySalesRepPerformanceResponse {
  data: DailySalesRepPerformanceRow[];
  actualDate: string | null;
  isLatestFallback: boolean;
  isLive: boolean;
  error: string | null;
}

/**
 * Fetch list of sales representative summaries via analytics.salesReps.summary SDK method
 */
export async function fetchSalesRepSummaryList(
  filters: GlobalFilterState,
  salespersonOverride?: string | null
): Promise<SalesRepSummaryResponse> {
  if (!isSupabaseConfigured) {
    return { data: [], isLive: false, error: 'Supabase client is not configured' };
  }

  try {
    const { companyName: effectiveCompanyName, salespersonName: effectiveSalesperson, effectiveStartDate, governorateCode, areaCode, customerId, productId } = getEffectiveFilterParams(filters);
    const p_month = effectiveStartDate;
    const p_company_name = effectiveCompanyName;
    const p_salesperson = salespersonOverride !== undefined
      ? salespersonOverride
      : effectiveSalesperson;

    const sdkRows = await analytics.salesReps.summary({
      month: p_month,
      companyName: p_company_name,
      salesperson: p_salesperson,
      governorateCode,
      areaCode,
      customerId,
      productId,
    });

    const mappedRows: SalesRepSummaryRpcRow[] = sdkRows.map((r) => ({
      order_month: r.orderMonth,
      company_name: r.companyName,
      salesperson: r.salesperson,
      active_customers: r.activeCustomers,
      orders_count: r.ordersCount,
      sales_value: r.salesValue,
      average_order_value: r.averageOrderValue,
      previous_customers: r.previousCustomers,
      retained_customers: r.retainedCustomers,
      lost_customers: r.lostCustomers,
      transferred_out_customers: r.transferredOutCustomers,
      transferred_in_customers: r.transferredInCustomers,
      new_customers: r.newCustomers,
      reactivated_customers: r.reactivatedCustomers,
      lost_previous_sales: r.lostPreviousSales,
      retention_rate: r.retentionRate ?? 0,
    }));

    return {
      data: mappedRows,
      isLive: true,
      error: null,
    };
  } catch (err: any) {
    return { data: [], isLive: false, error: err?.message || 'Unknown Analytics SDK execution error' };
  }
}

/**
 * Fetch monthly trend for a specific sales representative via analytics.salesReps.trend SDK method
 */
export async function fetchSalesRepTrend(
  salesperson: string,
  companyName: string | null = null,
  startMonth: string = '2026-01-01',
  endMonth: string = '2026-12-31'
): Promise<{ data: SalesRepTrendRpcRow[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client not configured' };
  }

  try {
    const sdkRows = await analytics.salesReps.trend({
      salesperson,
      companyName,
      startMonth,
      endMonth,
    });

    const mappedRows: SalesRepTrendRpcRow[] = sdkRows.map((r) => ({
      order_month: r.orderMonth,
      company_name: r.companyName,
      salesperson: r.salesperson,
      active_customers: r.activeCustomers,
      orders_count: r.ordersCount,
      sales_value: r.salesValue,
      average_order_value: r.averageOrderValue,
      retention_rate: r.retentionRate,
      lost_customers: r.lostCustomers,
      new_customers: r.newCustomers,
    }));

    return { data: mappedRows, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Failed to fetch trend' };
  }
}

/**
 * Fetch customer portfolio for a specific sales representative via analytics.salesReps.customers SDK method
 */
export async function fetchSalesRepCustomers(
  salesperson: string,
  month: string,
  companyName: string | null = null,
  limit: number = 500,
  offset: number = 0
): Promise<{ data: SalesRepCustomerRpcRow[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client not configured' };
  }

  try {
    const sdkRows = await analytics.salesReps.customers({
      salesperson,
      month,
      companyName,
      limit,
      offset,
    });

    const mappedRows: SalesRepCustomerRpcRow[] = sdkRows.map((r) => ({
      company_name: r.companyName,
      salesperson: r.salesperson,
      customer_id: Number(r.customerId) || 0,
      customer_name: r.customerName,
      orders_count: r.ordersCount,
      sales_value: r.salesValue,
      average_order_value: r.averageOrderValue,
      first_order_at: r.firstOrderAt,
      last_order_at: r.lastOrderAt,
    }));

    return { data: mappedRows, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Failed to fetch customers' };
  }
}

/**
 * Fetch customer retention details breakdown for a specific sales representative via analytics.salesReps.retentionDetails SDK method
 */
export async function fetchSalesRepRetentionDetails(
  salesperson: string,
  month: string,
  companyName: string | null = null,
  status: string | null = null,
  limit: number = 500,
  offset: number = 0
): Promise<{ data: SalesRepRetentionDetailRpcRow[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client not configured' };
  }

  try {
    const sdkRows = await analytics.salesReps.retentionDetails({
      salesperson,
      month,
      companyName,
      status,
      limit,
      offset,
    });

    const mappedRows: SalesRepRetentionDetailRpcRow[] = sdkRows.map((r) => ({
      company_name: r.companyName,
      customer_id: Number(r.customerId) || 0,
      customer_name: r.customerName,
      previous_salesperson: r.previousSalesperson,
      current_salesperson: r.currentSalesperson,
      previous_orders: r.previousOrders,
      current_orders: r.currentOrders,
      previous_sales: r.previousSales,
      current_sales: r.currentSales,
      retention_status: r.retentionStatus,
      sales_change_pct: r.salesChangePct,
      previous_last_order_at: r.previousLastOrderAt,
      current_last_order_at: r.currentLastOrderAt,
    }));

    return { data: mappedRows, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Failed to fetch retention details' };
  }
}

/**
 * Helper to fetch all 360 details for a selected representative
 */
export async function fetchSalesRep360All(
  salesperson: string,
  filters: GlobalFilterState,
  companyNameOverride: string | null = null
): Promise<SalesRep360DetailsResponse> {
  const { effectiveStartDate, companyName, governorateCode, areaCode, customerId, productId } = getEffectiveFilterParams(filters);
  const scopedCompanyName = companyNameOverride ?? companyName;
  const month = effectiveStartDate || filters.dateRange?.startDate || '2026-08-01';

  if (governorateCode || areaCode || customerId || productId) {
    return {
      trend: [],
      customers: [],
      retentionDetails: [],
      isLive: false,
      error: 'ADVANCED_FILTERS_UNSUPPORTED',
    };
  }

  const [trendRes, custRes, retRes] = await Promise.all([
    fetchSalesRepTrend(salesperson, scopedCompanyName),
    fetchSalesRepCustomers(salesperson, month, scopedCompanyName),
    fetchSalesRepRetentionDetails(salesperson, month, scopedCompanyName)
  ]);

  const combinedError = trendRes.error || custRes.error || retRes.error;

  return {
    trend: trendRes.data,
    customers: custRes.data,
    retentionDetails: retRes.data,
    isLive: !combinedError,
    error: combinedError
  };
}

/**
 * Fetch daily sales representative performance via analytics.salesReps.daily SDK method
 */
export async function fetchDailySalesRepPerformance(params: {
  date?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
}): Promise<DailySalesRepPerformanceResponse> {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      actualDate: null,
      isLatestFallback: false,
      isLive: false,
      error: 'Supabase client is not configured',
    };
  }

  try {
    let rows = await analytics.salesReps.daily({
      date: params.date || null,
      companyName: params.companyName || null,
      salesperson: params.salesperson || null,
    });

    let isLatestFallback = false;
    let actualDate = params.date || null;

    if (rows.length === 0 && params.date) {
      const fallbackRows = await analytics.salesReps.daily({
        date: null,
        companyName: params.companyName || null,
        salesperson: params.salesperson || null,
      });

      if (fallbackRows.length > 0) {
        rows = fallbackRows;
        actualDate = fallbackRows[0].reportDate;
        isLatestFallback = true;
      }
    } else if (rows.length > 0) {
      actualDate = rows[0].reportDate;
    }

    return {
      data: rows,
      actualDate,
      isLatestFallback,
      isLive: true,
      error: null,
    };
  } catch (err: any) {
    return {
      data: [],
      actualDate: null,
      isLatestFallback: false,
      isLive: false,
      error: err?.message || 'Failed to fetch daily sales rep performance',
    };
  }
}

/**
 * Fetch action summary for Sales Rep Daily Action Center
 */
export async function fetchSalesRepActionSummary(
  params: SalesRepActionSummaryParams
): Promise<{ data: SalesRepActionSummaryResult | null; isLive: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, isLive: false, error: 'Supabase client is not configured' };
  }

  try {
    const res = await analytics.salesReps.actionSummary(params);
    return {
      data: res.length > 0 ? res[0] : null,
      isLive: true,
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      isLive: false,
      error: err?.message || 'Failed to fetch sales rep action summary',
    };
  }
}

/**
 * Fetch daily work queue actions for Sales Rep Daily Action Center
 */
export async function fetchSalesRepDailyActions(
  params: SalesRepDailyActionsParams
): Promise<{ data: SalesRepDailyActionResult[]; isLive: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], isLive: false, error: 'Supabase client is not configured' };
  }

  try {
    const res = await analytics.salesReps.dailyActions(params);
    return {
      data: res,
      isLive: true,
      error: null,
    };
  } catch (err: any) {
    return {
      data: [],
      isLive: false,
      error: err?.message || 'Failed to fetch sales rep daily actions',
    };
  }
}

/**
 * Fetch recovery pipeline for Sales Rep Daily Action Center
 */
export async function fetchSalesRepRecoveryPipeline(
  params: SalesRepRecoveryPipelineParams
): Promise<{ data: SalesRepRecoveryPipelineResult[]; isLive: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], isLive: false, error: 'Supabase client is not configured' };
  }

  try {
    const res = await analytics.salesReps.recoveryPipeline(params);
    return {
      data: res,
      isLive: true,
      error: null,
    };
  } catch (err: any) {
    return {
      data: [],
      isLive: false,
      error: err?.message || 'Failed to fetch sales rep recovery pipeline',
    };
  }
}

/**
 * Fetch customer priorities distribution for Sales Rep Daily Action Center
 */
export async function fetchSalesRepCustomerPriorities(
  params: SalesRepCustomerPrioritiesParams
): Promise<{ data: SalesRepCustomerPrioritiesResult[]; isLive: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], isLive: false, error: 'Supabase client is not configured' };
  }

  try {
    const res = await analytics.salesReps.customerPriorities(params);
    return {
      data: res,
      isLive: true,
      error: null,
    };
  } catch (err: any) {
    return {
      data: [],
      isLive: false,
      error: err?.message || 'Failed to fetch sales rep customer priorities',
    };
  }
}
