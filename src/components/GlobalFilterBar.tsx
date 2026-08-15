import React, { useState, useEffect } from 'react';
import {
  Filter,
  Calendar,
  Building2,
  UserCheck,
  Users,
  Package,
  Clock,
  XCircle,
  Loader2,
  Lock,
  MapPin,
  Map,
  Info,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PeriodMode } from '../types';
import {
  getCurrentMonthRange,
  getPreviousMonthRange,
  calculateEffectiveWindow,
  formatDateDisplay,
  formatDateRangeDisplay
} from '../utils/dateFilters';
import { analytics } from '../analytics';
import { CompanyOption, SalespersonOption, CustomerOption, ProductOption, CustomerStatusOption, CustomerActionOption } from '../analytics/filters';
import { GovernorateOption, AreaOption, GeographyQualitySummary } from '../analytics/types';

export const GlobalFilterBar: React.FC = () => {
  const { language, filters, setFilters, resetFilters, activeFilterCount } = useApp();
  const isAr = language === 'ar';

  const currentMonth = getCurrentMonthRange();
  const previousMonth = getPreviousMonthRange();

  // RPC Filter Options State
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [governorates, setGovernorates] = useState<GovernorateOption[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [geoQuality, setGeoQuality] = useState<GeographyQualitySummary | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customerStatuses, setCustomerStatuses] = useState<CustomerStatusOption[]>([]);
  const [actionOptions, setActionOptions] = useState<CustomerActionOption[]>([]);

  // Loading States
  const [loadingCompanies, setLoadingCompanies] = useState<boolean>(false);
  const [loadingSalespeople, setLoadingSalespeople] = useState<boolean>(false);
  const [loadingGovernorates, setLoadingGovernorates] = useState<boolean>(false);
  const [loadingAreas, setLoadingAreas] = useState<boolean>(false);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [loadingCustomerStatuses, setLoadingCustomerStatuses] = useState<boolean>(false);
  const [loadingActionOptions, setLoadingActionOptions] = useState<boolean>(false);

  // Error States
  const [errorGovernorates, setErrorGovernorates] = useState<string | null>(null);
  const [errorAreas, setErrorAreas] = useState<string | null>(null);

  // Search & Error States for Customers & Products
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState<string>('');
  const [errorCustomers, setErrorCustomers] = useState<string | null>(null);

  const [productSearch, setProductSearch] = useState<string>('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState<string>('');
  const [errorProducts, setErrorProducts] = useState<string | null>(null);

  // Debounce search handlers (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [customerSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [productSearch]);

  // Helper to retry RPC calls on transient database lock/timeout
  async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 400): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
        return withRetry(fn, retries - 1, delayMs);
      }
      throw err;
    }
  }

  // 1. Fetch Companies when effective date window changes
  useEffect(() => {
    let isMounted = true;
    async function loadCompanies() {
      setLoadingCompanies(true);
      try {
        const data = await withRetry(() => analytics.filters.companies({
          startDate: filters.effectiveStartDate,
          endDate: filters.effectiveEndDate,
        }));
        if (isMounted) {
          setCompanies(data);
        }
      } catch (err) {
        console.warn('Failed to load companies filter options:', err);
      } finally {
        if (isMounted) setLoadingCompanies(false);
      }
    }
    loadCompanies();
    return () => { isMounted = false; };
  }, [filters.effectiveStartDate, filters.effectiveEndDate]);

  // 2. Fetch Salespeople when effective date or selected company changes
  useEffect(() => {
    let isMounted = true;
    async function loadSalespeople() {
      setLoadingSalespeople(true);
      try {
        const data = await withRetry(() => analytics.filters.salespeople({
          startDate: filters.effectiveStartDate,
          endDate: filters.effectiveEndDate,
          companyId: filters.companyId,
        }));
        if (isMounted) {
          setSalespeople(data);

          // Cascading validation: If selected salesperson is not in new list, reset to All
          if (filters.salespersonOptionKey) {
            const exists = data.some(sp => sp.optionKey === filters.salespersonOptionKey);
            if (!exists) {
              setFilters(prev => ({
                ...prev,
                salespersonOptionKey: null,
                salespersonName: null,
                salespersonCompanyId: null,
                salesperson: null,
                salesRepId: 'All',
                customerId: null,
                customerName: null,
                productId: null,
                productName: null,
              }));
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load salespeople filter options:', err);
      } finally {
        if (isMounted) setLoadingSalespeople(false);
      }
    }
    loadSalespeople();
    return () => { isMounted = false; };
  }, [filters.effectiveStartDate, filters.effectiveEndDate, filters.companyId]);

  // 2b. Fetch Governorates when dates, company, or salesperson changes
  useEffect(() => {
    let isMounted = true;
    async function loadGovernorates() {
      setLoadingGovernorates(true);
      setErrorGovernorates(null);
      try {
        const activeCompanyId = filters.companyId ?? filters.salespersonCompanyId;
        const data = await withRetry(() => analytics.filters.governorates({
          startDate: filters.effectiveStartDate,
          endDate: filters.effectiveEndDate,
          companyId: activeCompanyId,
          salespersonName: filters.salespersonName,
        }));
        if (isMounted) {
          setGovernorates(data);

          // Cascading validation: If selected governorate is not in new list, reset to All
          if (filters.governorateCode) {
            const exists = data.some(g => g.governorateCode === filters.governorateCode);
            if (!exists) {
              setFilters(prev => ({
                ...prev,
                governorateCode: null,
                governorateName: null,
                areaCode: null,
                areaName: null,
              }));
            }
          }
        }
      } catch (err: any) {
        console.warn('Failed to load governorate filter options:', err);
        if (isMounted) setErrorGovernorates(err?.message || 'Failed to load governorates');
      } finally {
        if (isMounted) setLoadingGovernorates(false);
      }
    }
    loadGovernorates();
    return () => { isMounted = false; };
  }, [filters.effectiveStartDate, filters.effectiveEndDate, filters.companyId, filters.salespersonCompanyId, filters.salespersonName]);

  // 2c. Fetch Areas when dates, company, salesperson, or governorate changes
  useEffect(() => {
    let isMounted = true;
    async function loadAreas() {
      setLoadingAreas(true);
      setErrorAreas(null);
      try {
        const activeCompanyId = filters.companyId ?? filters.salespersonCompanyId;
        const data = await withRetry(() => analytics.filters.areas({
          startDate: filters.effectiveStartDate,
          endDate: filters.effectiveEndDate,
          companyId: activeCompanyId,
          salespersonName: filters.salespersonName,
          governorateCode: filters.governorateCode,
          highConfidenceOnly: true,
        }));
        if (isMounted) {
          setAreas(data);

          // Cascading validation: If selected area is not in new list, reset to All
          if (filters.areaCode) {
            const exists = data.some(a => a.areaCode === filters.areaCode);
            if (!exists) {
              setFilters(prev => ({
                ...prev,
                areaCode: null,
                areaName: null,
              }));
            }
          }
        }
      } catch (err: any) {
        console.warn('Failed to load area filter options:', err);
        if (isMounted) setErrorAreas(err?.message || 'Failed to load areas');
      } finally {
        if (isMounted) setLoadingAreas(false);
      }
    }
    loadAreas();
    return () => { isMounted = false; };
  }, [filters.effectiveStartDate, filters.effectiveEndDate, filters.companyId, filters.salespersonCompanyId, filters.salespersonName, filters.governorateCode]);

  // 2d. Fetch Geography Quality Summary
  useEffect(() => {
    let isMounted = true;
    async function loadGeoQuality() {
      try {
        const activeCompanyId = filters.companyId ?? filters.salespersonCompanyId;
        const data = await withRetry(() => analytics.filters.geographyQuality({
          startDate: filters.effectiveStartDate,
          endDate: filters.effectiveEndDate,
          companyId: activeCompanyId,
          salespersonName: filters.salespersonName,
        }));
        if (isMounted && data && data.length > 0) {
          setGeoQuality(data[0]);
        }
      } catch (err) {
        console.warn('Failed to load geography quality summary:', err);
      }
    }
    loadGeoQuality();
    return () => { isMounted = false; };
  }, [filters.effectiveStartDate, filters.effectiveEndDate, filters.companyId, filters.salespersonCompanyId, filters.salespersonName]);

  // 3. Fetch Customers when date, company, salesperson, governorate, area, product, or customer search changes
  useEffect(() => {
    let isMounted = true;
    let timerId: ReturnType<typeof setTimeout>;

    async function loadCustomers() {
      setLoadingCustomers(true);
      setErrorCustomers(null);
      try {
        const activeCompanyId = filters.companyId ?? filters.salespersonCompanyId;
        const data = await withRetry(() => analytics.filters.customers({
          startDate: filters.effectiveStartDate,
          endDate: filters.effectiveEndDate,
          companyId: activeCompanyId,
          salespersonName: filters.salespersonName,
          governorateCode: filters.governorateCode,
          areaCode: filters.areaCode,
          productId: filters.productId,
          search: debouncedCustomerSearch.trim() ? debouncedCustomerSearch.trim() : null,
          limit: 200,
        }));
        if (isMounted) {
          setCustomers(data);

          // Cascading validation for customer selection
          if (filters.customerId) {
            const exists = data.some(c => c.customerId === filters.customerId);
            if (!exists) {
              setFilters(prev => ({
                ...prev,
                customerId: null,
                customerName: null,
              }));
            }
          }
        }
      } catch (err: any) {
        console.warn('Failed to load customers filter options:', err);
        if (isMounted) setErrorCustomers(err?.message || 'Failed to load customers');
      } finally {
        if (isMounted) setLoadingCustomers(false);
      }
    }

    timerId = setTimeout(() => {
      loadCustomers();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [
    filters.effectiveStartDate,
    filters.effectiveEndDate,
    filters.companyId,
    filters.salespersonCompanyId,
    filters.salespersonName,
    filters.governorateCode,
    filters.areaCode,
    filters.productId,
    debouncedCustomerSearch,
  ]);

  // 4. Fetch Products when date, company, salesperson, governorate, area, customer, or product search changes
  useEffect(() => {
    let isMounted = true;
    let timerId: ReturnType<typeof setTimeout>;

    async function loadProducts() {
      setLoadingProducts(true);
      setErrorProducts(null);
      try {
        const activeCompanyId = filters.companyId ?? filters.salespersonCompanyId;
        const data = await withRetry(() => analytics.filters.products({
          startDate: filters.effectiveStartDate,
          endDate: filters.effectiveEndDate,
          companyId: activeCompanyId,
          salespersonName: filters.salespersonName,
          governorateCode: filters.governorateCode,
          areaCode: filters.areaCode,
          customerId: filters.customerId,
          search: debouncedProductSearch.trim() ? debouncedProductSearch.trim() : null,
          limit: 200,
        }));
        if (isMounted) {
          setProducts(data);

          // Cascading validation for product selection
          if (filters.productId) {
            const exists = data.some(p => p.productId === filters.productId);
            if (!exists) {
              setFilters(prev => ({
                ...prev,
                productId: null,
                productName: null,
              }));
            }
          }
        }
      } catch (err: any) {
        console.warn('Failed to load products filter options:', err);
        if (isMounted) setErrorProducts(err?.message || 'Failed to load products');
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    }

    timerId = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [
    filters.effectiveStartDate,
    filters.effectiveEndDate,
    filters.companyId,
    filters.salespersonCompanyId,
    filters.salespersonName,
    filters.governorateCode,
    filters.areaCode,
    filters.customerId,
    debouncedProductSearch,
  ]);

  // 5. Fetch Customer Statuses when effective date, company, or salesperson changes
  useEffect(() => {
    let isMounted = true;
    async function loadCustomerStatuses() {
      setLoadingCustomerStatuses(true);
      try {
        const activeCompanyName = filters.companyName ?? (filters.company !== 'All' ? filters.company : null);
        const data = await withRetry(() => analytics.filters.customerStatuses({
          effectiveEndDate: filters.effectiveEndDate,
          companyName: activeCompanyName,
          salespersonName: filters.salespersonName,
        }));
        if (isMounted) {
          setCustomerStatuses(data);

          // Cascading validation for customer status selection
          if (filters.customerStatus !== null && filters.customerStatus !== 'All') {
            const exists = data.some(s => s.statusCode === filters.customerStatus);
            if (!exists) {
              setFilters(prev => ({
                ...prev,
                customerStatus: null,
              }));
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load customer status filter options:', err);
      } finally {
        if (isMounted) setLoadingCustomerStatuses(false);
      }
    }

    loadCustomerStatuses();
    return () => { isMounted = false; };
  }, [filters.effectiveEndDate, filters.companyId, filters.companyName, filters.company, filters.salespersonName]);

  // 6. Fetch Customer Action Options (Priority, Risk, Action Type) when effective date, company, or salesperson changes
  useEffect(() => {
    let isMounted = true;
    async function loadCustomerActionOptions() {
      setLoadingActionOptions(true);
      try {
        const activeCompanyName = filters.companyName ?? (filters.company !== 'All' ? filters.company : null);
        const data = await withRetry(() => analytics.filters.customerActionOptions({
          effectiveEndDate: filters.effectiveEndDate,
          companyName: activeCompanyName,
          salespersonName: filters.salespersonName,
        }));
        if (isMounted) {
          setActionOptions(data);

          const priorities = data.filter(d => d.optionType === 'PRIORITY');
          const risks = data.filter(d => d.optionType === 'RISK');
          const actionTypes = data.filter(d => d.optionType === 'ACTION_TYPE');

          // Cascading validation
          setFilters(prev => {
            let updated = false;
            let newPriority = prev.priority;
            let newRisk = prev.risk;
            let newActionType = prev.actionType;

            if (prev.priority !== null && prev.priority !== 'ALL') {
              if (!priorities.some(p => p.optionCode === prev.priority)) {
                newPriority = null;
                updated = true;
              }
            }
            if (prev.risk !== null && prev.risk !== 'ALL') {
              if (!risks.some(r => r.optionCode === prev.risk)) {
                newRisk = null;
                updated = true;
              }
            }
            if (prev.actionType !== null && prev.actionType !== 'ALL') {
              if (!actionTypes.some(a => a.optionCode === prev.actionType)) {
                newActionType = null;
                updated = true;
              }
            }

            if (updated) {
              return {
                ...prev,
                priority: newPriority,
                risk: newRisk,
                actionType: newActionType,
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Failed to load customer action filter options:', err);
      } finally {
        if (isMounted) setLoadingActionOptions(false);
      }
    }

    loadCustomerActionOptions();
    return () => { isMounted = false; };
  }, [filters.effectiveEndDate, filters.companyId, filters.companyName, filters.company, filters.salespersonName]);

  // Handlers for Period Mode & Custom Date
  const handlePeriodChange = (mode: PeriodMode) => {
    let selStart = filters.selectedStartDate;
    let selEnd = filters.selectedEndDate;

    if (mode === 'current_month') {
      selStart = currentMonth.startDate;
      selEnd = currentMonth.endDate;
    } else if (mode === 'previous_month') {
      selStart = previousMonth.startDate;
      selEnd = previousMonth.endDate;
    }

    const { effectiveStartDate, effectiveEndDate } = calculateEffectiveWindow(
      selStart,
      selEnd,
      filters.latestAvailableDataDate
    );

    setFilters(prev => ({
      ...prev,
      periodMode: mode,
      selectedStartDate: selStart,
      selectedEndDate: selEnd,
      effectiveStartDate,
      effectiveEndDate,
      dateRange: {
        ...prev.dateRange,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        preset: mode === 'current_month' ? 'current_mtd' : mode === 'previous_month' ? 'previous_month' : 'custom'
      }
    }));
  };

  const handleCustomDateChange = (start: string, end: string) => {
    const { effectiveStartDate, effectiveEndDate } = calculateEffectiveWindow(
      start,
      end,
      filters.latestAvailableDataDate
    );

    setFilters(prev => ({
      ...prev,
      periodMode: 'custom',
      selectedStartDate: start,
      selectedEndDate: end,
      effectiveStartDate,
      effectiveEndDate,
      dateRange: {
        ...prev.dateRange,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        preset: 'custom'
      }
    }));
  };

  // Handler for Company Selection
  const handleCompanyChange = (val: string) => {
    if (val === 'ALL') {
      setFilters(prev => ({
        ...prev,
        companyId: null,
        companyName: null,
        company: 'All',
        salespersonOptionKey: null,
        salespersonName: null,
        salespersonCompanyId: null,
        salesperson: null,
        salesRepId: 'All',
        customerId: null,
        customerName: null,
        productId: null,
        productName: null,
      }));
    } else {
      const selectedComp = companies.find(c => String(c.companyId) === val);
      if (selectedComp) {
        const compName = selectedComp.companyName as 'MAS' | 'Horeca Smart';
        setFilters(prev => ({
          ...prev,
          companyId: selectedComp.companyId,
          companyName: selectedComp.companyName,
          company: compName,
          // Cascading reset if salesperson doesn't belong to this company
          salespersonOptionKey: prev.salespersonCompanyId === selectedComp.companyId ? prev.salespersonOptionKey : null,
          salespersonName: prev.salespersonCompanyId === selectedComp.companyId ? prev.salespersonName : null,
          salespersonCompanyId: prev.salespersonCompanyId === selectedComp.companyId ? prev.salespersonCompanyId : null,
          salesperson: prev.salespersonCompanyId === selectedComp.companyId ? prev.salespersonName : null,
          salesRepId: prev.salespersonCompanyId === selectedComp.companyId ? (prev.salespersonOptionKey || 'All') : 'All',
          customerId: null,
          customerName: null,
          productId: null,
          productName: null,
        }));
      }
    }
  };

  // Handler for Salesperson Selection
  const handleSalespersonChange = (val: string) => {
    if (val === 'ALL') {
      setFilters(prev => ({
        ...prev,
        salespersonOptionKey: null,
        salespersonName: null,
        salespersonCompanyId: null,
        salesperson: null,
        salesRepId: 'All',
        customerId: null,
        customerName: null,
        productId: null,
        productName: null,
      }));
    } else {
      const selectedSp = salespeople.find(sp => sp.optionKey === val);
      if (selectedSp) {
        setFilters(prev => ({
          ...prev,
          salespersonOptionKey: selectedSp.optionKey,
          salespersonName: selectedSp.salespersonName,
          salespersonCompanyId: selectedSp.companyId,
          salesperson: selectedSp.salespersonName,
          salesRepId: selectedSp.optionKey,
          customerId: null,
          customerName: null,
          productId: null,
          productName: null,
        }));
      }
    }
  };

  // Handler for Governorate Selection
  const handleGovernorateChange = (val: string) => {
    if (val === 'ALL') {
      setFilters(prev => ({
        ...prev,
        governorateCode: null,
        governorateName: null,
        areaCode: null,
        areaName: null,
      }));
    } else {
      const selectedGov = governorates.find(g => g.governorateCode === val);
      if (selectedGov) {
        const govName = selectedGov.governorateCode === 'UNKNOWN' ? 'غير محدد' : (selectedGov.governorateNameAr || selectedGov.governorateCode);
        setFilters(prev => ({
          ...prev,
          governorateCode: selectedGov.governorateCode,
          governorateName: govName,
          areaCode: null,
          areaName: null,
        }));
      }
    }
  };

  // Handler for Area Selection
  const handleAreaChange = (val: string) => {
    if (val === 'ALL') {
      setFilters(prev => ({
        ...prev,
        areaCode: null,
        areaName: null,
      }));
    } else {
      const selectedArea = areas.find(a => a.areaCode === val);
      if (selectedArea) {
        setFilters(prev => ({
          ...prev,
          areaCode: selectedArea.areaCode,
          areaName: selectedArea.areaNameAr || selectedArea.areaCode,
        }));
      }
    }
  };

  // Handler for Customer Selection
  const handleCustomerChange = (val: string) => {
    if (val === 'ALL') {
      setFilters(prev => ({
        ...prev,
        customerId: null,
        customerName: null,
      }));
    } else {
      const selectedCust = customers.find(c => String(c.customerId) === val);
      if (selectedCust) {
        setFilters(prev => ({
          ...prev,
          customerId: selectedCust.customerId,
          customerName: selectedCust.customerName,
        }));
      }
    }
  };

  // Handler for Product Selection
  const handleProductChange = (val: string) => {
    if (val === 'ALL') {
      setFilters(prev => ({
        ...prev,
        productId: null,
        productName: null,
      }));
    } else {
      const selectedProd = products.find(p => String(p.productId) === val);
      if (selectedProd) {
        setFilters(prev => ({
          ...prev,
          productId: selectedProd.productId,
          productName: selectedProd.productName,
        }));
      }
    }
  };

  // Helper to detect if duplicate salesperson names exist across different companies
  const duplicateSalespersonNames = new Set(
    salespeople
      .filter((sp, idx, self) => self.some((other, oIdx) => oIdx !== idx && other.salespersonName === sp.salespersonName && other.companyId !== sp.companyId))
      .map(sp => sp.salespersonName)
  );

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-2.5 transition-colors">
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-center gap-2 lg:gap-3 text-xs">
        
        {/* Filter Title */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold shrink-0 ltr:mr-2 rtl:ml-2">
          <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{isAr ? 'الفلاتر الشاملة:' : 'Global Filters:'}</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>

        {/* Date Range / Period Mode Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={filters.periodMode || 'current_month'}
              onChange={(e) => handlePeriodChange(e.target.value as PeriodMode)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 ltr:pr-8 rtl:pl-8 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="current_month">
                {isAr
                  ? `الشهر الحالي (${formatDateRangeDisplay(currentMonth.startDate, currentMonth.endDate, true)})`
                  : `Current Month (${formatDateRangeDisplay(currentMonth.startDate, currentMonth.endDate, false)})`}
              </option>
              <option value="previous_month">
                {isAr
                  ? `الشهر السابق (${formatDateRangeDisplay(previousMonth.startDate, previousMonth.endDate, true)})`
                  : `Previous Month (${formatDateRangeDisplay(previousMonth.startDate, previousMonth.endDate, false)})`}
              </option>
              <option value="custom">
                {isAr ? 'نطاق تاريخ مخصص' : 'Custom Date Range'}
              </option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {filters.periodMode === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <input
                type="date"
                value={filters.selectedStartDate}
                onChange={(e) => handleCustomDateChange(e.target.value, filters.selectedEndDate)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-mono text-xs focus:outline-none"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={filters.selectedEndDate}
                onChange={(e) => handleCustomDateChange(filters.selectedStartDate, e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-mono text-xs focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Data Availability Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-semibold shrink-0">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {isAr
              ? `البيانات متاحة حتى ${formatDateDisplay(filters.latestAvailableDataDate, true)}`
              : `Data available through ${formatDateDisplay(filters.latestAvailableDataDate, false)}`}
          </span>
        </div>

        {/* Operating Company */}
        <div className="relative shrink-0">
          <select
            value={filters.companyId !== null ? String(filters.companyId) : 'ALL'}
            onChange={(e) => handleCompanyChange(e.target.value)}
            disabled={loadingCompanies}
            className={`appearance-none border rounded-xl px-3 py-1.5 ltr:pr-8 rtl:pl-8 font-semibold focus:outline-none cursor-pointer transition-colors ${
              filters.companyId !== null
                ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <option value="ALL">{isAr ? 'الشركة: الكل' : 'Company: All'}</option>
            {companies.map(c => (
              <option key={c.companyId} value={String(c.companyId)}>
                {c.companyName}
              </option>
            ))}
          </select>
          {loadingCompanies ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>

        {/* Sales Representative */}
        <div className="relative shrink-0">
          <select
            value={filters.salespersonOptionKey || 'ALL'}
            onChange={(e) => handleSalespersonChange(e.target.value)}
            disabled={loadingSalespeople}
            className={`appearance-none border rounded-xl px-3 py-1.5 ltr:pr-8 rtl:pl-8 font-semibold focus:outline-none cursor-pointer transition-colors ${
              filters.salespersonOptionKey !== null
                ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <option value="ALL">
              {loadingSalespeople
                ? (isAr ? 'جاري التحميل...' : 'Loading...')
                : (isAr ? 'المندوب: الجميع' : 'Sales Rep: All')}
            </option>
            {salespeople.map(sp => {
              const showCompany = filters.companyId === null && (duplicateSalespersonNames.has(sp.salespersonName) || true);
              const label = showCompany && filters.companyId === null
                ? `${sp.salespersonName} — ${sp.companyName}`
                : sp.salespersonName;
              return (
                <option key={sp.optionKey} value={sp.optionKey}>
                  {label}
                </option>
              );
            })}
          </select>
          {loadingSalespeople ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          ) : (
            <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>

        {/* Governorate Filter */}
        <div className="relative shrink-0 flex items-center gap-1">
          <div className="relative">
            <select
              value={filters.governorateCode || 'ALL'}
              onChange={(e) => handleGovernorateChange(e.target.value)}
              disabled={loadingGovernorates}
              className={`appearance-none border rounded-xl px-3 py-1.5 ltr:pr-8 rtl:pl-8 font-semibold focus:outline-none cursor-pointer transition-colors ${
                filters.governorateCode !== null
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <option value="ALL">
                {loadingGovernorates
                  ? (isAr ? 'جاري التحميل...' : 'Loading...')
                  : (isAr ? 'المحافظة: الكل' : 'Governorate: All')}
              </option>
              {governorates.map(g => {
                const label = g.governorateCode === 'UNKNOWN'
                  ? (isAr ? 'غير محدد' : 'Unspecified')
                  : (g.governorateNameAr || g.governorateCode);
                return (
                  <option key={g.governorateCode} value={g.governorateCode}>
                    {label}
                  </option>
                );
              })}
            </select>
            {loadingGovernorates ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
          {errorGovernorates && (
            <button
              onClick={() => {
                const activeCompanyId = filters.companyId ?? filters.salespersonCompanyId;
                setLoadingGovernorates(true);
                setErrorGovernorates(null);
                analytics.filters.governorates({
                  startDate: filters.effectiveStartDate,
                  endDate: filters.effectiveEndDate,
                  companyId: activeCompanyId,
                  salespersonName: filters.salespersonName,
                }).then(setGovernorates).catch(err => setErrorGovernorates(err?.message)).finally(() => setLoadingGovernorates(false));
              }}
              title={errorGovernorates}
              className="p-1 text-amber-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Area Filter */}
        <div className="relative shrink-0 flex items-center gap-1">
          <div className="relative">
            <select
              value={filters.areaCode || 'ALL'}
              onChange={(e) => handleAreaChange(e.target.value)}
              disabled={loadingAreas}
              className={`appearance-none border rounded-xl px-3 py-1.5 ltr:pr-8 rtl:pl-8 font-semibold focus:outline-none cursor-pointer transition-colors ${
                filters.areaCode !== null
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <option value="ALL">
                {loadingAreas
                  ? (isAr ? 'جاري التحميل...' : 'Loading...')
                  : (isAr ? 'المنطقة: الكل' : 'Area: All')}
              </option>
              {areas.map(a => (
                <option key={a.areaCode} value={a.areaCode}>
                  {a.areaNameAr || a.areaCode}
                </option>
              ))}
            </select>
            {loadingAreas ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            ) : (
              <Map className="w-3.5 h-3.5 text-slate-400 absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
          {errorAreas && (
            <button
              onClick={() => {
                const activeCompanyId = filters.companyId ?? filters.salespersonCompanyId;
                setLoadingAreas(true);
                setErrorAreas(null);
                analytics.filters.areas({
                  startDate: filters.effectiveStartDate,
                  endDate: filters.effectiveEndDate,
                  companyId: activeCompanyId,
                  salespersonName: filters.salespersonName,
                  governorateCode: filters.governorateCode,
                  highConfidenceOnly: true,
                }).then(setAreas).catch(err => setErrorAreas(err?.message)).finally(() => setLoadingAreas(false));
              }}
              title={errorAreas}
              className="p-1 text-amber-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Geography Quality Summary Badge */}
        {geoQuality && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold shrink-0 cursor-help"
            title={isAr ? 'بعض المناطق مستخرجة تلقائيًا من عناوين العملاء وسيتم تحسينها تدريجيًا.' : 'Some areas are automatically extracted from customer addresses and will be iteratively improved.'}
          >
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              {isAr
                ? `تغطية بيانات المناطق: ${Math.round(geoQuality.areaCoveragePct)}%`
                : `Area Coverage: ${Math.round(geoQuality.areaCoveragePct)}%`}
            </span>
          </div>
        )}

        {/* Customer Filter */}
        <div className="relative shrink-0 flex items-center gap-1">
          <div className="relative max-w-[220px]">
            <select
              value={filters.customerId !== null ? String(filters.customerId) : 'ALL'}
              onChange={(e) => handleCustomerChange(e.target.value)}
              disabled={loadingCustomers}
              className={`appearance-none border rounded-xl px-3 py-1.5 ltr:pr-8 rtl:pl-8 font-semibold focus:outline-none cursor-pointer transition-colors truncate w-full ${
                filters.customerId !== null
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <option value="ALL">
                {loadingCustomers
                  ? (isAr ? 'جاري تحميل العملاء...' : 'Loading Customers...')
                  : (isAr ? `العملاء: الجميع (${customers.length})` : `Customers: All (${customers.length})`)}
              </option>
              {filters.customerId !== null && !customers.some(c => c.customerId === filters.customerId) && (
                <option value={String(filters.customerId)}>
                  {filters.customerName || (isAr ? `عميل #${filters.customerId}` : `Customer #${filters.customerId}`)}
                </option>
              )}
              {customers.map((c, idx) => (
                <option key={`cust-${c.customerId}-${idx}`} value={String(c.customerId)}>
                  {c.customerName}
                </option>
              ))}
            </select>
            {loadingCustomers ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            ) : (
              <Users className="w-3.5 h-3.5 text-slate-400 absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
          {errorCustomers && (
            <button
              onClick={() => {
                const activeCompanyId = filters.companyId ?? filters.salespersonCompanyId;
                setLoadingCustomers(true);
                setErrorCustomers(null);
                analytics.filters.customers({
                  startDate: filters.effectiveStartDate,
                  endDate: filters.effectiveEndDate,
                  companyId: activeCompanyId,
                  salespersonName: filters.salespersonName,
                  governorateCode: filters.governorateCode,
                  areaCode: filters.areaCode,
                  productId: filters.productId,
                  search: debouncedCustomerSearch.trim() || null,
                  limit: 200,
                }).then(setCustomers).catch(err => setErrorCustomers(err?.message)).finally(() => setLoadingCustomers(false));
              }}
              title={errorCustomers}
              className="p-1 text-amber-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Product Filter */}
        <div className="relative shrink-0 flex items-center gap-1">
          <div className="relative max-w-[220px]">
            <select
              value={filters.productId !== null ? String(filters.productId) : 'ALL'}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={loadingProducts}
              className={`appearance-none border rounded-xl px-3 py-1.5 ltr:pr-8 rtl:pl-8 font-semibold focus:outline-none cursor-pointer transition-colors truncate w-full ${
                filters.productId !== null
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <option value="ALL">
                {loadingProducts
                  ? (isAr ? 'جاري تحميل المنتجات...' : 'Loading Products...')
                  : (isAr ? `المنتجات: الجميع (${products.length})` : `Products: All (${products.length})`)}
              </option>
              {filters.productId !== null && !products.some(p => p.productId === filters.productId) && (
                <option value={String(filters.productId)}>
                  {filters.productName || (isAr ? `منتج #${filters.productId}` : `Product #${filters.productId}`)}
                </option>
              )}
              {products.map((p, idx) => (
                <option key={`prod-${p.productId}-${idx}`} value={String(p.productId)}>
                  {p.productName}
                </option>
              ))}
            </select>
            {loadingProducts ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            ) : (
              <Package className="w-3.5 h-3.5 text-slate-400 absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
          {errorProducts && (
            <button
              onClick={() => {
                const activeCompanyId = filters.companyId ?? filters.salespersonCompanyId;
                setLoadingProducts(true);
                setErrorProducts(null);
                analytics.filters.products({
                  startDate: filters.effectiveStartDate,
                  endDate: filters.effectiveEndDate,
                  companyId: activeCompanyId,
                  salespersonName: filters.salespersonName,
                  governorateCode: filters.governorateCode,
                  areaCode: filters.areaCode,
                  customerId: filters.customerId,
                  search: debouncedProductSearch.trim() || null,
                  limit: 200,
                }).then(setProducts).catch(err => setErrorProducts(err?.message)).finally(() => setLoadingProducts(false));
              }}
              title={errorProducts}
              className="p-1 text-amber-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Customer Status Filter */}
        <div className="relative shrink-0">
          <select
            value={filters.customerStatus || 'ALL'}
            onChange={(e) => {
              const val = e.target.value === 'ALL' ? null : e.target.value;
              setFilters(prev => ({ ...prev, customerStatus: val }));
            }}
            disabled={loadingCustomerStatuses}
            className={`appearance-none border rounded-xl px-3 py-1.5 ltr:pr-8 rtl:pl-8 font-semibold focus:outline-none cursor-pointer transition-colors ${
              filters.customerStatus !== null
                ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <option value="ALL">
              {loadingCustomerStatuses
                ? (isAr ? 'جاري تحميل الحالات...' : 'Loading Statuses...')
                : (isAr ? 'حالة العميل: الكل' : 'Status: All')}
            </option>
            {customerStatuses.map(s => (
              <option key={`status-${s.statusCode}`} value={s.statusCode}>
                {s.statusLabelAr} ({s.customersCount})
              </option>
            ))}
          </select>
          {loadingCustomerStatuses ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          ) : (
            <Users className="w-3.5 h-3.5 text-slate-400 absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>

        {/* Area / City - Disabled Pending Data Quality */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 shrink-0 cursor-not-allowed select-none"
          title={isAr ? 'المنطقة والمدينة غير متاحة مؤقتًا لحين استكمال ربط بيانات العملاء' : 'City/Area temporarily unavailable (Pending Data Quality)'}
        >
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-[11px]">
            {isAr ? 'المنطقة: غير متاحة مؤقتًا (جودة البيانات)' : 'City/Area: Pending Data Quality'}
          </span>
        </div>

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setCustomerSearch('');
              setProductSearch('');
              resetFilters();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-semibold border border-red-200 dark:border-red-800 transition-colors shrink-0"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</span>
          </button>
        )}

      </div>
    </div>
  );
};
