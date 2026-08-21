import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  AlertTriangle,
  RefreshCw,
  ArrowUpDown,
  Building2,
  UserCheck,
  TrendingUp,
  ShoppingCart,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  UserX,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useCustomerDashboard } from '../hooks/useCustomerDashboard';
import { CustomerSummaryResult } from '../analytics/types';
import { Customer360Panel } from '../components/Customer360Panel';
import { analytics } from '../analytics';
import { CustomerStatusOption } from '../analytics/filters';

type SortField =
  | 'salesValue'
  | 'ordersCount'
  | 'lastOrderDate'
  | 'daysSinceLastOrder'
  | 'salesChangePct';

export const CustomerDashboard: React.FC = () => {
  const { language, filters, setFilters } = useApp();
  const isAr = language === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [salespersonFilter, setSalespersonFilter] = useState('All');
  
  const [statusOptions, setStatusOptions] = useState<CustomerStatusOption[]>([]);
  const [loadingStatusOptions, setLoadingStatusOptions] = useState<boolean>(false);

  // Fetch live customer status filter options
  useEffect(() => {
    let isMounted = true;
    async function loadStatusOptions() {
      setLoadingStatusOptions(true);
      try {
        const activeCompany = filters.company !== 'All' ? filters.company : null;
        const activeSalesperson = salespersonFilter !== 'All' ? salespersonFilter : (filters.salespersonName ?? null);
        const res = await analytics.filters.customerStatuses({
          effectiveEndDate: filters.effectiveEndDate,
          companyName: activeCompany,
          salespersonName: activeSalesperson,
        });
        if (isMounted) {
          setStatusOptions(res);
          // Cascading reset: if statusFilter is selected but no longer returned, reset to 'All'
          if (statusFilter !== 'All' && statusFilter !== null) {
            if (!res.some(s => s.statusCode === statusFilter)) {
              setStatusFilter('All');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching status filter options in CustomerDashboard:', err);
      } finally {
        if (isMounted) setLoadingStatusOptions(false);
      }
    }
    loadStatusOptions();
    return () => { isMounted = false; };
  }, [filters.effectiveEndDate, filters.company, salespersonFilter, filters.salespersonName]);
  
  const [sortField, setSortField] = useState<SortField>('salesValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');

  // Memoize effective filters and dashboard options to ensure stable references
  const effectiveCustomerFilters = useMemo(() => ({
    ...filters,
    salesRepId: salespersonFilter === 'All' ? filters.salesRepId : salespersonFilter,
  }), [filters, salespersonFilter]);

  const customerDashboardOptions = useMemo(() => ({
    status: statusFilter,
    search: searchTerm,
    limit: 1000,
  }), [statusFilter, searchTerm]);

  // Call live custom hook backed by analytics.customers.summary RPC
  const { data, loading, error, refetch } = useCustomerDashboard(
    effectiveCustomerFilters,
    customerDashboardOptions
  );

  // Derive top KPIs strictly from returned live customer summary rows
  const kpis = useMemo(() => {
    const totalCount = data.length;
    const totalSales = data.reduce((acc, c) => acc + c.salesValue, 0);
    const totalOrders = data.reduce((acc, c) => acc + c.ordersCount, 0);
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const activeCount = data.filter(c => c.customerStatus === 'ACTIVE').length;
    const atRiskCount = data.filter(c => c.customerStatus === 'AT_RISK').length;
    const sleepingCount = data.filter(c => c.customerStatus === 'SLEEPING').length;
    const lostCount = data.filter(c => c.customerStatus === 'LOST').length;
    const newCount = data.filter(c => c.customerStatus === 'NEW').length;

    return {
      totalCount,
      totalSales,
      totalOrders,
      avgOrderValue,
      activeCount,
      atRiskCount,
      sleepingCount,
      lostCount,
      newCount,
    };
  }, [data]);

  // Extract unique salespeople for dropdown filter
  const availableSalespeople = useMemo(() => {
    const set = new Set<string>();
    data.forEach(c => {
      if (c.primarySalesperson) set.add(c.primarySalesperson);
    });
    return Array.from(set).sort();
  }, [data]);

  // Sorting logic
  const sortedData = useMemo(() => {
    const list = [...data];
    list.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal === null || aVal === undefined) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [data, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatEgp = (val: number) => {
    return val.toLocaleString('ar-EG', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }) + ' ج.م';
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">نشط</span>;
      case 'AT_RISK':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">معرض للخطر</span>;
      case 'SLEEPING':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">نائم</span>;
      case 'LOST':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700">مفقود</span>;
      case 'NEW':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300 dark:border-blue-700">جديد</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md font-mono text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                [SECTION STATUS: Live]
              </span>
              <span className="text-xs text-slate-500 font-mono">analytics_customer_summary</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {isAr ? 'حافظة وشاشة تحليلات العملاء المباشرة' : 'Live Customer Portfolio Dashboard'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isAr
                ? 'استعراض البيانات المباشرة من Supabase ومتابعة حالة العملاء، المبيعات، متوسط قيمة الطلبيات وتفاصيل Customer 360'
                : 'Real-time customer portfolio analytics backed by Supabase live RPC semantic views'}
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isAr ? 'تحديث البيانات' : 'Refresh'}</span>
          </button>
        </div>

        {/* Global & Local Controls Toolbar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isAr ? 'بحث اسم العميل أو المندوب...' : 'Search customer or salesperson...'}
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 font-semibold"
            />
          </div>

          {/* Company Filter */}
          <select
            value={filters.company}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, company: e.target.value as any }));
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="All">{isAr ? 'الشركة: الكل (All)' : 'Company: All'}</option>
            <option value="MAS">{isAr ? 'MAS (ماس)' : 'MAS'}</option>
            <option value="Horeca Smart">{isAr ? 'Horeca Smart (هوريكا سمارت)' : 'Horeca Smart'}</option>
          </select>

          {/* Customer Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            disabled={loadingStatusOptions}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="All">
              {loadingStatusOptions
                ? (isAr ? 'جاري التحميل...' : 'Loading...')
                : (isAr ? 'حالة العميل: الكل' : 'Status: All')}
            </option>
            {statusOptions.map((s) => (
              <option key={`cust-status-${s.statusCode}`} value={s.statusCode}>
                {s.statusLabelAr} ({s.customersCount})
              </option>
            ))}
          </select>

          {/* Salesperson Filter */}
          <select
            value={salespersonFilter}
            onChange={(e) => {
              setSalespersonFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="All">{isAr ? 'المندوب: الكل (Salesperson: All)' : 'Salesperson: All'}</option>
            {availableSalespeople.map((sp, idx) => (
              <option key={`${sp}_${idx}`} value={sp}>{sp}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Top KPIs Grid (Calculated strictly from live customer summary RPC rows) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Total Customers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block">{isAr ? 'عدد العملاء' : 'Returned Customers'}</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white block">
            {kpis.totalCount.toLocaleString('ar-EG')}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">في الفترة المحددة</span>
        </div>

        {/* Total Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block">{isAr ? 'إجمالي المبيعات' : 'Total Sales'}</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block truncate">
            {formatEgp(kpis.totalSales)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">{kpis.totalOrders.toLocaleString('ar-EG')} طلبات</span>
        </div>

        {/* Average Order Value */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block">{isAr ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block truncate">
            {formatEgp(kpis.avgOrderValue)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">لكل طلب منجَز</span>
        </div>

        {/* Active Customers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block">{isAr ? 'العملاء النشطون' : 'Active Customers'}</span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 block">
            {kpis.activeCount.toLocaleString('ar-EG')}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold block">ACTIVE</span>
        </div>

        {/* At-Risk / Sleeping / Lost Breakdowns */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block">{isAr ? 'توزيع باقي الحالات' : 'At-Risk / Sleeping'}</span>
          <div className="flex items-center gap-2 text-xs font-black pt-1">
            <span className="text-amber-600" title="معرض للخطر">{kpis.atRiskCount} خطر</span>
            <span>•</span>
            <span className="text-indigo-600" title="نائم">{kpis.sleepingCount} نائم</span>
            <span>•</span>
            <span className="text-rose-600" title="مفقود">{kpis.lostCount} مفقود</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">+ {kpis.newCount} جديد</span>
        </div>

      </div>

      {/* Error State Banner */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3 text-rose-800 dark:text-rose-300 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{isAr ? 'خطأ في جلب بيانات العملاء من Supabase RPC' : 'RPC execution error while fetching customers'}</span>
          </div>
          <div className="text-xs font-mono text-rose-900 dark:text-rose-200 bg-rose-100/60 dark:bg-rose-900/40 p-3 rounded-xl">
            <code>{error}</code>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors"
          >
            {isAr ? 'إعادة المحاولة (Retry RPC)' : 'Retry'}
          </button>
        </div>
      )}

      {/* Customer Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-3 p-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {isAr ? 'جدول سجلات العملاء المباشرة' : 'Live Customer Roster'}
            </h3>
          </div>
          <div className="text-xs font-mono text-slate-500">
            {isAr ? `إجمالي السجلات: ${data.length}` : `Total Rows: ${data.length}`}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'جاري تنفيذ استعلام العملاء اللحظي من Supabase...' : 'Executing live RPC query...'}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <Users className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'لا توجد نتائج للعملاء مطابقة لمعايير الفلترة المحددة' : 'No customer records match the criteria'}
            </p>
            <p className="text-xs text-slate-500">جرب تغيير الفترة الزمنية أو نص البحث أو تصفية الحالة</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{isAr ? 'اسم العميل / ID' : 'Customer Name'}</th>
                    <th className="p-3">{isAr ? 'الشركة' : 'Company'}</th>
                    <th className="p-3">{isAr ? 'المندوب الأساسي' : 'Salesperson'}</th>
                    
                    <th className="p-3 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('ordersCount')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>{isAr ? 'الطلبيات' : 'Orders'}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>

                    <th className="p-3 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('salesValue')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>{isAr ? 'المبيعات' : 'Sales'}</span>
                        <ArrowUpDown className="w-3 h-3 text-blue-600" />
                      </div>
                    </th>

                    <th className="p-3">{isAr ? 'متوسط الطلب' : 'Avg Order'}</th>
                    <th className="p-3">{isAr ? 'أول طلب بالفترة' : 'First Order'}</th>

                    <th className="p-3 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('lastOrderDate')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>{isAr ? 'آخر طلب' : 'Last Order'}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>

                    <th className="p-3 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('daysSinceLastOrder')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>{isAr ? 'أيام الانقطاع' : 'Days Silent'}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>

                    <th className="p-3">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-3">{isAr ? 'مبيعات الفترة السابقة' : 'Prev Sales'}</th>

                    <th className="p-3 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('salesChangePct')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>{isAr ? 'التغير %' : 'Change %'}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedData.map((c, idx) => (
                    <tr
                      key={`${c.customerId}_${c.companyName}_${idx}`}
                      onClick={() => {
                        setSelectedCustomerId(c.customerId);
                        setSelectedCustomerName(c.customerName);
                      }}
                      className="hover:bg-blue-50/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                          {c.customerName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">#{c.customerId}</div>
                      </td>

                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {c.companyName}
                      </td>

                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {c.primarySalesperson || 'غير محدد'}
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {c.ordersCount}
                      </td>

                      <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {formatEgp(c.salesValue)}
                      </td>

                      <td className="p-3 font-mono text-slate-800 dark:text-slate-200">
                        {formatEgp(c.averageOrderValue)}
                      </td>

                      <td className="p-3 font-mono text-slate-500 text-[11px]">
                        {c.firstOrderDate || '-'}
                      </td>

                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                        {c.lastOrderDate || '-'}
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {c.daysSinceLastOrder} يوم
                      </td>

                      <td className="p-3">
                        {renderStatusBadge(c.customerStatus)}
                      </td>

                      <td className="p-3 font-mono text-slate-500">
                        {c.previousPeriodSales > 0 ? formatEgp(c.previousPeriodSales) : '0 ج.م'}
                      </td>

                      <td className="p-3 font-mono font-bold">
                        {c.salesChangePct != null ? (
                          <span className={c.salesChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {c.salesChangePct >= 0 ? '+' : ''}{c.salesChangePct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                عرض الصفوف من {(currentPage - 1) * pageSize + 1} إلى {Math.min(currentPage * pageSize, sortedData.length)} من أصل {sortedData.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono px-2">
                  {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Customer 360 Detail Modal */}
      {selectedCustomerId && (
        <Customer360Panel
          customerId={selectedCustomerId}
          customerName={selectedCustomerName}
          filters={filters}
          onClose={() => setSelectedCustomerId(null)}
          language={language}
        />
      )}

    </div>
  );
};
