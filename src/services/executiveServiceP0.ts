import { analytics } from '../analytics';
import { isSupabaseConfigured } from '../lib/supabase';
import { GlobalFilterState } from '../types';
import { getEffectiveFilterParams } from '../utils/filterUtils';

export interface ExecutiveP0Kpis {
  salesValue: number;
  previousSalesValue: number;
  ordersCount: number;
  activeCustomers: number;
  averageOrderValue: number;
  revenueGrowthPct: number;
}

export interface ExecutiveP0DailyRow {
  date: string;
  horecaSales: number;
  masSales: number;
  totalSales: number;
  ordersCount: number;
}

export interface ExecutiveP0CompanyRow {
  company: 'Horeca Smart' | 'MAS';
  revenue: number;
  percentage: number;
}

export interface ExecutiveP0RepRow {
  salesperson: string;
  companyName: string;
  salesValue: number;
  ordersCount: number;
  activeCustomers: number;
  averageOrderValue: number;
  retentionRate: number | null;
}

export interface ExecutiveP0CustomerRow {
  customerId: number;
  customerName: string;
  companyName: string;
  primarySalesperson: string;
  salesValue: number;
  ordersCount: number;
  averageOrderValue: number;
  lastOrderAt: string | null;
}

export interface ExecutiveP0Retention {
  previousActiveCustomers: number;
  retainedWithSameRep: number;
  transferredCustomers: number;
  trueLostCustomers: number;
  newCustomers: number;
  companyRetentionRate: number;
  sameRepRetentionRate: number;
  lostCustomerRevenueEgp: number;
}

export interface ExecutiveP0Freshness {
  maxOrderDate: string | null;
  lastSuccessfulSyncAt: string | null;
  rowsSynced: number | null;
}

export interface ExecutiveP0Data {
  kpis: ExecutiveP0Kpis;
  dailySalesTrend: ExecutiveP0DailyRow[];
  companyRevenue: ExecutiveP0CompanyRow[];
  topSalesReps: ExecutiveP0RepRow[];
  topCustomers: ExecutiveP0CustomerRow[];
  retention: ExecutiveP0Retention | null;
  freshness: ExecutiveP0Freshness;
  isLive: true;
}

const numberOrZero = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function fetchExecutiveDashboardP0(filters: GlobalFilterState): Promise<ExecutiveP0Data> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase credentials are not configured. Executive commercial data is unavailable.');
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
  const results = await Promise.allSettled([
    analytics.sales.executive({ startDate, endDate, companyName, salesperson: salespersonName, governorateCode, areaCode, customerId, productId }),
    analytics.sales.daily({ startDate, endDate, companyName, salesperson: salespersonName, governorateCode, areaCode, customerId, productId }),
    analytics.sales.topCustomers({ startDate, endDate, companyName, salesperson: salespersonName, limit: 20 }),
    analytics.customers.retention({ month, companyName, salesperson: salespersonName }),
    analytics.salesReps.summary({ month, companyName, salesperson: salespersonName }),
    analytics.sales.freshness(),
  ]);

  if (results[0].status !== 'fulfilled') {
    throw results[0].reason instanceof Error ? results[0].reason : new Error('Executive KPI query failed.');
  }

  const kpiRow: any = results[0].value?.[0];
  if (!kpiRow) {
    throw new Error('Executive KPI query returned no verified row for the selected scope.');
  }

  const dailyRows: any[] = results[1].status === 'fulfilled' ? results[1].value : [];
  const customerRows: any[] = results[2].status === 'fulfilled' ? results[2].value : [];
  const retentionRows: any[] = results[3].status === 'fulfilled' ? results[3].value : [];
  const repRows: any[] = results[4].status === 'fulfilled' ? results[4].value : [];
  const freshnessRows: any[] = results[5].status === 'fulfilled' ? results[5].value : [];

  const kpis: ExecutiveP0Kpis = {
    salesValue: numberOrZero(kpiRow.salesValue),
    previousSalesValue: numberOrZero(kpiRow.previousSalesValue),
    ordersCount: numberOrZero(kpiRow.ordersCount),
    activeCustomers: numberOrZero(kpiRow.activeCustomers),
    averageOrderValue: numberOrZero(kpiRow.averageOrderValue),
    revenueGrowthPct: numberOrZero(kpiRow.revenueGrowthPct),
  };

  const dailySalesTrend: ExecutiveP0DailyRow[] = dailyRows.map((row) => ({
    date: String(row.orderDate ?? ''),
    horecaSales: numberOrZero(row.horecaSales),
    masSales: numberOrZero(row.masSales),
    totalSales: numberOrZero(row.totalSales),
    ordersCount: numberOrZero(row.ordersCount),
  }));

  const horecaRevenue = dailySalesTrend.reduce((sum, row) => sum + row.horecaSales, 0);
  const masRevenue = dailySalesTrend.reduce((sum, row) => sum + row.masSales, 0);
  const companyTotal = horecaRevenue + masRevenue;
  const companyRevenue: ExecutiveP0CompanyRow[] = [
    { company: 'Horeca Smart', revenue: horecaRevenue, percentage: companyTotal > 0 ? (horecaRevenue / companyTotal) * 100 : 0 },
    { company: 'MAS', revenue: masRevenue, percentage: companyTotal > 0 ? (masRevenue / companyTotal) * 100 : 0 },
  ];

  const topSalesReps: ExecutiveP0RepRow[] = repRows.slice(0, 15).map((row) => ({
    salesperson: String(row.salesperson ?? ''),
    companyName: String(row.companyName ?? ''),
    salesValue: numberOrZero(row.salesValue),
    ordersCount: numberOrZero(row.ordersCount),
    activeCustomers: numberOrZero(row.activeCustomers),
    averageOrderValue: numberOrZero(row.averageOrderValue),
    retentionRate: row.retentionRate == null ? null : numberOrZero(row.retentionRate),
  }));

  const topCustomers: ExecutiveP0CustomerRow[] = customerRows.slice(0, 20).map((row) => ({
    customerId: numberOrZero(row.customerId),
    customerName: String(row.customerName ?? ''),
    companyName: String(row.companyName ?? ''),
    primarySalesperson: String(row.primarySalesperson ?? ''),
    salesValue: numberOrZero(row.salesValue),
    ordersCount: numberOrZero(row.ordersCount),
    averageOrderValue: numberOrZero(row.averageOrderValue),
    lastOrderAt: row.lastOrderAt ? String(row.lastOrderAt) : null,
  }));

  const retentionRow: any = retentionRows[0];
  const retention: ExecutiveP0Retention | null = retentionRow ? {
    previousActiveCustomers: numberOrZero(retentionRow.previousActiveCustomers),
    retainedWithSameRep: numberOrZero(retentionRow.retainedWithSameRep),
    transferredCustomers: numberOrZero(retentionRow.transferredCustomers),
    trueLostCustomers: numberOrZero(retentionRow.trueLostCustomers),
    newCustomers: numberOrZero(retentionRow.newCustomers),
    companyRetentionRate: numberOrZero(retentionRow.companyRetentionRate),
    sameRepRetentionRate: numberOrZero(retentionRow.sameRepRetentionRate),
    lostCustomerRevenueEgp: numberOrZero(retentionRow.lostCustomerRevenueEgp),
  } : null;

  const freshnessRow: any = freshnessRows[0];
  const freshness: ExecutiveP0Freshness = {
    maxOrderDate: freshnessRow?.maxOrderDate ? String(freshnessRow.maxOrderDate) : null,
    lastSuccessfulSyncAt: freshnessRow?.lastSuccessfulSalesSyncFinishedAt
      ? String(freshnessRow.lastSuccessfulSalesSyncFinishedAt)
      : freshnessRow?.lastSuccessfulSalesSyncStartedAt
      ? String(freshnessRow.lastSuccessfulSalesSyncStartedAt)
      : null,
    rowsSynced: freshnessRow?.lastSalesSyncRowsCount == null ? null : numberOrZero(freshnessRow.lastSalesSyncRowsCount),
  };

  return { kpis, dailySalesTrend, companyRevenue, topSalesReps, topCustomers, retention, freshness, isLive: true };
}
