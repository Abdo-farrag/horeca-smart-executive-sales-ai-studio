import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Building2,
  UserCheck,
  Award,
  DollarSign,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { analytics } from '../analytics';
import { DailySalesRepPerformanceRow } from '../analytics/types';

type SortField = 'ordersCount' | 'salesValue' | 'uniqueCustomers' | 'averageOrderValue' | 'ordersRank';
type SortOrder = 'asc' | 'desc';

function formatArabicDate(isoDateStr: string | null | undefined): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthsAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return `${day} ${monthsAr[monthIdx] || ''} ${year}`;
}

export const DailySalesRepPerformance: React.FC = () => {
  const { language, filters, setFilters, setCurrentView } = useApp();
  const isAr = language === 'ar';

  // Local state for requested date, company filter, salesperson search, sorting
  const defaultDate = filters.dateRange?.endDate || '2026-08-04';
  const [requestedDate, setRequestedDate] = useState<string>(defaultDate);
  const [selectedCompany, setSelectedCompany] = useState<string>(filters.company || 'All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [rows, setRows] = useState<DailySalesRepPerformanceRow[]>([]);
  const [dailyKpisData, setDailyKpisData] = useState<{
    ordersCount: number;
    salesValue: number;
    uniqueCustomers: number;
    activeSalespeople: number;
    averageOrderValue: number;
  } | null>(null);
  const [actualReportDate, setActualReportDate] = useState<string | null>(null);
  const [isFallbackDate, setIsFallbackDate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('ordersCount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Sync with global company filter changes
  useEffect(() => {
    if (filters.company) {
      setSelectedCompany(filters.company);
    }
  }, [filters.company]);

  // Sync initial date from filters
  useEffect(() => {
    if (filters.dateRange?.endDate) {
      setRequestedDate(filters.dateRange.endDate);
    }
  }, [filters.dateRange?.endDate]);

  // Fetch daily summary data
  const fetchData = async (targetDate: string | null) => {
    setLoading(true);
    setError(null);

    try {
      const companyParam = selectedCompany === 'All' ? null : selectedCompany;
      
      // Attempt 1: Fetch with targetDate
      let [fetchedRows, fetchedKpis] = await Promise.all([
        analytics.salesReps.daily({
          date: targetDate,
          companyName: companyParam,
          salesperson: null,
        }),
        analytics.salesReps.dailyKpis({
          date: targetDate,
          companyName: companyParam,
          salesperson: null,
        }),
      ]);

      let fallbackUsed = false;
      let effectiveDate = targetDate;
      let activeKpi = fetchedKpis && fetchedKpis.length > 0 ? fetchedKpis[0] : null;

      // Attempt 2: If targetDate returned no rows and targetDate was specified, fallback to latest available day (date: null)
      if (fetchedRows.length === 0 && targetDate !== null) {
        const [fallbackRows, fallbackKpis] = await Promise.all([
          analytics.salesReps.daily({
            date: null,
            companyName: companyParam,
            salesperson: null,
          }),
          analytics.salesReps.dailyKpis({
            date: null,
            companyName: companyParam,
            salesperson: null,
          }),
        ]);

        if (fallbackRows.length > 0) {
          fetchedRows = fallbackRows;
          activeKpi = fallbackKpis && fallbackKpis.length > 0 ? fallbackKpis[0] : null;
          effectiveDate = fallbackRows[0].reportDate;
          fallbackUsed = true;
        }
      } else if (fetchedRows.length > 0) {
        effectiveDate = fetchedRows[0].reportDate;
      }

      setRows(fetchedRows);
      setDailyKpisData(
        activeKpi
          ? {
              ordersCount: activeKpi.ordersCount,
              salesValue: activeKpi.salesValue,
              uniqueCustomers: activeKpi.uniqueCustomers,
              activeSalespeople: activeKpi.activeSalespeople,
              averageOrderValue: activeKpi.averageOrderValue,
            }
          : null
      );
      setActualReportDate(effectiveDate);
      setIsFallbackDate(fallbackUsed);
    } catch (err: any) {
      console.error('Error in DailySalesRepPerformance fetch:', err);
      setError(err?.message || 'Error fetching daily sales rep data');
      setRows([]);
      setDailyKpisData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(requestedDate);
  }, [requestedDate, selectedCompany]);

  // Summary KPIs calculated strictly from live RPC data
  const summaryKpis = useMemo(() => {
    if (dailyKpisData) {
      return {
        totalOrders: dailyKpisData.ordersCount,
        totalSales: dailyKpisData.salesValue,
        totalCustomers: dailyKpisData.uniqueCustomers,
        activeReps: dailyKpisData.activeSalespeople,
      };
    }
    const totalOrders = rows.reduce((acc, r) => acc + (r.ordersCount || 0), 0);
    const totalSales = rows.reduce((acc, r) => acc + (r.salesValue || 0), 0);
    const totalCustomers = rows.reduce((acc, r) => acc + (r.uniqueCustomers || 0), 0);
    const activeReps = new Set(rows.map(r => r.salesperson)).size;

    return {
      totalOrders,
      totalSales,
      totalCustomers,
      activeReps,
    };
  }, [rows, dailyKpisData]);

  // Filtered & sorted rows
  const processedRows = useMemo(() => {
    let result = [...rows];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.salesperson.toLowerCase().includes(term) ||
          r.companyName.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let valA = a[sortField] ?? 0;
      let valB = b[sortField] ?? 0;

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;

      // Secondary sort: ordersCount desc then salesValue desc
      if (a.ordersCount !== b.ordersCount) {
        return b.ordersCount - a.ordersCount;
      }
      return b.salesValue - a.salesValue;
    });

    return result;
  }, [rows, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleShowLatestDay = () => {
    setRequestedDate('2026-08-03');
    fetchData('2026-08-03');
  };

  const handleRowClick = (row: DailySalesRepPerformanceRow) => {
    setFilters(prev => ({
      ...prev,
      salesRepId: row.salesperson,
      company: (row.companyName !== 'All' ? row.companyName : prev.company) as any,
    }));
    setCurrentView('sales-reps');
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    return `${amount.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header & Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'أداء المندوبين اليومي' : 'Daily Sales Representative Performance'}
            </h3>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              [SECTION STATUS: Live]
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>
              {isAr
                ? 'تقرير المبيعات والطلبات والعملاء النشطين لكل مندوب يومياً'
                : 'Daily sales, orders, and unique customer activity by representative'}
            </span>
            {actualReportDate && (
              <span className="font-semibold text-blue-600 dark:text-blue-400 font-sans">
                • {isAr ? `تاريخ التقرير: ${formatArabicDate(actualReportDate)}` : `Report Date: ${actualReportDate}`}
              </span>
            )}
          </p>
        </div>

        {/* Date & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Company Selector */}
          <div className="relative">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 ltr:pr-7 rtl:pl-7 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">{isAr ? 'جميع الشركات' : 'All Companies'}</option>
              <option value="Horeca Smart">Horeca Smart</option>
              <option value="MAS">MAS</option>
            </select>
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {/* Latest Available Day Button */}
          <button
            onClick={handleShowLatestDay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors"
            title={isAr ? 'عرض بيانات أحدث يوم متاح بالداتا (3 أغسطس 2026)' : 'Show latest available data (3 August 2026)'}
          >
            <RotateCcw className="w-3 h-3 shrink-0" />
            <span>{isAr ? 'عرض آخر يوم متاح' : 'Latest Available Day'}</span>
          </button>
        </div>
      </div>

      {/* Explicit Date Separation Banner when Requested Date differs from Actual Report Date */}
      {isFallbackDate && actualReportDate && (
        <div className="bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-amber-900 dark:text-amber-200 text-xs font-semibold shadow-sm">
          <div className="flex items-start sm:items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="space-y-0.5">
              <div>
                {isAr
                  ? `لا توجد طلبات في التاريخ المطلوب (${formatArabicDate(requestedDate)})، يتم عرض أحدث يوم متاح: ${formatArabicDate(actualReportDate)}`
                  : `No orders found for requested date (${requestedDate}), showing latest available date: ${actualReportDate}`}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300 font-normal">
                {isAr
                  ? `التاريخ المطلوب: ${formatArabicDate(requestedDate)} (${requestedDate}) | تاريخ البيانات المعروضة: ${formatArabicDate(actualReportDate)} (${actualReportDate})`
                  : `Requested Date: ${requestedDate} | Displayed Data Date: ${actualReportDate}`}
              </div>
            </div>
          </div>
          <button
            onClick={handleShowLatestDay}
            className="self-start sm:self-auto shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            {isAr ? 'اعتماد 3 أغسطس 2026' : 'Use 3 Aug 2026'}
          </button>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Orders */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>{isAr ? 'إجمالي الطلبات اليومية' : 'Total Daily Orders'}</span>
            <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {summaryKpis.totalOrders.toLocaleString('ar-EG')}
          </div>
        </div>

        {/* Total Sales */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>{isAr ? 'إجمالي المبيعات اليومية' : 'Total Daily Sales'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono truncate">
            {formatCurrency(summaryKpis.totalSales)}
          </div>
        </div>

        {/* Unique Customers */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>{isAr ? 'العملاء المستقلون اليوم' : 'Unique Daily Customers'}</span>
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {summaryKpis.totalCustomers.toLocaleString('ar-EG')}
          </div>
        </div>

        {/* Active Sales Reps */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>{isAr ? 'المندوبون النشطون اليوم' : 'Active Sales Reps'}</span>
            <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {summaryKpis.activeReps.toLocaleString('ar-EG')}
          </div>
        </div>
      </div>

      {/* Table Search & Toolbar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث باسم المندوب...' : 'Search salesperson...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute ltr:left-2.5 rtl:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {isAr ? `عدد السجلات (شركة-مندوب): ${processedRows.length}` : `Company-Rep Rows: ${processedRows.length}`}
        </div>
      </div>

      {/* Performance Table */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
          {error}
        </div>
      ) : processedRows.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
            {isAr
              ? `لا توجد طلبات في هذا التاريخ (${formatArabicDate(requestedDate)})`
              : `No orders on ${requestedDate}`}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isAr
              ? 'لم يتم إدخال طلبات مؤكدة للمندوبين في اليوم المحدد. يمكنك اختيار تاريخ آخر أو الاستعلام عن أحدث يوم متاح.'
              : 'No confirmed orders recorded for sales reps on this date. Choose another date or view the latest available report day.'}
          </p>
          <button
            onClick={handleShowLatestDay}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'عرض آخر يوم متاح (3 أغسطس 2026)' : 'Show Latest Available Day (3 Aug 2026)'}</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 select-none">
                <th
                  onClick={() => handleSort('ordersRank')}
                  className="p-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{isAr ? 'الترتيب' : 'Rank'}</span>
                    {sortField === 'ordersRank' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </th>
                <th className="p-2.5">{isAr ? 'مندوب المبيعات' : 'Sales Representative'}</th>
                <th className="p-2.5">{isAr ? 'الشركة' : 'Company'}</th>
                <th
                  onClick={() => handleSort('ordersCount')}
                  className="p-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{isAr ? 'الطلبات' : 'Orders'}</span>
                    {sortField === 'ordersCount' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('uniqueCustomers')}
                  className="p-2.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{isAr ? 'العملاء الفريدون' : 'Unique Customers'}</span>
                    {sortField === 'uniqueCustomers' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('salesValue')}
                  className="p-2.5 text-left rtl:text-left ltr:text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{isAr ? 'المبيعات اليومية' : 'Daily Sales'}</span>
                    {sortField === 'salesValue' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('averageOrderValue')}
                  className="p-2.5 text-left rtl:text-left ltr:text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{isAr ? 'متوسط قيمة الطلب' : 'Average Order Value'}</span>
                    {sortField === 'averageOrderValue' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {processedRows.map((row, idx) => (
                <tr
                  key={`${row.salesperson}-${row.companyName}-${idx}`}
                  onClick={() => handleRowClick(row)}
                  className="hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors group"
                  title={isAr ? 'اضغط لعرض ملف المندوب 360' : 'Click to view Sales Rep 360 profile'}
                >
                  <td className="p-2.5 text-center font-bold text-slate-500 font-mono">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-black'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold'
                        : idx === 2
                        ? 'bg-amber-800/10 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400 font-bold'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'
                    }`}>
                      {row.ordersRank || idx + 1}
                    </span>
                  </td>
                  <td className="p-2.5 font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {row.salesperson}
                  </td>
                  <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {row.companyName}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                    {row.ordersCount.toLocaleString('ar-EG')}
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                    {row.uniqueCustomers.toLocaleString('ar-EG')}
                  </td>
                  <td className="p-2.5 text-left rtl:text-left ltr:text-right font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
                    {formatCurrency(row.salesValue)}
                  </td>
                  <td className="p-2.5 text-left rtl:text-left ltr:text-right font-mono font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatCurrency(row.averageOrderValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
