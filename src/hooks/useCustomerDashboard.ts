import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Keep latest filters and options in refs to avoid recreating load on object reference change
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const optionsRef = useRef({ status, search, limit, offset });
  optionsRef.current = { status, search, limit, offset };

  // Stable filter signature representing all primitive values
  const filterKey = JSON.stringify({
    start: filters.effectiveStartDate || filters.dateRange?.startDate,
    end: filters.effectiveEndDate || filters.dateRange?.endDate,
    company: filters.company,
    salesperson: filters.salesperson || filters.salespersonName || filters.salesRepId,
    governorate: filters.governorateCode,
    area: filters.areaCode,
    customer: filters.customerId,
    product: filters.productId,
    status: status ?? null,
    search: search ?? null,
    limit: limit ?? null,
    offset: offset ?? null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCustomerSummaryList(filtersRef.current, optionsRef.current);
      setData(result.data);
      setError(result.error);
    } catch (err: any) {
      console.error('Error fetching customer summary in hook:', err);
      setError(err?.message || 'Error loading live customer data');
      setData([]);
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
        const result = await fetchCustomerSummaryList(filtersRef.current, optionsRef.current);
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
    }

    execute();

    return () => {
      isCurrent = false;
    };
  }, [filterKey]);

  return {
    data,
    loading,
    error,
    refetch: load,
  };
}

