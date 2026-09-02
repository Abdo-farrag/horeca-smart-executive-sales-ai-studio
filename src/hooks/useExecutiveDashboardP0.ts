import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataSourceState } from '../components/DataSourceStatus';
import { isSupabaseConfigured } from '../lib/supabase';
import { GlobalFilterState } from '../types';
import { ExecutiveP0Data, fetchExecutiveDashboardP0 } from '../services/executiveServiceP0';

export interface UseExecutiveDashboardP0Result {
  data: ExecutiveP0Data | null;
  loading: boolean;
  error: string | null;
  status: DataSourceState;
  refetch: () => Promise<void>;
  lastFetchedAt: string | null;
}

export function useExecutiveDashboardP0(filters: GlobalFilterState): UseExecutiveDashboardP0Result {
  const [data, setData] = useState<ExecutiveP0Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const filterKey = useMemo(() => JSON.stringify({
    start: filters.effectiveStartDate || filters.dateRange?.startDate,
    end: filters.effectiveEndDate || filters.dateRange?.endDate,
    company: filters.companyName || filters.company,
    salesperson: filters.salespersonName || filters.salesperson,
    governorateCode: filters.governorateCode,
    areaCode: filters.areaCode,
    customerId: filters.customerId,
    productId: filters.productId,
  }), [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchExecutiveDashboardP0(filtersRef.current);
      setData(result);
      setLastFetchedAt(new Date().toISOString());
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Executive analytics are unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [filterKey, load]);

  const status: DataSourceState = loading
    ? 'loading'
    : !isSupabaseConfigured
    ? 'not_configured'
    : error
    ? 'error'
    : data?.isLive
    ? 'live'
    : 'error';

  return { data, loading, error, status, refetch: load, lastFetchedAt };
}
