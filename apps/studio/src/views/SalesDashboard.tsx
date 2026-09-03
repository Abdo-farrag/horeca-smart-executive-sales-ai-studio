import React from 'react';
import { FileSpreadsheet, Target, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { downloadCsv } from '@horeca-smart/core';
import { useApp } from '../context/AppContext';
import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard';
import { DataSourceStatus } from '../components/DataSourceStatus';

export const SalesDashboard: React.FC = () => {
  const { language, filters } = useApp();
  const isAr = language === 'ar';
  const { data, loading, status, error, refetch, lastFetchedAt } = useExecutiveDashboard(filters);

  const handleExport = () => {
    const rows = data.dailySalesTrend.map((row) => ({
      date: row.date,
      sales_egp: row.totalSales,
      orders_count: row.ordersCount,
      horeca_smart_sales_egp: row.horecaSales,
      mas_sales_egp: row.masSales,
      selected_company: filters.companyName || filters.company,
      selected_salesperson: filters.salespersonName || filters.salesperson || '',
      governorate: filters.governorateName || '',
      area: filters.areaName || '',
      customer: filters.customerName || '',
      product: filters.productName || '',
    }));
    downloadCsv(`sales-report-${filters.effectiveStartDate || filters.dateRange.startDate}-${filters.effectiveEndDate || filters.dateRange.endDate}.csv`, rows);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? 'لوحة تحليلات المبيعات والإيرادات' : 'Sales & Revenue Intelligence'}</h1>
          <p className="text-xs text-slate-500 mt-1">{isAr ? 'مبيعات يومية موثقة حسب نفس نطاق وفلاتر الداشبورد التنفيذي' : 'Verified daily sales using the same scope and filters as Executive'}</p>
        </div>
        <button onClick={handleExport} disabled={loading || !data.isLiveSupabaseData || data.dailySalesTrend.length === 0} className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors disabled:opacity-50">
          <FileSpreadsheet className="w-4 h-4" />
          <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
        </button>
      </div>

      <DataSourceStatus status={status} isAr={isAr} lastUpdated={lastFetchedAt} errorMessage={error} onRetry={refetch} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900"><div className="text-xs text-slate-500">{isAr ? 'المبيعات' : 'Sales'}</div><div className="text-xl font-black">{data.totalSales.toLocaleString('ar-EG')} ج.م</div></div>
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900"><div className="text-xs text-slate-500">{isAr ? 'الطلبات' : 'Orders'}</div><div className="text-xl font-black">{data.confirmedOrdersCount.toLocaleString('ar-EG')}</div></div>
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900"><div className="text-xs text-slate-500">{isAr ? 'العملاء النشطون' : 'Active Customers'}</div><div className="text-xl font-black">{data.activeCustomersCount.toLocaleString('ar-EG')}</div></div>
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900"><div className="text-xs text-slate-500">{isAr ? 'متوسط الطلب' : 'AOV'}</div><div className="text-xl font-black">{data.averageOrderValue.toLocaleString('ar-EG')} ج.م</div></div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4"><div><h3 className="font-bold text-sm text-slate-900 dark:text-white">{isAr ? 'اتجاه المبيعات اليومية' : 'Daily Sales Trend'}</h3><p className="text-xs text-slate-500">{isAr ? 'حسب الفترة والفلاتر المحددة' : 'Selected period and active filters'}</p></div><BarChart3 className="w-4 h-4 text-blue-600" /></div>
        <div className="h-72 w-full">
          {data.dailySalesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.dailySalesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, isAr ? 'المبيعات' : 'Sales']} /><Area type="monotone" dataKey="totalSales" stroke="#2563eb" fill="#2563eb22" strokeWidth={3} /></AreaChart></ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-xs text-slate-500">{loading ? (isAr ? 'جاري تحميل البيانات…' : 'Loading…') : (isAr ? 'لا توجد بيانات للفترة المحددة' : 'No data for selected period')}</div>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-amber-600" /><h3 className="font-bold text-sm">{isAr ? 'الطلبات التفصيلية' : 'Order-level details'}</h3></div>
        <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">{isAr ? 'قائمة الطلبات التفصيلية متوقفة مؤقتًا لحين توفير RPC آمن مخصص لها. لن يتم استخدام قراءة مباشرة أو أول 100 صف كبديل.' : 'Order-level list is pending a dedicated secure RPC. No direct table read or first-100-row fallback is used.'}</div>
      </div>
    </div>
  );
};
