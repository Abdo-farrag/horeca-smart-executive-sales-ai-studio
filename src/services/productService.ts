import { analytics } from '../analytics';
import { getEffectiveFilterParams } from '../utils/filterUtils';
import {
  ProductSummaryResult,
  ProductSummaryParams,
  Product360Result,
  ProductTrendResult,
  ProductDailyTrendResult,
  ProductCompanySplitResult,
  ProductLifecycleResult,
  ProductDataQualityResult,
  ProductAlertResult,
  ProductScoreResult,
  ProductReconciliationResult,
  ProductTopCustomerResult,
  ProductTopSalespersonResult,
  ProductCustomerRetentionResult,
  ProductCustomerRetentionSummaryResult,
} from '../analytics/types';
import { GlobalFilterState } from '../types';

export async function fetchProductSummaryList(
  filters: GlobalFilterState,
  options: {
    search?: string | null;
    limit?: number | null;
    offset?: number | null;
  } = {}
): Promise<{
  data: ProductSummaryResult[];
  error: string | null;
}> {
  try {
    const { companyName, salespersonName, governorateCode, areaCode, customerId, productId, effectiveStartDate, effectiveEndDate } = getEffectiveFilterParams(filters);
    const params: ProductSummaryParams = {
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      companyName,
      salesperson: salespersonName,
      governorateCode,
      areaCode,
      customerId,
      productId,
      search: options.search || null,
      limit: options.limit ?? 1000,
      offset: options.offset ?? 0,
    };

    const data = await analytics.products.summary(params);
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching product summary:', err);
    return { data: [], error: err?.message || 'Error fetching product data' };
  }
}

export async function fetchProduct360(
  productId: number,
  filters: GlobalFilterState
): Promise<{
  data: Product360Result | null;
  error: string | null;
}> {
  try {
    const res = await analytics.products.get360({
      productId,
      startDate: filters.dateRange?.startDate ?? null,
      endDate: filters.dateRange?.endDate ?? null,
      companyName: filters.company === 'All' ? null : filters.company,
    });

    return { data: res[0] || null, error: null };
  } catch (err: any) {
    console.error('Error fetching product 360:', err);
    return { data: null, error: err?.message || 'Error fetching product 360' };
  }
}

export async function fetchProductTrend(
  productId: number,
  filters: GlobalFilterState
): Promise<{
  data: ProductTrendResult[];
  error: string | null;
}> {
  try {
    const data = await analytics.products.trend({
      productId,
      companyName: filters.company === 'All' ? null : filters.company,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching product trend:', err);
    return { data: [], error: err?.message || 'Error fetching product trend' };
  }
}

export async function fetchProductDailyTrend(
  productId: number,
  filters: GlobalFilterState
): Promise<{
  data: ProductDailyTrendResult[];
  error: string | null;
}> {
  try {
    const data = await analytics.products.dailyTrend({
      productId,
      startDate: filters.dateRange?.startDate ?? null,
      endDate: filters.dateRange?.endDate ?? null,
      companyName: filters.company === 'All' ? null : filters.company,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching product daily trend:', err);
    return { data: [], error: err?.message || 'Error fetching product daily trend' };
  }
}

export async function fetchProductCompanySplit(
  productId: number,
  filters: GlobalFilterState
): Promise<{
  data: ProductCompanySplitResult[];
  error: string | null;
}> {
  try {
    const data = await analytics.products.companySplit({
      productId,
      startDate: filters.dateRange?.startDate ?? null,
      endDate: filters.dateRange?.endDate ?? null,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching product company split:', err);
    return { data: [], error: err?.message || 'Error fetching product company split' };
  }
}

export async function fetchProductLifecycle(
  productId: number
): Promise<{
  data: ProductLifecycleResult | null;
  error: string | null;
}> {
  try {
    const res = await analytics.products.lifecycle(productId);
    return { data: res[0] || null, error: null };
  } catch (err: any) {
    console.error('Error fetching product lifecycle:', err);
    return { data: null, error: err?.message || 'Error fetching product lifecycle' };
  }
}

export async function fetchProductDataQuality(
  productId: number
): Promise<{
  data: ProductDataQualityResult | null;
  error: string | null;
}> {
  try {
    const res = await analytics.products.dataQuality(productId);
    return { data: res[0] || null, error: null };
  } catch (err: any) {
    console.error('Error fetching product data quality:', err);
    return { data: null, error: err?.message || 'Error fetching product data quality' };
  }
}

export async function fetchProductAlerts(
  productId: number,
  filters: GlobalFilterState
): Promise<{
  data: ProductAlertResult[];
  error: string | null;
}> {
  try {
    const data = await analytics.products.alerts({
      productId,
      asOfDate: filters.dateRange?.endDate ?? null,
      companyName: filters.company === 'All' ? null : filters.company,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching product alerts:', err);
    return { data: [], error: err?.message || 'Error fetching product alerts' };
  }
}

export async function fetchProductScore(
  productId: number,
  filters: GlobalFilterState
): Promise<{
  data: ProductScoreResult | null;
  error: string | null;
}> {
  try {
    const res = await analytics.products.score({
      productId,
      startDate: filters.dateRange?.startDate ?? null,
      endDate: filters.dateRange?.endDate ?? null,
      companyName: filters.company === 'All' ? null : filters.company,
    });
    return { data: res[0] || null, error: null };
  } catch (err: any) {
    console.error('Error fetching product score:', err);
    return { data: null, error: err?.message || 'Error fetching product score' };
  }
}

export async function fetchProductReconciliation(
  filters: GlobalFilterState
): Promise<{
  data: ProductReconciliationResult | null;
  error: string | null;
}> {
  try {
    const res = await analytics.products.reconciliation({
      startDate: filters.dateRange?.startDate ?? null,
      endDate: filters.dateRange?.endDate ?? null,
      companyName: filters.company === 'All' ? null : filters.company,
    });
    return { data: res[0] || null, error: null };
  } catch (err: any) {
    console.error('Error fetching product reconciliation:', err);
    return { data: null, error: err?.message || 'Error fetching product reconciliation' };
  }
}

export async function fetchProductTopCustomers(
  productId: number,
  filters: GlobalFilterState,
  options: { limit?: number; offset?: number } = {}
): Promise<{
  data: ProductTopCustomerResult[];
  error: string | null;
}> {
  try {
    const data = await analytics.products.topCustomers({
      productId,
      startDate: filters.dateRange?.startDate ?? null,
      endDate: filters.dateRange?.endDate ?? null,
      companyName: filters.company === 'All' ? null : filters.company,
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching product top customers:', err);
    return { data: [], error: err?.message || 'Error fetching product top customers' };
  }
}

export async function fetchProductTopSalespeople(
  productId: number,
  filters: GlobalFilterState,
  options: { limit?: number; offset?: number } = {}
): Promise<{
  data: ProductTopSalespersonResult[];
  error: string | null;
}> {
  try {
    const data = await analytics.products.topSalespeople({
      productId,
      startDate: filters.dateRange?.startDate ?? null,
      endDate: filters.dateRange?.endDate ?? null,
      companyName: filters.company === 'All' ? null : filters.company,
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching product top salespeople:', err);
    return { data: [], error: err?.message || 'Error fetching product top salespeople' };
  }
}

export async function fetchProductCustomerRetention(
  productId: number,
  filters: GlobalFilterState
): Promise<{
  data: ProductCustomerRetentionResult[];
  error: string | null;
}> {
  try {
    const data = await analytics.products.customerRetention({
      productId,
      startDate: filters.dateRange?.startDate ?? null,
      endDate: filters.dateRange?.endDate ?? null,
      companyName: filters.company === 'All' ? null : filters.company,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching product customer retention:', err);
    return { data: [], error: err?.message || 'Error fetching product customer retention' };
  }
}

export async function fetchProductCustomerRetentionSummary(
  productId: number,
  filters: GlobalFilterState
): Promise<{
  data: ProductCustomerRetentionSummaryResult | null;
  error: string | null;
}> {
  try {
    const res = await analytics.products.customerRetentionSummary({
      productId,
      startDate: filters.dateRange?.startDate ?? null,
      endDate: filters.dateRange?.endDate ?? null,
      companyName: filters.company === 'All' ? null : filters.company,
    });
    return { data: res[0] || null, error: null };
  } catch (err: any) {
    console.error('Error fetching product customer retention summary:', err);
    return { data: null, error: err?.message || 'Error fetching product customer retention summary' };
  }
}

