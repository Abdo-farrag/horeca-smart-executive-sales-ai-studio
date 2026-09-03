import { analytics } from '../analytics';
import { supabase } from '../lib/supabase';
import { GlobalFilterState } from '../types';
import { getEffectiveFilterParams } from '../utils/filterUtils';
import {
  ExecutiveAIContext,
  ExecutiveDrillDownContext,
  AiChatMessage,
  AiChatRequest,
  AiChatSuccessResponse,
  AiChatErrorResponse,
  AiContextMode,
  AiQueryIntent,
} from '../types/ai';
import {
  sanitizeExecutiveContext,
  sanitizeDrillDownContext,
  scanForProhibitedAiData,
} from './ai/aiContextSanitizer';

const PROHIBITED_KEYS = [
  'order_id',
  'order_name',
  'invoice',
  'phone',
  'mobile',
  'email',
  'street',
  'address',
  'customer_id',
  'customer_name',
  'raw_orders',
  'orders_list',
];

/**
 * Validates that an assembled ExecutiveAIContext does not contain any prohibited PII,
 * transaction IDs, customer names/IDs, or raw order arrays.
 */
export function validateSanitizedContext(context: ExecutiveAIContext): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const serialized = JSON.stringify(context);

  for (const key of PROHIBITED_KEYS) {
    // Check if key exists as an object property in JSON
    const pattern = new RegExp(`"${key}"\\s*:`, 'i');
    if (pattern.test(serialized)) {
      violations.push(`Prohibited key detected: "${key}"`);
    }
  }

  // Also verify activeFilters customerFilterActive is boolean and no customerName/Id was smuggled
  if ((context.activeFilters as any).customerName || (context.activeFilters as any).customerId) {
    violations.push('Customer identity detected in activeFilters');
  }

  // Check for regex patterns of email patterns in the JSON
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(serialized)) {
    violations.push('Email address detected in context');
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Trims chat history to a maximum of the most recent 8 messages.
 */
export function trimChatHistory(history: AiChatMessage[]): Array<{ role: 'user' | 'model'; text: string }> {
  const filtered = history
    .filter((msg) => !msg.error && msg.text && (msg.role === 'user' || msg.role === 'model'))
    .map((msg) => ({
      role: msg.role,
      text: msg.text,
    }));

  if (filtered.length <= 8) {
    return filtered;
  }
  return filtered.slice(-8);
}

/**
 * Assembles the ExecutiveAIContext using solely the aggregated methods of the src/analytics SDK.
 */
export async function buildExecutiveAIContext(filters: GlobalFilterState): Promise<ExecutiveAIContext> {
  const effective = getEffectiveFilterParams(filters);
  const month = effective.effectiveStartDate ? effective.effectiveStartDate.slice(0, 7) + '-01' : '2026-08-01';

  // Concurrently fetch executive-level aggregates from analytics SDK
  const [
    kpisRes,
    freshnessRes,
    retentionRes,
    riskDistRes,
    salesRepsRes,
    productsRes,
    govRes,
  ] = await Promise.allSettled([
    analytics.sales.executive({
      startDate: effective.effectiveStartDate,
      endDate: effective.effectiveEndDate,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
      governorateCode: effective.governorateCode,
      areaCode: effective.areaCode,
      customerId: effective.customerId,
      productId: effective.productId,
    }),
    analytics.sales.freshness(),
    analytics.customers.retention({
      month,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
      governorateCode: effective.governorateCode,
      areaCode: effective.areaCode,
      customerId: effective.customerId,
      productId: effective.productId,
    }),
    analytics.customers.riskDistribution({
      asOfDate: effective.effectiveEndDate,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
    }),
    analytics.salesReps.summary({
      month,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
      governorateCode: effective.governorateCode,
      areaCode: effective.areaCode,
      customerId: effective.customerId,
      productId: effective.productId,
    }),
    analytics.products.summary({
      startDate: effective.effectiveStartDate,
      endDate: effective.effectiveEndDate,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
      governorateCode: effective.governorateCode,
      areaCode: effective.areaCode,
      customerId: effective.customerId,
      productId: effective.productId,
      limit: 10,
    }),
    analytics.filters.governorates({
      startDate: effective.effectiveStartDate,
      endDate: effective.effectiveEndDate,
      companyId: effective.companyId,
      salespersonName: effective.salespersonName,
    }),
  ]);

  const kpi = kpisRes.status === 'fulfilled' && kpisRes.value.length > 0 ? kpisRes.value[0] : null;
  const freshness = freshnessRes.status === 'fulfilled' && freshnessRes.value.length > 0 ? freshnessRes.value[0] : null;
  const retention = retentionRes.status === 'fulfilled' && retentionRes.value.length > 0 ? retentionRes.value[0] : null;
  const riskList = riskDistRes.status === 'fulfilled' ? riskDistRes.value : [];
  const repList = salesRepsRes.status === 'fulfilled' ? salesRepsRes.value : [];
  const productList = productsRes.status === 'fulfilled' ? productsRes.value : [];
  const govList = govRes.status === 'fulfilled' ? govRes.value : [];

  // Risk distribution aggregate rollup
  let riskDistribution: ExecutiveAIContext['riskDistribution'] = null;
  if (riskList.length > 0) {
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let totalRecoveryOpportunityEgp = 0;

    for (const r of riskList) {
      const level = (r.riskLevel || '').toUpperCase();
      if (level === 'HIGH' || level === 'CRITICAL') {
        highRiskCount += r.customersCount;
      } else if (level === 'MEDIUM' || level === 'MED') {
        mediumRiskCount += r.customersCount;
      } else {
        lowRiskCount += r.customersCount;
      }
      totalRecoveryOpportunityEgp += r.recoveryOpportunity || 0;
    }

    riskDistribution = {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      totalRecoveryOpportunityEgp,
    };
  }

  // Top Sales Reps (aggregated league table, max 5)
  const topSalesRepsAggregate = repList
    .slice(0, 5)
    .map((r) => ({
      salesperson: r.salesperson,
      companyName: r.companyName,
      salesValue: r.salesValue,
      ordersCount: r.ordersCount,
      activeCustomers: r.activeCustomers,
      retentionRate: r.retentionRate != null ? r.retentionRate : null,
    }));

  // Top Products (aggregated league table, max 5)
  const topProductsAggregate = productList
    .slice(0, 5)
    .map((p) => ({
      productName: p.productName,
      categoryName: p.productCategory ?? null,
      salesValue: p.salesValue,
      quantitySold: p.quantitySold,
      uniqueCustomersCount: p.uniqueCustomers,
    }));

  // Geography Aggregate (max 5)
  const geographyAggregate = govList
    .slice(0, 5)
    .map((g) => ({
      governorate: g.governorateNameAr || g.governorateCode,
      salesValue: g.salesValue,
      ordersCount: g.ordersCount,
    }));

  const customerFilterActive = Boolean(
    effective.customerId != null || (filters.customerName && filters.customerName.trim().length > 0)
  );

  const context: ExecutiveAIContext = {
    metadata: {
      generatedAt: new Date().toISOString(),
      dataFreshnessDate: freshness?.maxOrderDate || effective.effectiveEndDate,
      operatingCurrency: 'EGP',
    },
    activeFilters: {
      dateRangeLabel: filters.dateRange?.label || filters.periodMode || 'Custom',
      effectiveStartDate: effective.effectiveStartDate,
      effectiveEndDate: effective.effectiveEndDate,
      companyName: effective.companyName,
      salespersonName: effective.salespersonName,
      governorateName: effective.governorateName,
      areaName: effective.areaName,
      customerFilterActive,
      productName: effective.productName,
    },
    salesKpis: {
      totalSales: kpi?.salesValue ?? 0,
      confirmedOrders: kpi?.ordersCount ?? 0,
      activeCustomers: kpi?.activeCustomers ?? 0,
      averageOrderValue: kpi?.averageOrderValue ?? 0,
      // Null semantics: preserve null if previousSalesValue is 0 / absent or growth is undefined
      revenueGrowthPct: kpi?.revenueGrowthPct != null ? kpi.revenueGrowthPct : null,
      previousPeriodSales: kpi?.previousSalesValue != null ? kpi.previousSalesValue : null,
    },
    retentionSummary: retention
      ? {
          previousActiveCustomers: retention.previousActiveCustomers,
          retainedWithSameRep: retention.retainedWithSameRep,
          transferredCustomers: retention.transferredCustomers,
          trueLostCustomers: retention.trueLostCustomers,
          newCustomers: retention.newCustomers,
          companyRetentionRate: retention.companyRetentionRate,
          sameRepRetentionRate: retention.sameRepRetentionRate,
          lostCustomerRevenueEgp: retention.lostCustomerRevenueEgp,
        }
      : null,
    riskDistribution,
    topSalesRepsAggregate: topSalesRepsAggregate.length > 0 ? topSalesRepsAggregate : undefined,
    topProductsAggregate: topProductsAggregate.length > 0 ? topProductsAggregate : undefined,
    geographyAggregate: geographyAggregate.length > 0 ? geographyAggregate : undefined,
  };

  return context;
}

/**
 * Sends a sanitized AI Chat query to the backend Express server.
 */
export async function sendAiChatMessage(params: {
  message: string;
  history: AiChatMessage[];
  filters?: GlobalFilterState;
  analyticsContext?: ExecutiveAIContext;
  drillDownContext?: ExecutiveDrillDownContext;
  contextMode?: AiContextMode;
  intent?: AiQueryIntent;
  language: 'ar' | 'en';
}): Promise<string> {
  const mode: AiContextMode = params.contextMode || 'AGGREGATED';
  let context = params.analyticsContext;

  if (!context && params.filters) {
    context = await buildExecutiveAIContext(params.filters);
  }

  // Sanitization checks
  if (context) {
    const sanity = validateSanitizedContext(context);
    if (!sanity.valid) {
      console.error('Sanitization violation:', sanity.violations);
      throw new Error('PROHIBITED_DATA_DETECTED');
    }
    context = sanitizeExecutiveContext(context);
  }

  let sanitizedDrillDown = params.drillDownContext;
  if (sanitizedDrillDown) {
    sanitizedDrillDown = sanitizeDrillDownContext(sanitizedDrillDown);
  }

  const trimmedHistory = trimChatHistory(params.history);

  const requestPayload: AiChatRequest = {
    message: params.message,
    history: trimmedHistory,
    analyticsContext: context,
    drillDownContext: sanitizedDrillDown,
    contextMode: mode,
    intent: params.intent,
    language: params.language,
  };

  if (!supabase) {
    const err = new Error('Authenticated Supabase session is required');
    (err as any).code = 'AUTH_REQUIRED';
    throw err;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    const err = new Error('Authenticated Supabase session is required');
    (err as any).code = 'AUTH_REQUIRED';
    throw err;
  }

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    let errorInfo: AiChatErrorResponse | null = null;
    try {
      errorInfo = await response.json();
    } catch {
      // Ignored
    }
    const code = errorInfo?.error?.code || 'AI_SERVICE_UNAVAILABLE';
    const msg = errorInfo?.error?.message || 'AI chat request failed';
    const err = new Error(msg);
    (err as any).code = code;
    throw err;
  }

  const data: AiChatSuccessResponse = await response.json();
  if (!data || typeof data.text !== 'string') {
    throw new Error('INVALID_RESPONSE');
  }

  return data.text;
}
