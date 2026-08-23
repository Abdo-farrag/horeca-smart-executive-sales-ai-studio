import { useState, useEffect, useCallback, useRef } from 'react';
import { GlobalFilterState } from '../types';
import { fetchExecutiveDashboardData, ExecutiveDashboardData } from '../services/executiveService';
import { DataSourceState } from '../components/DataSourceStatus';
import { isSupabaseConfigured } from '../lib/supabase';

export interface UseExecutiveDashboardReturn {
  data: ExecutiveDashboardData;
  loading: boolean;
  error: string | null;
  status: DataSourceState;
  refetch: () => Promise<void>;
  lastFetchedAt: string | null;
}

export function useExecutiveDashboard(filters: GlobalFilterState): UseExecutiveDashboardReturn {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboardData | null>(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const filterKey = JSON.stringify({
    start: filters.effectiveStartDate || filters.dateRange?.startDate,
    end: filters.effectiveEndDate || filters.dateRange?.endDate,
    company: filters.company,
    salesperson: filters.salesperson || filters.salespersonName || filters.salesRepId,
    governorate: filters.governorateCode,
    area: filters.areaCode,
    customer: filters.customerId,
    product: filters.productId,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchExecutiveDashboardData(filtersRef.current);
      setDashboardData(res);
      setError(res.errorMessage);
    } catch (err: any) {
      console.error('Error loading Executive Dashboard hook:', err);
      setError(err?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function execute() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchExecutiveDashboardData(filtersRef.current);
        if (isCurrent) {
          setDashboardData(res);
          setError(res.errorMessage);
        }
      } catch (err: any) {
        console.error('Error loading Executive Dashboard hook:', err);
        if (isCurrent) {
          setError(err?.message || 'Failed to fetch dashboard data');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    execute();

    return () => {
      isCurrent = false;
    };
  }, [filterKey]);

  const status: DataSourceState = loading
    ? 'loading'
    : !isSupabaseConfigured
    ? 'not_configured'
    : dashboardData?.isLiveSupabaseData
    ? 'live'
    : error
    ? 'error'
    : 'mock_fallback';

  return {
    data: (dashboardData || {
      freshnessInfo: { maxOrderDate: '2026-08-04', lastSuccessfulSyncAt: '2026-08-04 12:00 UTC', rowsSynced: 15209, syncStatus: 'Fresh' },
      kpis: [],
      dailySalesTrend: [],
      salesByCompany: [],
      topSalesReps: [],
      topCustomers: [],
      retentionMetrics: {
        currentMonth: filters.dateRange.startDate,
        previousActiveCustomers: 0,
        retainedWithSameRep: 0,
        transferredCustomers: 0,
        trueLostCustomers: 0,
        newCustomers: 0,
        companyRetentionRate: 0,
        sameRepRetentionRate: 0,
        lostCustomerRevenueEgp: 0,
        isLive: false,
      },
      retentionRate: 88.4,
      totalSales: 0,
      confirmedOrdersCount: 0,
      activeCustomersCount: 0,
      averageOrderValue: 0,
      revenueGrowthPercent: 0,
      isLiveSupabaseData: false,
      lastFetchedAt: new Date().toLocaleTimeString('ar-EG'),
      errorMessage: error,
      diagnostics: {
        dataMode: 'Not configured',
        supabaseHost: 'Not configured',
        selectedDateRange: { startDate: filters.dateRange.startDate, endDate: filters.dateRange.endDate },
        sourceViewQueried: 'sales_orders_odoo18',
        rawRowCountReturned: 0,
        confirmedOrdersCount: 0,
        totalSalesAmountEgp: 0,
        uniqueCustomersCount: 0,
        minOrderDate: null,
        maxOrderDate: null,
        queryTimestamp: new Date().toISOString(),
        queryErrorMsg: error,
        isMockFallback: true,
        rawCompanyBreakdown: [],
        hasRealAreaData: false,
        realAreaBreakdown: [],
        targetReference: { confirmedOrders: 2796, totalSalesEgp: 115773808.51 },
        discrepancyAnalysis: {
          isExactMatch: false,
          ordersDifference: -2796,
          salesDifferenceEgp: -115773808.51,
          appliedFiltersList: [],
          potentialCauses: ['Initial state loading'] } } } as unknown as ExecutiveDashboardData),
    loading,
    error,
    status,
    refetch: loadData,
    lastFetchedAt: dashboardData?.lastFetchedAt || null
  };
}
