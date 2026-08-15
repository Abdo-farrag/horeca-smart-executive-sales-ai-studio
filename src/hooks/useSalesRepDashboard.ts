import { useState, useEffect, useCallback } from 'react';
import {
  GlobalFilterState,
  SalesRepSummaryRpcRow,
  SalesRepTrendRpcRow,
  SalesRepCustomerRpcRow,
  SalesRepRetentionDetailRpcRow
} from '../types';
import {
  fetchSalesRepSummaryList,
  fetchSalesRep360All
} from '../services/salesRepService';

export function useSalesRepDashboard(filters: GlobalFilterState) {
  const [summaries, setSummaries] = useState<SalesRepSummaryRpcRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchSalesRepSummaryList(filters);
    setSummaries(res.data);
    setIsLive(res.isLive);
    setError(res.error);
    setLastFetchedAt(new Date().toLocaleTimeString('ar-EG'));
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    summaries,
    loading,
    isLive,
    error,
    lastFetchedAt,
    refetch: load
  };
}

export function useSalesRep360(salespersonName: string | null, filters: GlobalFilterState) {
  const [trend, setTrend] = useState<SalesRepTrendRpcRow[]>([]);
  const [customers, setCustomers] = useState<SalesRepCustomerRpcRow[]>([]);
  const [retentionDetails, setRetentionDetails] = useState<SalesRepRetentionDetailRpcRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!salespersonName) {
      setTrend([]);
      setCustomers([]);
      setRetentionDetails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const res = await fetchSalesRep360All(salespersonName, filters);
    setTrend(res.trend);
    setCustomers(res.customers);
    setRetentionDetails(res.retentionDetails);
    setIsLive(res.isLive);
    setError(res.error);
    setLoading(false);
  }, [salespersonName, filters]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    trend,
    customers,
    retentionDetails,
    loading,
    isLive,
    error,
    refetch: load
  };
}
