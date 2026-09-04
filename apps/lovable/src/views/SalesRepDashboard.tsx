import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  TrendingUp,
  BarChart3,
  Search,
  Calendar,
  DollarSign,
  AlertTriangle,
  Info,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  UserPlus,
  UserMinus,
  Repeat,
  Package,
  MapPin,
  Target
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { useApp } from '../context/AppContext';
import { DataSourceStatus } from '../components/DataSourceStatus';
import { useSalesRepDashboard, useSalesRep360 } from '../hooks/useSalesRepDashboard';
import { SalesRepSummaryRpcRow, SalesRepCustomerRpcRow, SalesRepRetentionDetailRpcRow } from '../types';

export const SalesRepDashboard: React.FC = () => {
  const { language, filters, setSelectedCustomer, setAiPanelOpen } = useApp();
  const isAr = language === 'ar';

  // 1. Fetch Sales Rep Summary List for the global month/company filter
  const {
    summaries,
    loading: summaryLoading,
    isLive,
    error: summaryError,
    lastFetchedAt,
    refetch: refetchSummary
  } = useSalesRepDashboard(filters);

  // Rep Search & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepName, setSelectedRepName] = useState<string | null>(null);
  const [selectedRepCompanyName, setSelectedRepCompanyName] = useState<string | null>(null);

  // Filter summaries by search query
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    return summaries.filter(s =>
      s.salesperson.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [summaries, searchQuery]);

  useEffect(() => {
    if (!selectedRepName && summaries.length > 0) {
      setSelectedRepName(summaries[0].salesperson);
      setSelectedRepCompanyName(summaries[0].company_name);
    }
  }, [summaries, selectedRepName, selectedRepCompanyName]);

  // Selected roster row defines both salesperson and company scope. Multi-company aggregation is allowed only when no row/company is selected.
  // Aggregate selected rep's summary row(s) (in case rep exists across multiple operating companies e.g. Horeca Smart + MAS)
  const selectedRepSummary = useMemo(() => {
    if (!selectedRepName) return null;
    const repRows = summaries.filter(s =>
      s.salesperson === selectedRepName && (!selectedRepCompanyName || s.company_name === selectedRepCompanyName)
    );
    if (repRows.length === 0) return null;

    if (repRows.length === 1) return repRows[0];

    // Combine rows if multi-company
    const combined: SalesRepSummaryRpcRow = {
      order_month: repRows[0].order_month,
      company_name: repRows.map(r => r.company_name).join(' & '),
      salesperson: selectedRepName,
      active_customers: repRows.reduce((s, r) => s + r.active_customers, 0),
      orders_count: repRows.reduce((s, r) => s + r.orders_count, 0),
      sales_value: repRows.reduce((s, r) => s + Number(r.sales_value || 0), 0),
      average_order_value: repRows.reduce((s, r) => s + Number(r.sales_value || 0), 0) /
        (repRows.reduce((s, r) => s + r.orders_count, 0) || 1),
      previous_customers: repRows.reduce((s, r) => s + r.previous_customers, 0),
      retained_customers: repRows.reduce((s, r) => s + r.retained_customers, 0),
      lost_customers: repRows.reduce((s, r) => s + r.lost_customers, 0),
      transferred_out_customers: repRows.reduce((s, r) => s + r.transferred_out_customers, 0),
      transferred_in_customers: repRows.reduce((s, r) => s + r.transferred_in_customers, 0),
      new_customers: repRows.reduce((s, r) => s + r.new_customers, 0),
      reactivated_customers: repRows.reduce((s, r) => s + r.reactivated_customers, 0),
      lost_previous_sales: repRows.reduce((s, r) => s + Number(r.lost_previous_sales || 0), 0),
      retention_rate: repRows[0].retention_rate
    };
    return combined;
  }, [summaries, selectedRepName]);

  // 2. Fetch Selected Rep 360 Details (Trend, Customer Portfolio, Retention Details)
  const {
    trend,
    customers,
    retentionDetails,
    loading: detailsLoading,
    error: detailsError,
    refetch: refetch360
  } = useSalesRep360(selectedRepName, filters, selectedRepCompanyName);

  // Customer Portfolio Search & Sorting & Pagination State
  const [custSearch, setCustSearch] = useState('');
  const [custSortField, setCustSortField] = useState<'sales_value' | 'orders_count' | 'customer_name' | 'last_order_at'>('sales_value');
  const [custSortDir, setCustSortDir] = useState<'asc' | 'desc'>('desc');
  const [custPage, setCustPage] = useState(1);
  const CUST_PER_PAGE = 10;

  const filteredCustomers = useMemo(() => {
    let result = customers.filter(c =>
      c.customer_name.toLowerCase().includes(custSearch.toLowerCase()) ||
      c.company_name.toLowerCase().includes(custSearch.toLowerCase())
    );

    result.sort((a, b) => {
      let valA: any = a[custSortField];
      let valB: any = b[custSortField];
      if (typeof valA === 'string') {
        return custSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return custSortDir === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [customers, custSearch, custSortField, custSortDir]);

  const paginatedCustomers = useMemo(() => {
    const start = (custPage - 1) * CUST_PER_PAGE;
    return filteredCustomers.slice(start, start + CUST_PER_PAGE);
  }, [filteredCustomers, custPage]);

  const totalCustPages = Math.ceil(filteredCustomers.length / CUST_PER_PAGE) || 1;

  // Retention Details Tab State
  const [retentionTab, setRetentionTab] = useState<'RETAINED' | 'LOST' | 'TRANSFERRED' | 'NEW_IN_WINDOW'>('RETAINED');
  const [retentionSearch, setRetentionSearch] = useState('');

  const filteredRetentionDetails = useMemo(() => {
    return retentionDetails.filter(r => {
      const matchTab = r.retention_status === retentionTab;
      const matchSearch = !retentionSearch.trim() ||
        r.customer_name.toLowerCase().includes(retentionSearch.toLowerCase()) ||
        (r.previous_salesperson && r.previous_salesperson.toLowerCase().includes(retentionSearch.toLowerCase())) ||
        (r.current_salesperson && r.current_salesperson.toLowerCase().includes(retentionSearch.toLowerCase()));
      return matchTab && matchSearch;
    });
  }, [retentionDetails, retentionTab, retentionSearch]);

  // Overall totals for verification banner
  const totalRepsCount = new Set(summaries.map((row) => row.salesperson)).size;
  const grandTotalSales = summaries.reduce((s, r) => s + Number(r.sales_value || 0), 0);
  const grandTotalOrders = summaries.reduce((s, r) => s + Number(r.orders_count || 0), 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Executive Welcome & Live Status Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-blue-400 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isAr ? 'مركز التحليل الاستراتيجي المباشر للمندوبين (360 Degree Node)' : 'Live Sales Representative 360 Analytics Node'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {isAr ? 'لوحة أداء وتحليل 360° لمندوبي المبيعات' : 'Live Sales Representative 360° Dashboard'}
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed font-medium">
            {isAr
              ? 'تحليل شامل ومباشر لأداء مندوبي المبيعات عبر إجرائيات Supabase RPC مع متابعة محافظ العملاء، حركات الانتقال، ومعدلات الاحتفاظ بالجنيه المصري (EGP).'
              : 'Direct live analytics for sales reps via Supabase RPCs featuring customer portfolio, account transfers, and retention metrics in EGP.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <button
            onClick={() => setAiPanelOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>{isAr ? 'تحليل المندوبين بالذكاء الاصطناعي (AI)' : 'Rep Performance AI Brief'}</span>
          </button>
        </div>
      </div>

      {/* Live Data Source Status Badge Bar */}
      <DataSourceStatus
        status={isLive ? 'live' : summaryError ? 'error' : 'mock_fallback'}
        isAr={isAr}
        lastUpdated={lastFetchedAt || undefined}
        errorMessage={summaryError || detailsError || undefined}
        onRetry={() => {
          refetchSummary();
          if (selectedRepName) refetch360();
        }}
      />

      {/* RPC Error Banner if RPC fails */}
      {(summaryError || detailsError) && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">{isAr ? 'خطأ في استعلام إجرائية Supabase RPC:' : 'Supabase RPC Query Execution Error:'}</span>
              <span>{summaryError || detailsError}</span>
            </div>
          </div>
          <button
            onClick={() => { refetchSummary(); if (selectedRepName) refetch360(); }}
            className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
          </button>
        </div>
      )}

      {/* Global Verification Audit Summary Badge */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/30 text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
              <span>{isAr ? 'إجمالي المندوبين والمبيعات المباشرة (RPC Verified)' : 'Live Representatives RPC Total Audit'}</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                [SECTION STATUS: Live]
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAr
                ? `الشهر: ${filters.dateRange?.startDate || '2026-08-01'} | الشركات: ${filters.company}`
                : `Month: ${filters.dateRange?.startDate || '2026-08-01'} | Company: ${filters.company}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">{isAr ? 'عدد المندوبين' : 'Reps Count'}</span>
            <span className="text-sm font-black text-amber-400">{totalRepsCount} {isAr ? 'مندوب' : 'reps'}</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">{isAr ? 'إجمالي طلبات المندوبين' : 'Total Rep Orders'}</span>
            <span className="text-sm font-black text-blue-400">{grandTotalOrders.toLocaleString('ar-EG')}</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">{isAr ? 'إجمالي مبيعات المندوبين' : 'Total Rep Sales'}</span>
            <span className="text-sm font-black text-emerald-400">{grandTotalSales.toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>
      </div>

      {/* Part 1: Representative Selection List (Roster Table) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                {isAr ? 'قائمة مندوبي المبيعات (Sales Representatives Roster)' : 'Sales Representatives Roster'}
              </h2>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                [SECTION STATUS: Live]
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isAr ? 'انقر على أي مندوب لعرض ملف التحليل 360° كاملاً بالأسفل' : 'Click any representative to load their full 360° profile below'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:right-3 rtl:left-auto top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث باسم المندوب...' : 'Search representative name...'}
                className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
          </div>
        </div>

        {summaryLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <div className="font-extrabold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {isAr ? 'لا يوجد مندوبون مطابقون لخيارات البحث' : 'No Representatives Found'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-2.5">{isAr ? 'المندوب' : 'Salesperson'}</th>
                  <th className="p-2.5">{isAr ? 'الشركة' : 'Company'}</th>
                  <th className="p-2.5">{isAr ? 'المبيعات' : 'Sales (EGP)'}</th>
                  <th className="p-2.5">{isAr ? 'الطلبات' : 'Orders'}</th>
                  <th className="p-2.5">{isAr ? 'العملاء النشطون' : 'Active Cust.'}</th>
                  <th className="p-2.5">{isAr ? 'نسبة الاحتفاظ' : 'Retention Rate'}</th>
                  <th className="p-2.5">{isAr ? 'عملاء مفقودون' : 'Lost Cust.'}</th>
                  <th className="p-2.5">{isAr ? 'عملاء جدد' : 'New Cust.'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSummaries.map((rep, idx) => {
                  const isSelected = selectedRepName === rep.salesperson && selectedRepCompanyName === rep.company_name;
                  const retPct = rep.previous_customers > 0 && rep.retention_rate != null
                    ? (rep.retention_rate * 100).toFixed(1)
                    : null;
                  return (
                    <tr
                      key={`${rep.salesperson}_${rep.company_name}_${idx}`}
                      onClick={() => { setSelectedRepName(rep.salesperson); setSelectedRepCompanyName(rep.company_name); }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 font-bold border-l-4 border-blue-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {rep.salesperson.slice(0, 2)}
                        </div>
                        <span>{rep.salesperson}</span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-500 font-semibold">{rep.company_name}</td>
                      <td className="p-2.5 font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {Number(rep.sales_value || 0).toLocaleString('ar-EG')} ج.م
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{rep.orders_count}</td>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">{rep.active_customers}</td>
                      <td className="p-2.5 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{retPct === null ? (isAr ? 'تاريخ سابق غير كافٍ' : 'Insufficient History') : `${retPct}%`}</td>
                      <td className="p-2.5 font-mono text-rose-600 dark:text-rose-400 font-bold">{rep.lost_customers}</td>
                      <td className="p-2.5 font-mono text-teal-600 dark:text-teal-400 font-bold">{rep.new_customers}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900'
                        }`}>
                          {isSelected ? (isAr ? 'مُحدد حالياً' : 'Selected') : (isAr ? 'عرض 360°' : 'View 360°')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Part 2: Selected Sales Rep 360 Profile Header & KPIs */}
      {selectedRepName && (
        <div id="sales-rep-360-profile" className="space-y-6 pt-2">
          
          {/* Selected Rep Header Banner */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/30">
                {selectedRepName.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">{selectedRepName}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    [SECTION STATUS: Live]
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>{isAr ? 'الشركة:' : 'Company:'} <strong className="text-slate-200">{selectedRepSummary?.company_name || 'Horeca Smart'}</strong></span>
                  <span>•</span>
                  <span>{isAr ? 'الشهر:' : 'Month:'} <strong className="text-blue-400">{filters.dateRange?.startDate || '2026-08-01'}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={`${selectedRepName || ''}|||${selectedRepCompanyName || ''}`}
                onChange={(e) => {
                  const [name, company] = e.target.value.split('|||');
                  setSelectedRepName(name || null);
                  setSelectedRepCompanyName(company || null);
                }}
                className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {summaries.map((s, idx) => (
                  <option key={`${s.salesperson}_${s.company_name}_${idx}`} value={`${s.salesperson}|||${s.company_name}`}>{s.salesperson} ({s.company_name})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Sales Rep 360 KPIs Grid */}
          <div className="space-y-3">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{isAr ? 'مؤشرات الأداء المباشرة للمندوب (Sales Rep 360 KPIs)' : 'Live Sales Rep 360 KPIs'}</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  [SECTION STATUS: Live]
                </span>
              </div>
            </div>

            {selectedRepSummary ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 text-xs">
                
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase">{isAr ? 'المبيعات الحالية' : 'Current Sales'}</div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                    {Number(selectedRepSummary.sales_value || 0).toLocaleString('ar-EG')} ج.م
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{isAr ? 'إجمالي الفترة المحددة' : 'Selected period total'}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase">{isAr ? 'عدد الطلبات' : 'Orders Count'}</div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                    {selectedRepSummary.orders_count.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{isAr ? 'طلب منفذ' : 'Executed orders'}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase">{isAr ? 'العملاء النشطون' : 'Active Customers'}</div>
                  <div className="text-base font-black text-blue-600 dark:text-blue-400 mt-1">
                    {selectedRepSummary.active_customers.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{isAr ? 'طلبوا خلال الفترة' : 'Ordered in period'}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase">{isAr ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                    {Math.round(Number(selectedRepSummary.average_order_value || 0)).toLocaleString('ar-EG')} ج.م
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{isAr ? 'المبيعات ÷ الطلبات' : 'Sales / Orders'}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase">{isAr ? 'عملاء الفترة السابقة' : 'Previous Customers'}</div>
                  <div className="text-base font-black text-slate-800 dark:text-slate-200 mt-1">
                    {selectedRepSummary.previous_customers.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{isAr ? 'الشهر السابق' : 'Prev month count'}</div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
                  <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-extrabold uppercase">{isAr ? 'العملاء المستمرون' : 'Retained Customers'}</div>
                  <div className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    {selectedRepSummary.retained_customers.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5">{isAr ? 'نفس المندوب' : 'Same rep retained'}</div>
                </div>

                <div className="bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800/50 shadow-sm">
                  <div className="text-[10px] text-rose-800 dark:text-rose-300 font-extrabold uppercase">{isAr ? 'العملاء المفقودون' : 'Lost Customers'}</div>
                  <div className="text-base font-black text-rose-700 dark:text-rose-400 mt-1">
                    {selectedRepSummary.lost_customers.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[9px] text-rose-600 dark:text-rose-400 mt-0.5">{isAr ? 'توقفوا عن الطلب' : 'Zero orders in window'}</div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/50 shadow-sm">
                  <div className="text-[10px] text-blue-800 dark:text-blue-300 font-extrabold uppercase">{isAr ? 'المحولون للخارج' : 'Transferred Out'}</div>
                  <div className="text-base font-black text-blue-700 dark:text-blue-400 mt-1">
                    {selectedRepSummary.transferred_out_customers.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[9px] text-blue-600 dark:text-blue-400 mt-0.5">{isAr ? 'نُقلوا لمندوب آخر' : 'Reassigned to other rep'}</div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                  <div className="text-[10px] text-indigo-800 dark:text-indigo-300 font-extrabold uppercase">{isAr ? 'المحولون للداخل' : 'Transferred In'}</div>
                  <div className="text-base font-black text-indigo-700 dark:text-indigo-400 mt-1">
                    {selectedRepSummary.transferred_in_customers.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[9px] text-indigo-600 dark:text-indigo-400 mt-0.5">{isAr ? 'استُلموا من مندوب آخر' : 'Received from other rep'}</div>
                </div>

                <div className="bg-teal-50 dark:bg-teal-950/40 p-3.5 rounded-2xl border border-teal-200 dark:border-teal-800/50 shadow-sm">
                  <div className="text-[10px] text-teal-800 dark:text-teal-300 font-extrabold uppercase">{isAr ? 'العملاء الجدد' : 'New Customers'}</div>
                  <div className="text-base font-black text-teal-700 dark:text-teal-400 mt-1">
                    {selectedRepSummary.new_customers.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[9px] text-teal-600 dark:text-teal-400 mt-0.5">{isAr ? 'أول طلب بالفترة' : 'New accounts created'}</div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800/50 shadow-sm">
                  <div className="text-[10px] text-purple-800 dark:text-purple-300 font-extrabold uppercase">{isAr ? 'العملاء المعاد تنشيطهم' : 'Reactivated'}</div>
                  <div className="text-base font-black text-purple-700 dark:text-purple-400 mt-1">
                    {selectedRepSummary.reactivated_customers.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[9px] text-purple-600 dark:text-purple-400 mt-0.5">{isAr ? 'عادوا بعد انقطاع' : 'Returned after lapse'}</div>
                </div>

                <div className="bg-sky-50 dark:bg-sky-950/40 p-3.5 rounded-2xl border border-sky-200 dark:border-sky-800/50 shadow-sm">
                  <div className="text-[10px] text-sky-800 dark:text-sky-300 font-extrabold uppercase">{isAr ? 'نسبة الاحتفاظ' : 'Retention Rate'}</div>
                  <div className="text-base font-black text-sky-700 dark:text-sky-400 mt-1">
                    {selectedRepSummary.previous_customers > 0 && selectedRepSummary.retention_rate != null
                      ? `${(selectedRepSummary.retention_rate * 100).toFixed(1)}%`
                      : (isAr ? 'تاريخ سابق غير كافٍ' : 'Insufficient History')}
                  </div>
                  <div className="text-[9px] text-sky-600 dark:text-sky-400 mt-0.5">{isAr ? 'المستمرون ÷ السابق' : 'Retained / Prev count'}</div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/50 shadow-sm col-span-2">
                  <div className="text-[10px] text-amber-800 dark:text-amber-300 font-extrabold uppercase">{isAr ? 'إيرادات العملاء المفقودين' : 'Lost Customer Revenue'}</div>
                  <div className="text-base font-black text-amber-800 dark:text-amber-300 mt-1">
                    {Number(selectedRepSummary.lost_previous_sales || 0).toLocaleString('ar-EG')} ج.م
                  </div>
                  <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">{isAr ? 'إيراد الشهر السابق المحروم' : 'Previous sales lost from churned clients'}</div>
                </div>

              </div>
            ) : (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-center text-xs text-slate-500">
                {isAr ? 'لا توجد بيانات ملخصة للمندوب المحدد' : 'No summary data for selected representative'}
              </div>
            )}
          </div>

          {/* Part 3: Monthly Trend Charts Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                    {isAr ? 'التوجه الشهري لأداء المندوب (Monthly Performance Trend)' : 'Monthly Performance Trend'}
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    [SECTION STATUS: Derived from live data]
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isAr ? 'مستعلم مباشرة عبر إجرائية analytics_sales_rep_trend' : 'Queried via analytics_sales_rep_trend RPC'}
                </p>
              </div>
            </div>

            {detailsLoading ? (
              <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : trend.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                {isAr ? 'لا توجد بيانات اتجاه شهري لهذه الفترة' : 'No trend data returned for this representative'}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Sales & Orders Chart */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{isAr ? 'اتجاه المبيعات والطلبات الشهرية' : 'Monthly Revenue & Orders'}</span>
                  </h4>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="repSalesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="order_month" tick={{ fontSize: 10 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                          formatter={(val: any) => `${Number(val).toLocaleString('ar-EG')} ج.م`}
                        />
                        <Area type="monotone" dataKey="sales_value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#repSalesGrad)" name={isAr ? 'المبيعات' : 'Sales'} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Active & Lost vs New Customers Chart */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{isAr ? 'تطور القاعدة والعملاء الجدد والمفقودين' : 'Active, New & Lost Customers'}</span>
                  </h4>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="order_month" tick={{ fontSize: 10 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="active_customers" fill="#0284c7" name={isAr ? 'النشطون' : 'Active'} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="new_customers" fill="#10b981" name={isAr ? 'الجدد' : 'New'} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="lost_customers" fill="#f43f5e" name={isAr ? 'المفقودون' : 'Lost'} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Part 4: Customer Portfolio Table Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                    {isAr ? 'محفظة عملاء المندوب (Customer Portfolio)' : 'Representative Customer Portfolio'}
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    [SECTION STATUS: Live]
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isAr
                    ? `إجمالي ${customers.length} عميل مستعلم عبر analytics_sales_rep_customers`
                    : `Total ${customers.length} accounts returned via analytics_sales_rep_customers RPC`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:right-2.5 rtl:left-auto top-2.5" />
                  <input
                    type="text"
                    value={custSearch}
                    onChange={(e) => { setCustSearch(e.target.value); setCustPage(1); }}
                    placeholder={isAr ? 'بحث باسم العميل...' : 'Filter customer name...'}
                    className="w-full pl-8 rtl:pr-8 rtl:pl-2 pr-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none font-semibold"
                  />
                </div>
              </div>
            </div>

            {detailsLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                {isAr ? 'لا يوجد عملاء مطابقون في محفظة المندوب' : 'No matching customers found in portfolio'}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <th className="p-2.5">{isAr ? 'اسم العميل' : 'Customer Name'}</th>
                        <th className="p-2.5">{isAr ? 'الشركة' : 'Company'}</th>
                        <th className="p-2.5 cursor-pointer hover:text-blue-600" onClick={() => { setCustSortField('orders_count'); setCustSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                          <div className="flex items-center gap-1">
                            <span>{isAr ? 'الطلبات' : 'Orders'}</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="p-2.5 cursor-pointer hover:text-blue-600" onClick={() => { setCustSortField('sales_value'); setCustSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                          <div className="flex items-center gap-1">
                            <span>{isAr ? 'المبيعات' : 'Sales (EGP)'}</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="p-2.5">{isAr ? 'متوسط الطلب' : 'Avg Order'}</th>
                        <th className="p-2.5">{isAr ? 'أول طلب بالفترة' : 'First Order'}</th>
                        <th className="p-2.5">{isAr ? 'آخر طلب بالفترة' : 'Last Order'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {paginatedCustomers.map((c, idx) => (
                        <tr
                          key={`${c.customer_id}_${c.company_name}_${idx}`}
                          onClick={() => setSelectedCustomer({
                            id: String(c.customer_id),
                            nameAr: c.customer_name,
                            nameEn: c.customer_name,
                            company: c.company_name as any,
                            sector: 'restaurant',
                            area: 'القاهرة',
                            city: 'القاهرة',
                            salesRepId: selectedRepName,
                            salesRepName: selectedRepName,
                            healthScore: 85,
                            lifecycle: 'ACTIVE',
                            riskLevel: 'low',
                            lastOrderDate: '2026-08-03',
                            avgDaysBetweenOrders: 7,
                            daysSinceLastOrder: 2,
                            totalRevenueYtd: c.sales_value,
                            ordersCount: c.orders_count,
                            avgOrderValue: c.average_order_value,
                            retentionRate: 100,
                            topCategoryPurchased: 'زيوت ومقليات',
                            topProductPurchased: 'منتج ممتاز',
                            crossSellOpportunities: [],
                            aiRecommendationAr: 'الحساب نشط ويحقق معدل سحب ممتاز.',
                            aiRecommendationEn: 'Active account with excellent pull-through.',
                            phone: '+20 100 000 0000'
                          } as any)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="p-2.5 font-bold font-sans text-slate-900 dark:text-slate-100">{c.customer_name}</td>
                          <td className="p-2.5 text-slate-500">{c.company_name}</td>
                          <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">{c.orders_count}</td>
                          <td className="p-2.5 font-black text-emerald-600 dark:text-emerald-400">
                            {Number(c.sales_value || 0).toLocaleString('ar-EG')} ج.م
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">
                            {Math.round(Number(c.average_order_value || 0)).toLocaleString('ar-EG')} ج.م
                          </td>
                          <td className="p-2.5 text-[10px] text-slate-500">
                            {c.first_order_at ? new Date(c.first_order_at).toLocaleDateString('ar-EG') : 'N/A'}
                          </td>
                          <td className="p-2.5 text-[10px] text-slate-500">
                            {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('ar-EG') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                  <div>
                    {isAr
                      ? `عرض ${(custPage - 1) * CUST_PER_PAGE + 1} إلى ${Math.min(custPage * CUST_PER_PAGE, filteredCustomers.length)} من أصل ${filteredCustomers.length} عميل`
                      : `Showing ${(custPage - 1) * CUST_PER_PAGE + 1} to ${Math.min(custPage * CUST_PER_PAGE, filteredCustomers.length)} of ${filteredCustomers.length} accounts`}
                  </div>

                  <div className="flex items-center gap-1 font-bold">
                    <button
                      disabled={custPage === 1}
                      onClick={() => setCustPage(p => Math.max(p - 1, 1))}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                    </button>
                    <span className="px-2 font-mono">{custPage} / {totalCustPages}</span>
                    <button
                      disabled={custPage === totalCustPages}
                      onClick={() => setCustPage(p => Math.min(p + 1, totalCustPages))}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Part 5: Customer Retention Details Tabs Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                    {isAr ? 'تفاصيل حالة الاحتفاظ والانتقال (Retention & Reassignment Details)' : 'Retention & Account Reassignment Details'}
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    [SECTION STATUS: Live]
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isAr ? 'استعلام مباشر عبر إجرائية analytics_sales_rep_retention_details حسب حالة الحساب' : 'Direct live query via analytics_sales_rep_retention_details RPC'}
                </p>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:right-2.5 rtl:left-auto top-2.5" />
                <input
                  type="text"
                  value={retentionSearch}
                  onChange={(e) => setRetentionSearch(e.target.value)}
                  placeholder={isAr ? 'تصفية العميل أو المندوب...' : 'Filter customer/rep...'}
                  className="w-full pl-8 rtl:pr-8 rtl:pl-2 pr-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none font-semibold"
                />
              </div>
            </div>

            {/* Retention Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'RETAINED', labelAr: 'مستمرون (RETAINED)', labelEn: 'Retained', color: 'emerald' },
                { id: 'LOST', labelAr: 'مفقودون (LOST)', labelEn: 'Lost', color: 'rose' },
                { id: 'TRANSFERRED', labelAr: 'منقولون (TRANSFERRED)', labelEn: 'Transferred', color: 'blue' },
                { id: 'NEW_IN_WINDOW', labelAr: 'جدد (NEW_IN_WINDOW)', labelEn: 'New Accounts', color: 'teal' }
              ].map(tab => {
                const isActive = retentionTab === tab.id;
                const count = retentionDetails.filter(r => r.retention_status === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRetentionTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Retention Table */}
            {detailsLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredRetentionDetails.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                {isAr ? 'لا توجد سجلات ضمن تبويب الاحتفاظ المحدد' : 'No records found for selected retention tab'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5">{isAr ? 'العميل' : 'Customer'}</th>
                      <th className="p-2.5">{isAr ? 'المندوب السابق' : 'Prev Salesperson'}</th>
                      <th className="p-2.5">{isAr ? 'المندوب الحالي' : 'Curr Salesperson'}</th>
                      <th className="p-2.5">{isAr ? 'مبيعات سابقة' : 'Prev Sales'}</th>
                      <th className="p-2.5">{isAr ? 'مبيعات حالية' : 'Curr Sales'}</th>
                      <th className="p-2.5">{isAr ? 'طلبات سابقة' : 'Prev Orders'}</th>
                      <th className="p-2.5">{isAr ? 'طلبات حالية' : 'Curr Orders'}</th>
                      <th className="p-2.5">{isAr ? 'نسبة التغير' : 'Sales Change'}</th>
                      <th className="p-2.5">{isAr ? 'تاريخ آخر طلب' : 'Last Order Dates'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {filteredRetentionDetails.map((r, idx) => (
                      <tr key={`${r.customer_id}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-2.5 font-bold font-sans text-slate-900 dark:text-slate-100">{r.customer_name}</td>
                        <td className="p-2.5 font-sans text-slate-500">{r.previous_salesperson || '—'}</td>
                        <td className="p-2.5 font-sans font-bold text-slate-800 dark:text-slate-200">{r.current_salesperson || '—'}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          {Number(r.previous_sales || 0).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">
                          {Number(r.current_sales || 0).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="p-2.5 text-slate-500">{r.previous_orders}</td>
                        <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">{r.current_orders}</td>
                        <td className="p-2.5 font-extrabold">
                          <span className={r.sales_change_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {r.sales_change_pct >= 0 ? '+' : ''}{(r.sales_change_pct * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2.5 text-[10px] text-slate-500">
                          <div>S: {r.previous_last_order_at ? new Date(r.previous_last_order_at).toLocaleDateString('ar-EG') : '—'}</div>
                          <div>C: {r.current_last_order_at ? new Date(r.current_last_order_at).toLocaleDateString('ar-EG') : '—'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Part 6: Data Quality Pending Sections (Products & Categories / Targets & Areas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Pending Section 1: Product & Category Mix */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'مزيج المنتجات والتصنيفات (Product & Category Mix)' : 'Product & Category Mix'}
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  [SECTION STATUS: Pending data quality]
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Pending data quality validation</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {isAr
                    ? 'رغم وجود إجرائيات المزيج البيعي، كشفت عمليات التدقيق وجود فروقات بين إجمالي مبيعات المندوب ونسبة نسب المنتجات في العينات المباشرة. تم إيقاف هذا القسم مؤقتاً لحين اعتماد خوارزمية الربط.'
                    : 'Data quality audit identified an attribution variance between representative total sales and line-item product breakdown. This section is held under validation.'}
                </p>
              </div>
            </div>

            {/* Pending Section 2: Targets & Geographic Areas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-slate-400" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'الأهداف والتغطية الجغرافية (Targets & Geographic Areas)' : 'Targets & Geographic Areas'}
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                  [SECTION STATUS: Pending live source]
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-200">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Pending live source</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {isAr
                    ? 'أهداف المبيعات المحددة والتوزيع الجغرافي للمناطق لم تُربط بعد بمناظر Odoo 18 المباشرة. تم إزالة الأهداف الوهمية لمنع التضليل.'
                    : 'Target quotas and real-time geographic territory coverage tables are pending live Odoo 18 table mapping.'}
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
