import { useState, useEffect, useCallback } from 'react';
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchExecutiveDashboardData(filters);
      setDashboardData(res);
      setError(res.errorMessage);
    } catch (err: any) {
      console.error('Error loading Executive Dashboard hook:', err);
      setError(err?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    data: dashboardData || {
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
          potentialCauses: ['Initial state loading']
        }
      }
    },
    loading,
    error,
    status,
    refetch: loadData,
    lastFetchedAt: dashboardData?.lastFetchedAt || null
  };
}
