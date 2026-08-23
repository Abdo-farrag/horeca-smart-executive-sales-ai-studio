import { useState, useEffect, useCallback, useRef } from 'react';
import { GlobalFilterState, OrderRecord } from '../types';
import { fetchSalesOrders } from '../services/salesService';

export function useSalesDashboard(filters: GlobalFilterState) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSalesOrders(filtersRef.current);
      setOrders(res.orders);
      setIsLive(res.isLive);
      setError(res.error);
    } catch (err: any) {
      setError(err?.message || 'Error fetching sales orders');
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
        const res = await fetchSalesOrders(filtersRef.current);
        if (isCurrent) {
          setOrders(res.orders);
          setIsLive(res.isLive);
          setError(res.error);
        }
      } catch (err: any) {
        if (isCurrent) {
          setError(err?.message || 'Error fetching sales orders');
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

  return { orders, loading, isLive, error, refetch: load };
}

