import { useState, useEffect, useCallback } from 'react';
import { GlobalFilterState } from '../types';
import { CustomerSummaryResult } from '../analytics/types';
import { fetchCustomerSummaryList } from '../services/customerService';

export interface CustomerDashboardOptions {
  status?: string | null;
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export function useCustomerDashboard(
  filters: GlobalFilterState,
  options: CustomerDashboardOptions = {}
) {
  const [data, setData] = useState<CustomerSummaryResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { status, search, limit, offset } = options;

  const load = useCallback(async () => {
    let isCurrent = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCustomerSummaryList(filters, { status, search, limit, offset });
      if (isCurrent) {
        setData(result.data);
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Error fetching customer summary in hook:', err);
      if (isCurrent) {
        setError(err?.message || 'Error loading live customer data');
        setData([]);
      }
    } finally {
      if (isCurrent) {
        setLoading(false);
      }
    }

    return () => {
      isCurrent = false;
    };
  }, [filters, status, search, limit, offset]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    load().then((c) => {
      cleanup = c;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, [load]);

  return {
    data,
    loading,
    error,
    refetch: load,
  };
}

