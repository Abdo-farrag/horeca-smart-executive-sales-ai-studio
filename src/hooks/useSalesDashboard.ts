import { useState, useEffect, useCallback } from 'react';
import { GlobalFilterState, OrderRecord } from '../types';
import { fetchSalesOrders } from '../services/salesService';

export function useSalesDashboard(filters: GlobalFilterState) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchSalesOrders(filters);
    setOrders(res.orders);
    setIsLive(res.isLive);
    setError(res.error);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, loading, isLive, error, refetch: load };
}
