import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataSourceState } from '../components/DataSourceStatus';
import { isSupabaseConfigured } from '../lib/supabase';
import { GlobalFilterState } from '../types';
import {
  createUnavailableExecutiveData,
  ExecutiveDashboardData,
  fetchExecutiveDashboardData,
} from '../services/executiveService';

export interface UseExecutiveDashboardReturn {
  data: ExecutiveDashboardData;
  loading: boolean;
  error: string | null;
  status: DataSourceState;
  refetch: () => Promise<void>;
  lastFetchedAt: string | null;
}

export function useExecutiveDashboard(filters: GlobalFilterState): UseExecutiveDashboardReturn {
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboardData>(() =>
    createUnavailableExecutiveData(filters),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        start: filters.effectiveStartDate || filters.dateRange?.startDate,
        end: filters.effectiveEndDate || filters.dateRange?.endDate,
        company: filters.companyName || filters.company,
        salesperson: filters.salespersonName || filters.salesperson || filters.salesRepId,
        governorateCode: filters.governorateCode,
        areaCode: filters.areaCode,
        customerId: filters.customerId,
        productId: filters.productId,
      }),
    [
      filters.effectiveStartDate,
      filters.effectiveEndDate,
      filters.dateRange?.startDate,
      filters.dateRange?.endDate,
      filters.companyName,
      filters.company,
      filters.salespersonName,
      filters.salesperson,
      filters.salesRepId,
      filters.governorateCode,
      filters.areaCode,
      filters.customerId,
      filters.productId,
    ],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchExecutiveDashboardData(filtersRef.current);
      setDashboardData(result);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Executive analytics are unavailable.';
      setError(message);
      setDashboardData(createUnavailableExecutiveData(filtersRef.current, message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchExecutiveDashboardData(filtersRef.current)
      .then((result) => {
        if (active) setDashboardData(result);
      })
      .catch((caught) => {
        if (!active) return;
        const message = caught instanceof Error ? caught.message : 'Executive analytics are unavailable.';
        setError(message);
        setDashboardData(createUnavailableExecutiveData(filtersRef.current, message));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filterKey]);

  const status: DataSourceState = loading
    ? 'loading'
    : !isSupabaseConfigured
      ? 'not_configured'
      : error || !dashboardData.isLiveSupabaseData
        ? 'error'
        : 'live';

  return {
    data: dashboardData,
    loading,
    error,
    status,
    refetch: loadData,
    lastFetchedAt: dashboardData.lastFetchedAt || null,
  };
}
