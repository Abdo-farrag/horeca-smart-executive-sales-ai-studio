import { analytics } from '../analytics';
import { getEffectiveFilterParams } from '../utils/filterUtils';
import {
  CustomerSummaryResult,
  CustomerSummaryParams,
  CustomerBuyingFrequencyResult,
  CustomerFavoriteProductsResult,
  CustomerSalespersonHistoryResult,
  CustomerRiskResult,
  CustomerProductDropoffResult,
  CustomerCrossSellCandidatesResult,
  CustomerPortfolioSummaryResult,
  CustomerRiskDistributionResult,
  CustomerActionCenterResult,
  CustomerRecoveryOpportunitiesResult,
} from '../analytics/types';
import { GlobalFilterState } from '../types';

export async function fetchCustomerSummaryList(
  filters: GlobalFilterState,
  options: {
    status?: string | null;
    search?: string | null;
    limit?: number | null;
    offset?: number | null;
  } = {}
): Promise<{
  data: CustomerSummaryResult[];
  error: string | null;
}> {
  try {
    const { companyName, salespersonName, governorateCode, areaCode, customerId, productId, effectiveStartDate, effectiveEndDate } = getEffectiveFilterParams(filters);
    const params: CustomerSummaryParams = {
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      companyName,
      salesperson: salespersonName,
      governorateCode,
      areaCode,
      customerId,
      productId,
      status: options.status && options.status !== 'All' ? options.status : null,
      search: options.search || null,
      limit: options.limit ?? 1000,
      offset: options.offset ?? 0,
    };

    const data = await analytics.customers.summary(params);
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching customer summary:', err);
    return { data: [], error: err?.message || 'Error fetching customer data' };
  }
}

export async function fetchCustomerBuyingFrequency(
  customerId: number,
  filters: GlobalFilterState
): Promise<{ data: CustomerBuyingFrequencyResult | null; error: string | null }> {
  try {
    const { companyName, effectiveStartDate, effectiveEndDate } = getEffectiveFilterParams(filters);
    const res = await analytics.customers.buyingFrequency({
      customerId,
      companyName,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
    });
    return { data: res[0] || null, error: null };
  } catch (err: any) {
    console.error('Error fetching customer buying frequency:', err);
    return { data: null, error: err?.message || 'Error fetching buying frequency' };
  }
}

export async function fetchCustomerFavoriteProducts(
  customerId: number,
  filters: GlobalFilterState,
  limit: number = 20
): Promise<{ data: CustomerFavoriteProductsResult[]; error: string | null }> {
  try {
    const startDate = filters.effectiveStartDate ?? filters.dateRange?.startDate ?? null;
    const endDate = filters.effectiveEndDate ?? filters.dateRange?.endDate ?? null;
    const companyName = filters.company === 'All' ? null : filters.company;
    const data = await analytics.customers.favoriteProducts({ customerId, startDate, endDate, companyName, limit });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching customer favorite products:', err);
    return { data: [], error: err?.message || 'Error fetching favorite products' };
  }
}

export async function fetchCustomerSalespersonHistory(
  customerId: number,
  filters: GlobalFilterState
): Promise<{ data: CustomerSalespersonHistoryResult[]; error: string | null }> {
  try {
    const companyName = filters.company === 'All' ? null : filters.company;
    const data = await analytics.customers.salespersonHistory({ customerId, companyName });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching customer salesperson history:', err);
    return { data: [], error: err?.message || 'Error fetching salesperson history' };
  }
}

export async function fetchCustomerRisk(
  customerId: number,
  filters: GlobalFilterState
): Promise<{ data: CustomerRiskResult | null; error: string | null }> {
  try {
    const companyName = filters.company === 'All' ? null : filters.company;
    const res = await analytics.customers.risk({ customerId, companyName });
    return { data: res[0] || null, error: null };
  } catch (err: any) {
    console.error('Error fetching customer risk:', err);
    return { data: null, error: err?.message || 'Error fetching customer risk' };
  }
}

export async function fetchCustomerProductDropoff(
  customerId: number,
  filters: GlobalFilterState
): Promise<{ data: CustomerProductDropoffResult[]; error: string | null }> {
  try {
    const startDate = filters.effectiveStartDate ?? filters.dateRange?.startDate ?? null;
    const endDate = filters.effectiveEndDate ?? filters.dateRange?.endDate ?? null;
    const companyName = filters.company === 'All' ? null : filters.company;
    const data = await analytics.customers.productDropoff({ customerId, startDate, endDate, companyName });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching customer product dropoff:', err);
    return { data: [], error: err?.message || 'Error fetching product dropoff' };
  }
}

export async function fetchCustomerCrossSellCandidates(
  customerId: number,
  filters: GlobalFilterState,
  limit: number = 20
): Promise<{ data: CustomerCrossSellCandidatesResult[]; error: string | null }> {
  try {
    const startDate = filters.effectiveStartDate ?? filters.dateRange?.startDate ?? null;
    const endDate = filters.effectiveEndDate ?? filters.dateRange?.endDate ?? null;
    const companyName = filters.company === 'All' ? null : filters.company;
    const data = await analytics.customers.crossSellCandidates({ customerId, startDate, endDate, companyName, limit });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching customer cross sell candidates:', err);
    return { data: [], error: err?.message || 'Error fetching cross sell candidates' };
  }
}

export async function fetchCustomerPortfolioSummary(options: {
  asOfDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
}): Promise<{ data: CustomerPortfolioSummaryResult | null; error: string | null }> {
  try {
    const res = await analytics.customers.portfolioSummary({
      asOfDate: options.asOfDate ?? null,
      companyName: options.companyName === 'All' ? null : options.companyName ?? null,
      salesperson: options.salesperson === 'All' ? null : options.salesperson ?? null,
    });
    return { data: res[0] || null, error: null };
  } catch (err: any) {
    console.error('Error fetching customer portfolio summary:', err);
    return { data: null, error: err?.message || 'Error fetching portfolio summary' };
  }
}

export async function fetchCustomerRiskDistribution(options: {
  asOfDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
}): Promise<{ data: CustomerRiskDistributionResult[]; error: string | null }> {
  try {
    const data = await analytics.customers.riskDistribution({
      asOfDate: options.asOfDate ?? null,
      companyName: options.companyName === 'All' ? null : options.companyName ?? null,
      salesperson: options.salesperson === 'All' ? null : options.salesperson ?? null,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching customer risk distribution:', err);
    return { data: [], error: err?.message || 'Error fetching risk distribution' };
  }
}

export async function fetchCustomerActionCenterList(options: {
  asOfDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
  priority?: string | null;
  actionType?: string | null;
  risk?: string | null;
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}): Promise<{ data: CustomerActionCenterResult[]; error: string | null }> {
  try {
    const data = await analytics.customers.actionCenter({
      asOfDate: options.asOfDate ?? null,
      companyName: options.companyName === 'All' ? null : options.companyName ?? null,
      salesperson: options.salesperson === 'All' ? null : options.salesperson ?? null,
      priority: options.priority && options.priority !== 'ALL' ? options.priority : null,
      actionType: options.actionType && options.actionType !== 'ALL' ? options.actionType : null,
      risk: options.risk && options.risk !== 'ALL' ? options.risk : null,
      search: options.search || null,
      limit: options.limit ?? 500,
      offset: options.offset ?? 0,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching customer action center:', err);
    return { data: [], error: err?.message || 'Error fetching action center items' };
  }
}

export async function fetchCustomerRecoveryOpportunities(options: {
  asOfDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
  limit?: number | null;
}): Promise<{ data: CustomerRecoveryOpportunitiesResult[]; error: string | null }> {
  try {
    const data = await analytics.customers.recoveryOpportunities({
      asOfDate: options.asOfDate ?? null,
      companyName: options.companyName === 'All' ? null : options.companyName ?? null,
      salesperson: options.salesperson === 'All' ? null : options.salesperson ?? null,
      limit: options.limit ?? 20,
    });
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching recovery opportunities:', err);
    return { data: [], error: err?.message || 'Error fetching recovery opportunities' };
  }
}
