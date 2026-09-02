import { analytics } from '../analytics';
import { getEffectiveFilterParams } from '../utils/filterUtils';
import { getSupabaseHostOnly, isSupabaseConfigured } from '../lib/supabase';
import { Customer, GlobalFilterState, KpiMetric, SalesRep } from '../types';

export interface DailySalesTrend {
  date: string;
  horecaSales: number;
  masSales: number;
  totalSales: number;
  ordersCount: number;
}

export interface CompanyRevenueBreakdown {
  company: 'Horeca Smart' | 'MAS';
  revenue: number;
  ordersCount: number;
  percentage: number;
}

export interface CompanyRawBreakdown {
  rawCompanyName: string;
  ordersCount: number;
  totalAmount: number;
}

export interface RetentionMetrics {
  currentMonth: string;
  previousActiveCustomers: number;
  retainedWithSameRep: number;
  transferredCustomers: number;
  trueLostCustomers: number;
  newCustomers: number;
  companyRetentionRate: number;
  sameRepRetentionRate: number;
  lostCustomerRevenueEgp: number;
  isLive: boolean;
}

export interface ExecutiveDiagnostics {
  dataMode: 'Live — Supabase' | 'Mock fallback' | 'Not configured' | 'Error';
  supabaseHost: string;
  selectedDateRange: { startDate: string; endDate: string };
  sourceViewQueried: string;
  revenueFieldUsed: string;
  dateFieldUsed: string;
  rawRowCountReturned: number;
  paginationBatches: number;
  queryCompletedFully: boolean;
  confirmedOrdersCount: number;
  totalSalesAmountEgp: number;
  uniqueCustomersCount: number;
  minOrderDate: string | null;
  maxOrderDate: string | null;
  queryTimestamp: string;
  queryErrorMsg: string | null;
  isMockFallback: boolean;
  rawCompanyBreakdown: CompanyRawBreakdown[];
  hasRealAreaData: boolean;
  realAreaBreakdown: { areaName: string; totalAmount: number }[];
  hasValidationReference: boolean;
  validationLabel: string;
  targetReference: { confirmedOrders: number; totalSalesEgp: number };
  discrepancyAnalysis: {
    isExactMatch: boolean;
    ordersDifference: number;
    salesDifferenceEgp: number;
    appliedFiltersList: string[];
    potentialCauses: string[];
  };
}

export interface DataFreshnessInfo {
  maxOrderDate: string | null;
  lastSuccessfulSyncAt: string | null;
  rowsSynced: number;
  syncStatus: 'Fresh' | 'Delayed' | 'Error';
  lastFailedSyncAt?: string | null;
  lastFailedSyncMessage?: string | null;
}

export interface ExecutiveDashboardData {
  kpis: KpiMetric[];
  dailySalesTrend: DailySalesTrend[];
  salesByCompany: CompanyRevenueBreakdown[];
  topSalesReps: SalesRep[];
  topCustomers: Customer[];
  retentionMetrics: RetentionMetrics;
  freshnessInfo: DataFreshnessInfo;
  retentionRate: number;
  totalSales: number;
  confirmedOrdersCount: number;
  activeCustomersCount: number;
  averageOrderValue: number;
  revenueGrowthPercent: number;
  isLiveSupabaseData: boolean;
  lastFetchedAt: string;
  errorMessage: string | null;
  diagnostics: ExecutiveDiagnostics;
}

const n = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const companyFrom = (value: unknown): 'Horeca Smart' | 'MAS' =>
  String(value ?? '').toLowerCase().includes('mas') ? 'MAS' : 'Horeca Smart';

const emptyRetention = (month: string): RetentionMetrics => ({
  currentMonth: month,
  previousActiveCustomers: 0,
  retainedWithSameRep: 0,
  transferredCustomers: 0,
  trueLostCustomers: 0,
  newCustomers: 0,
  companyRetentionRate: 0,
  sameRepRetentionRate: 0,
  lostCustomerRevenueEgp: 0,
  isLive: false,
});

export function createUnavailableExecutiveData(
  filters: GlobalFilterState,
  reason: string | null = null,
): ExecutiveDashboardData {
  const startDate = filters.effectiveStartDate || filters.dateRange?.startDate || '';
  const endDate = filters.effectiveEndDate || filters.dateRange?.endDate || '';
  const month = startDate ? `${startDate.slice(0, 7)}-01` : '';
  const now = new Date().toISOString();
  const configured = isSupabaseConfigured;

  return {
    kpis: [],
    dailySalesTrend: [],
    salesByCompany: [],
    topSalesReps: [],
    topCustomers: [],
    retentionMetrics: emptyRetention(month),
    freshnessInfo: {
      maxOrderDate: null,
      lastSuccessfulSyncAt: null,
      rowsSynced: 0,
      syncStatus: 'Error',
    },
    retentionRate: 0,
    totalSales: 0,
    confirmedOrdersCount: 0,
    activeCustomersCount: 0,
    averageOrderValue: 0,
    revenueGrowthPercent: 0,
    isLiveSupabaseData: false,
    lastFetchedAt: '',
    errorMessage: reason,
    diagnostics: {
      dataMode: configured ? 'Error' : 'Not configured',
      supabaseHost: getSupabaseHostOnly(),
      selectedDateRange: { startDate, endDate },
      sourceViewQueried: 'analytics SDK',
      revenueFieldUsed: 'sales_value',
      dateFieldUsed: 'p_start_date..p_end_date',
      rawRowCountReturned: 0,
      paginationBatches: 0,
      queryCompletedFully: false,
      confirmedOrdersCount: 0,
      totalSalesAmountEgp: 0,
      uniqueCustomersCount: 0,
      minOrderDate: null,
      maxOrderDate: null,
      queryTimestamp: now,
      queryErrorMsg: reason,
      isMockFallback: false,
      rawCompanyBreakdown: [],
      hasRealAreaData: false,
      realAreaBreakdown: [],
      hasValidationReference: false,
      validationLabel: 'No fixed reference for selected scope',
      targetReference: { confirmedOrders: 0, totalSalesEgp: 0 },
      discrepancyAnalysis: {
        isExactMatch: false,
        ordersDifference: 0,
        salesDifferenceEgp: 0,
        appliedFiltersList: [],
        potentialCauses: reason ? [reason] : [],
      },
    },
  };
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 300): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(fn, retries - 1, delayMs);
  }
}

export async function fetchExecutiveDashboardData(filters: GlobalFilterState): Promise<ExecutiveDashboardData> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Verified Executive commercial data is unavailable.');
  }

  const {
    companyName,
    salespersonName,
    governorateCode,
    areaCode,
    customerId,
    productId,
    effectiveStartDate: startDate,
    effectiveEndDate: endDate,
  } = getEffectiveFilterParams(filters);

  if (!startDate || !endDate) {
    throw new Error('A valid sales date range is required for Executive analytics.');
  }

  const month = `${startDate.slice(0, 7)}-01`;
  const [kpiRows, dailyRows, customerRows, retentionRows, repRows, freshnessRows] = await Promise.all([
    withRetry(() => analytics.sales.executive({ startDate, endDate, companyName, salesperson: salespersonName, governorateCode, areaCode, customerId, productId })),
    withRetry(() => analytics.sales.daily({ startDate, endDate, companyName, salesperson: salespersonName, governorateCode, areaCode, customerId, productId })),
    withRetry(() => analytics.sales.topCustomers({ startDate, endDate, companyName, salesperson: salespersonName, limit: 20 })),
    withRetry(() => analytics.customers.retention({ month, companyName, salesperson: salespersonName })),
    withRetry(() => analytics.salesReps.summary({ month, companyName, salesperson: salespersonName })),
    withRetry(() => analytics.sales.freshness()),
  ]);

  const kpi: any = kpiRows?.[0];
  if (!kpi) {
    throw new Error('Executive KPI query returned no verified row for the selected scope.');
  }

  const dailySalesTrend: DailySalesTrend[] = (dailyRows || []).map((row: any) => ({
    date: String(row.orderDate ?? ''),
    horecaSales: n(row.horecaSales),
    masSales: n(row.masSales),
    totalSales: n(row.totalSales),
    ordersCount: n(row.ordersCount),
  }));

  const totalSales = n(kpi.salesValue);
  const confirmedOrdersCount = n(kpi.ordersCount);
  const activeCustomersCount = n(kpi.activeCustomers);
  const averageOrderValue = n(kpi.averageOrderValue);
  const revenueGrowthPercent = n(kpi.revenueGrowthPct);
  const previousSalesValue = n(kpi.previousSalesValue);

  const horecaRevenue = dailySalesTrend.reduce((sum, row) => sum + row.horecaSales, 0);
  const masRevenue = dailySalesTrend.reduce((sum, row) => sum + row.masSales, 0);
  const companyTotal = horecaRevenue + masRevenue;
  const salesByCompany: CompanyRevenueBreakdown[] = [
    {
      company: 'Horeca Smart',
      revenue: horecaRevenue,
      ordersCount: 0,
      percentage: companyTotal > 0 ? (horecaRevenue / companyTotal) * 100 : 0,
    },
    {
      company: 'MAS',
      revenue: masRevenue,
      ordersCount: 0,
      percentage: companyTotal > 0 ? (masRevenue / companyTotal) * 100 : 0,
    },
  ];

  const retentionRow: any = retentionRows?.[0];
  const retentionMetrics: RetentionMetrics = retentionRow
    ? {
        currentMonth: month,
        previousActiveCustomers: n(retentionRow.previousActiveCustomers),
        retainedWithSameRep: n(retentionRow.retainedWithSameRep),
        transferredCustomers: n(retentionRow.transferredCustomers),
        trueLostCustomers: n(retentionRow.trueLostCustomers),
        newCustomers: n(retentionRow.newCustomers),
        companyRetentionRate: n(retentionRow.companyRetentionRate),
        sameRepRetentionRate: n(retentionRow.sameRepRetentionRate),
        lostCustomerRevenueEgp: n(retentionRow.lostCustomerRevenueEgp),
        isLive: true,
      }
    : emptyRetention(month);

  const topSalesReps: SalesRep[] = (repRows || []).map((row: any, index: number) => ({
    id: `rep_${String(row.salesperson ?? '').replace(/\s+/g, '_')}_${index}`,
    nameAr: String(row.salesperson ?? ''),
    nameEn: String(row.salesperson ?? ''),
    code: '',
    avatar: '',
    company: companyFrom(row.companyName),
    primaryArea: '',
    totalSalesYtd: n(row.salesValue),
    monthlyTarget: 0,
    monthlyAchieved: n(row.salesValue),
    targetAchievementPercent: 0,
    totalCustomers: n(row.activeCustomers),
    activeCustomers: n(row.activeCustomers),
    previousCustomers: n(row.previousCustomers),
    retainedCustomers: n(row.retainedCustomers),
    lostCustomers: n(row.lostCustomers),
    transferredCustomers: n(row.transferredOutCustomers),
    newCustomers: n(row.newCustomers),
    retentionRate: n(row.retentionRate),
    areaCoveragePercent: 0,
    avgOrderValue: n(row.averageOrderValue),
    recentOrdersCount: n(row.ordersCount),
    lostPreviousSales: n(row.lostPreviousSales),
    trend: [n(row.salesValue)],
  }));

  const topCustomers: Customer[] = (customerRows || []).map((row: any, index: number) => ({
    id: String(row.customerId ?? `customer_${index}`),
    nameAr: String(row.customerName ?? ''),
    nameEn: String(row.customerName ?? ''),
    company: companyFrom(row.companyName),
    sector: 'restaurant',
    area: '',
    city: '',
    salesRepId: '',
    salesRepName: String(row.primarySalesperson ?? ''),
    healthScore: 0,
    lifecycle: 'active',
    riskLevel: 'low',
    lastOrderDate: String(row.lastOrderAt ?? ''),
    avgDaysBetweenOrders: 0,
    daysSinceLastOrder: 0,
    totalRevenueYtd: n(row.salesValue),
    ordersCount: n(row.ordersCount),
    avgOrderValue: n(row.averageOrderValue),
    retentionRate: 0,
    topCategoryPurchased: '',
    topProductPurchased: '',
    crossSellOpportunities: [],
    aiRecommendationAr: '',
    aiRecommendationEn: '',
    phone: '',
    email: '',
  }));

  const freshness: any = freshnessRows?.[0];
  const rowsSynced = freshness?.lastSalesSyncRowsCount == null ? 0 : n(freshness.lastSalesSyncRowsCount);
  const maxOrderDate = freshness?.maxOrderDate ? String(freshness.maxOrderDate) : (kpi.maxOrderDate ? String(kpi.maxOrderDate) : null);
  const lastSuccessfulSyncAt = freshness?.lastSuccessfulSalesSyncFinishedAt
    ? String(freshness.lastSuccessfulSalesSyncFinishedAt)
    : freshness?.lastSuccessfulSalesSyncStartedAt
      ? String(freshness.lastSuccessfulSalesSyncStartedAt)
      : null;

  const freshnessInfo: DataFreshnessInfo = {
    maxOrderDate,
    lastSuccessfulSyncAt,
    rowsSynced,
    syncStatus: maxOrderDate && rowsSynced > 0 ? 'Fresh' : 'Delayed',
    lastFailedSyncAt: freshness?.lastFailedFullSyncStartedAt ? String(freshness.lastFailedFullSyncStartedAt) : null,
    lastFailedSyncMessage: freshness?.lastFailedFullSyncMessage ? String(freshness.lastFailedFullSyncMessage) : null,
  };

  const kpis: KpiMetric[] = [
    {
      id: 'total_sales',
      titleAr: 'إجمالي المبيعات (EGP)',
      titleEn: 'Total Sales Revenue (EGP)',
      currentValue: totalSales,
      previousValue: previousSalesValue,
      growthPercent: revenueGrowthPercent,
      isPositiveGrowthGood: true,
      unit: 'currency',
      sparkline: dailySalesTrend.slice(-10).map((row) => row.totalSales),
      category: 'sales',
      descriptionAr: 'إجمالي المبيعات المؤكدة من Analytics SDK.',
      descriptionEn: 'Confirmed sales returned by the Analytics SDK.',
    },
    {
      id: 'orders_count',
      titleAr: 'عدد الطلبات المؤكدة',
      titleEn: 'Confirmed Orders',
      currentValue: confirmedOrdersCount,
      previousValue: 0,
      growthPercent: 0,
      isPositiveGrowthGood: true,
      unit: 'number',
      sparkline: dailySalesTrend.slice(-10).map((row) => row.ordersCount),
      category: 'sales',
      descriptionAr: 'إجمالي الطلبات المؤكدة من Analytics SDK.',
      descriptionEn: 'Confirmed orders returned by the Analytics SDK.',
    },
    {
      id: 'active_customers',
      titleAr: 'العملاء الفريدون',
      titleEn: 'Unique Customers',
      currentValue: activeCustomersCount,
      previousValue: 0,
      growthPercent: 0,
      isPositiveGrowthGood: true,
      unit: 'number',
      sparkline: [],
      category: 'customers',
      descriptionAr: 'عدد العملاء الفريدين في النطاق المحدد.',
      descriptionEn: 'Unique customers in the selected scope.',
    },
    {
      id: 'aov',
      titleAr: 'متوسط قيمة الطلب (AOV)',
      titleEn: 'Average Order Value (AOV)',
      currentValue: averageOrderValue,
      previousValue: 0,
      growthPercent: 0,
      isPositiveGrowthGood: true,
      unit: 'currency',
      sparkline: [],
      category: 'sales',
      descriptionAr: 'متوسط قيمة الطلب المؤكد.',
      descriptionEn: 'Average confirmed order value.',
    },
  ];

  if (retentionMetrics.isLive) {
    kpis.push({
      id: 'retention_rate',
      titleAr: 'معدل الاحتفاظ بالعملاء',
      titleEn: 'Customer Retention Rate',
      currentValue: retentionMetrics.companyRetentionRate,
      previousValue: 0,
      growthPercent: 0,
      isPositiveGrowthGood: true,
      unit: 'percent',
      sparkline: [],
      category: 'customers',
      descriptionAr: 'معدل الاحتفاظ الشهري الموثق من Analytics SDK.',
      descriptionEn: 'Verified monthly retention returned by the Analytics SDK.',
    });
  }

  const now = new Date().toISOString();
  const dates = dailySalesTrend.map((row) => row.date).filter(Boolean).sort();
  const minOrderDate = kpi.minOrderDate ? String(kpi.minOrderDate) : (dates[0] ?? null);
  const diagnosticMaxOrderDate = kpi.maxOrderDate ? String(kpi.maxOrderDate) : (dates.at(-1) ?? null);
  const rawCompanyBreakdown: CompanyRawBreakdown[] = salesByCompany.map((row) => ({
    rawCompanyName: row.company,
    ordersCount: row.ordersCount,
    totalAmount: row.revenue,
  }));

  return {
    kpis,
    dailySalesTrend,
    salesByCompany,
    topSalesReps,
    topCustomers,
    retentionMetrics,
    freshnessInfo,
    retentionRate: retentionMetrics.isLive ? retentionMetrics.companyRetentionRate : 0,
    totalSales,
    confirmedOrdersCount,
    activeCustomersCount,
    averageOrderValue,
    revenueGrowthPercent,
    isLiveSupabaseData: true,
    lastFetchedAt: now,
    errorMessage: null,
    diagnostics: {
      dataMode: 'Live — Supabase',
      supabaseHost: getSupabaseHostOnly(),
      selectedDateRange: { startDate, endDate },
      sourceViewQueried: 'Analytics SDK RPCs',
      revenueFieldUsed: 'sales_value',
      dateFieldUsed: 'p_start_date..p_end_date',
      rawRowCountReturned: kpiRows.length,
      paginationBatches: 0,
      queryCompletedFully: true,
      confirmedOrdersCount,
      totalSalesAmountEgp: totalSales,
      uniqueCustomersCount: activeCustomersCount,
      minOrderDate,
      maxOrderDate: diagnosticMaxOrderDate,
      queryTimestamp: now,
      queryErrorMsg: null,
      isMockFallback: false,
      rawCompanyBreakdown,
      hasRealAreaData: false,
      realAreaBreakdown: [],
      hasValidationReference: false,
      validationLabel: 'No fixed validation reference for selected scope',
      targetReference: { confirmedOrders: 0, totalSalesEgp: 0 },
      discrepancyAnalysis: {
        isExactMatch: false,
        ordersDifference: 0,
        salesDifferenceEgp: 0,
        appliedFiltersList: [
          `Date Range: ${startDate} to ${endDate}`,
          `Company Filter: ${companyName ?? 'All'}`,
          `Salesperson Filter: ${salespersonName ?? 'All'}`,
        ],
        potentialCauses: [],
      },
    },
  };
}
