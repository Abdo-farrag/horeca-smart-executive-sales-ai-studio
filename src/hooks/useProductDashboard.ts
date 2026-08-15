import { useState, useEffect, useCallback } from 'react';
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

  const load = useCallback(async () => {
    setLoading(true);
    setReconciliationLoading(true);
    setError(null);
    setReconciliationError(null);

    const [sumRes, reconRes] = await Promise.all([
      fetchProductSummaryList(filters, { search, limit, offset }),
      fetchProductReconciliation(filters)
    ]);

    setData(sumRes.data);
    setError(sumRes.error);
    setLoading(false);

    setReconciliation(reconRes.data);
    setReconciliationError(reconRes.error);
    setReconciliationLoading(false);
  }, [filters, search, limit, offset]);

  useEffect(() => {
    load();
  }, [load]);

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

