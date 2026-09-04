import { useState, useEffect, useCallback, useRef } from 'react';
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
      const res = await fetchSalesRepSummaryList(filtersRef.current);
      setSummaries(res.data);
      setIsLive(res.isLive);
      setError(res.error);
      setLastFetchedAt(new Date().toLocaleTimeString('ar-EG'));
    } catch (err: any) {
      setError(err?.message || 'Error fetching sales rep summary');
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
        const res = await fetchSalesRepSummaryList(filtersRef.current);
        if (isCurrent) {
          setSummaries(res.data);
          setIsLive(res.isLive);
          setError(res.error);
          setLastFetchedAt(new Date().toLocaleTimeString('ar-EG'));
        }
      } catch (err: any) {
        if (isCurrent) {
          setError(err?.message || 'Error fetching sales rep summary');
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
    summaries,
    loading,
    isLive,
    error,
    lastFetchedAt,
    refetch: load
  };
}

export function useSalesRep360(salespersonName: string | null, filters: GlobalFilterState, companyNameOverride: string | null = null) {
  const [trend, setTrend] = useState<SalesRepTrendRpcRow[]>([]);
  const [customers, setCustomers] = useState<SalesRepCustomerRpcRow[]>([]);
  const [retentionDetails, setRetentionDetails] = useState<SalesRepRetentionDetailRpcRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const filterKey = JSON.stringify({
    salespersonName,
    start: filters.effectiveStartDate || filters.dateRange?.startDate,
    end: filters.effectiveEndDate || filters.dateRange?.endDate,
    company: companyNameOverride ?? filters.company,
  });

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
    try {
      const res = await fetchSalesRep360All(salespersonName, filtersRef.current, companyNameOverride);
      setTrend(res.trend);
      setCustomers(res.customers);
      setRetentionDetails(res.retentionDetails);
      setIsLive(res.isLive);
      setError(res.error);
    } catch (err: any) {
      setError(err?.message || 'Error fetching sales rep 360 data');
    } finally {
      setLoading(false);
    }
  }, [salespersonName, companyNameOverride]);

  useEffect(() => {
    let isCurrent = true;

    if (!salespersonName) {
      setTrend([]);
      setCustomers([]);
      setRetentionDetails([]);
      setLoading(false);
      return;
    }

    async function execute() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchSalesRep360All(salespersonName!, filtersRef.current, companyNameOverride);
        if (isCurrent) {
          setTrend(res.trend);
          setCustomers(res.customers);
          setRetentionDetails(res.retentionDetails);
          setIsLive(res.isLive);
          setError(res.error);
        }
      } catch (err: any) {
        if (isCurrent) {
          setError(err?.message || 'Error fetching sales rep 360 data');
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
    trend,
    customers,
    retentionDetails,
    loading,
    isLive,
    error,
    refetch: load
  };
}

