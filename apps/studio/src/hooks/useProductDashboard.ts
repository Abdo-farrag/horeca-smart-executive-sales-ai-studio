import { useState, useEffect, useCallback, useRef } from 'react';
import { GlobalFilterState } from '../types';
import { ProductSummaryResult, ProductReconciliationResult } from '../analytics/types';
import { fetchProductSummaryList, fetchProductReconciliation } from '../services/productService';

export function useProductDashboard(
  filters: GlobalFilterState,
  options: {
    search?: string | null;
    limit?: number | null;
    offset?: number | null;
  } = {}
) {
  const [data, setData] = useState<ProductSummaryResult[]>([]);
  const [reconciliation, setReconciliation] = useState<ProductReconciliationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reconciliationLoading, setReconciliationLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);

  const { search, limit, offset } = options;

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const optionsRef = useRef({ search, limit, offset });
  optionsRef.current = { search, limit, offset };

  const filterKey = JSON.stringify({
    start: filters.effectiveStartDate || filters.dateRange?.startDate,
    end: filters.effectiveEndDate || filters.dateRange?.endDate,
    company: filters.company,
    salesperson: filters.salesperson || filters.salespersonName || filters.salesRepId,
    governorate: filters.governorateCode,
    area: filters.areaCode,
    customer: filters.customerId,
    product: filters.productId,
    search: search ?? null,
    limit: limit ?? null,
    offset: offset ?? null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setReconciliationLoading(true);
    setError(null);
    setReconciliationError(null);

    const [sumRes, reconRes] = await Promise.all([
      fetchProductSummaryList(filtersRef.current, optionsRef.current),
      fetchProductReconciliation(filtersRef.current)
    ]);

    setData(sumRes.data);
    setError(sumRes.error);
    setLoading(false);

    setReconciliation(reconRes.data);
    setReconciliationError(reconRes.error);
    setReconciliationLoading(false);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function execute() {
      setLoading(true);
      setReconciliationLoading(true);
      setError(null);
      setReconciliationError(null);

      const [sumRes, reconRes] = await Promise.all([
        fetchProductSummaryList(filtersRef.current, optionsRef.current),
        fetchProductReconciliation(filtersRef.current)
      ]);

      if (isCurrent) {
        setData(sumRes.data);
        setError(sumRes.error);
        setLoading(false);

        setReconciliation(reconRes.data);
        setReconciliationError(reconRes.error);
        setReconciliationLoading(false);
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
    reconciliation,
    reconciliationLoading,
    reconciliationError,
    refetch: load,
  };
}

