import React from 'react';
import { BarChart3, Calendar, Database, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DataSourceStatus } from '../components/DataSourceStatus';
import { useApp } from '../context/AppContext';
import { useExecutiveDashboardP0 } from '../hooks/useExecutiveDashboardP0';

const money = (value: number) => new Intl.NumberFormat('en-EG', { maximumFractionDigits: 0 }).format(value);
const number = (value: number) => new Intl.NumberFormat('en-EG', { maximumFractionDigits: 0 }).format(value);

export const ExecutiveDashboard: React.FC = () => {
  const { language, filters } = useApp();
  const isAr = language === 'ar';
  const { data, loading, error, status, refetch, lastFetchedAt } = useExecutiveDashboardP0(filters);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-300">P0 • Verified commercial data only</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{isAr ? 'لوحة التحكم التنفيذية' : 'Executive Sales Control'}</h1>
            <p className="mt-2 max-w-2xl text-xs text-slate-300">
              {isAr ? 'تعرض هذه الشاشة بيانات Analytics المباشرة فقط. عند تعذر المصدر تتوقف المؤشرات التجارية عن العرض بدل استخدام بيانات تجريبية.' : 'This screen renders verified Analytics data only. If the source is unavailable, commercial metrics fail closed instead of using demo values.'}
            </p>
          </div>
          <DataSourceStatus status={status} isAr={isAr} lastUpdated={lastFetchedAt} errorMessage={error} onRetry={refetch} />
        </div>
      </div>

      {!loading && !data && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-black">{isAr ? 'البيانات التجارية غير متاحة حاليًا' : 'Commercial data is currently unavailable'}</h2>
              <p className="mt-1 text-sm opacity-80">{error || (isAr ? 'لم يتم إرجاع بيانات موثقة للنطاق المحدد.' : 'No verified data was returned for the selected scope.')}</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              [isAr ? 'إجمالي المبيعات' : 'Total Sales', `${money(data.kpis.salesValue)} ج.م`, TrendingUp],
              [isAr ? 'الطلبات المؤكدة' : 'Confirmed Orders', number(data.kpis.ordersCount), BarChart3],
              [isAr ? 'العملاء النشطون' : 'Active Customers', number(data.kpis.activeCustomers), Users],
              [isAr ? 'متوسط قيمة الطلب' : 'Average Order Value', `${money(data.kpis.averageOrderValue)} ج.م`, TrendingUp],
              [isAr ? 'نمو الإيراد' : 'Revenue Growth', `${data.kpis.revenueGrowthPct.toFixed(1)}%`, TrendingUp],
            ].map(([label, value, Icon]: any) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><Icon className="h-4 w-4 text-blue-600" /></div>
                <div className="mt-3 text-xl font-black text-slate-950 dark:text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black">{isAr ? 'اتجاه المبيعات اليومي' : 'Daily Sales Trend'}</h2>
                <span className="text-xs text-slate-500">{data.dailySalesTrend.length} {isAr ? 'يوم' : 'days'}</span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailySalesTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any) => `${money(Number(value))} EGP`} />
                    <Area type="monotone" dataKey="totalSales" stroke="currentColor" fill="currentColor" fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-black">{isAr ? 'سلامة وتغطية البيانات' : 'Data Freshness'}</h2>
              <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-blue-600" /><span className="text-slate-500">{isAr ? 'متاح حتى:' : 'Available through:'}</span><strong>{data.freshness.maxOrderDate || '—'}</strong></div>
              <div className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4 text-emerald-600" /><span className="text-slate-500">{isAr ? 'آخر مزامنة:' : 'Last sync:'}</span><strong className="truncate">{data.freshness.lastSuccessfulSyncAt || '—'}</strong></div>
              <div className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-indigo-600" /><span className="text-slate-500">{isAr ? 'صفوف المزامنة:' : 'Synced rows:'}</span><strong>{data.freshness.rowsSynced == null ? '—' : number(data.freshness.rowsSynced)}</strong></div>
              {data.companyRevenue.map((row) => (
                <div key={row.company} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between text-xs"><span className="font-bold">{row.company}</span><span>{row.percentage.toFixed(1)}%</span></div>
                  <div className="mt-1 text-lg font-black">{money(row.revenue)} ج.م</div>
                </div>
              ))}
            </div>
          </div>

          {data.retention && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 font-black">{isAr ? 'الاحتفاظ وحركة العملاء' : 'Retention & Customer Movement'}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
                {[
                  [isAr ? 'السابقون' : 'Prev Active', data.retention.previousActiveCustomers],
                  [isAr ? 'محتفظ بهم' : 'Retained', data.retention.retainedWithSameRep],
                  [isAr ? 'منتقلون' : 'Transferred', data.retention.transferredCustomers],
                  [isAr ? 'مفقودون' : 'Lost', data.retention.trueLostCustomers],
                  [isAr ? 'جدد' : 'New', data.retention.newCustomers],
                  [isAr ? 'احتفاظ الشركة' : 'Company Retention', `${data.retention.companyRetentionRate.toFixed(1)}%`],
                  [isAr ? 'نفس المندوب' : 'Same Rep', `${data.retention.sameRepRetentionRate.toFixed(1)}%`],
                  [isAr ? 'إيراد مفقود' : 'Lost Revenue', `${money(data.retention.lostCustomerRevenueEgp)} ج.م`],
                ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><div className="text-[10px] font-bold text-slate-500">{label}</div><div className="mt-1 font-black">{value}</div></div>)}
              </div>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 p-4 font-black dark:border-slate-800">{isAr ? 'أعلى مندوبي المبيعات' : 'Top Sales Reps'}</div>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60"><tr><th className="p-3 text-start">{isAr ? 'المندوب' : 'Rep'}</th><th className="p-3 text-end">{isAr ? 'المبيعات' : 'Sales'}</th><th className="p-3 text-end">{isAr ? 'الطلبات' : 'Orders'}</th><th className="p-3 text-end">{isAr ? 'العملاء' : 'Customers'}</th></tr></thead><tbody>{data.topSalesReps.map((row) => <tr key={`${row.companyName}-${row.salesperson}`} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3"><div className="font-bold">{row.salesperson || '—'}</div><div className="text-xs text-slate-500">{row.companyName}</div></td><td className="p-3 text-end font-bold">{money(row.salesValue)}</td><td className="p-3 text-end">{number(row.ordersCount)}</td><td className="p-3 text-end">{number(row.activeCustomers)}</td></tr>)}</tbody></table></div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 p-4 font-black dark:border-slate-800">{isAr ? 'أعلى العملاء' : 'Top Customers'}</div>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60"><tr><th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th><th className="p-3 text-end">{isAr ? 'المبيعات' : 'Sales'}</th><th className="p-3 text-end">{isAr ? 'الطلبات' : 'Orders'}</th><th className="p-3 text-end">{isAr ? 'آخر طلب' : 'Last Order'}</th></tr></thead><tbody>{data.topCustomers.map((row) => <tr key={`${row.companyName}-${row.customerId}`} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3"><div className="font-bold">{row.customerName || '—'}</div><div className="text-xs text-slate-500">{row.primarySalesperson || row.companyName}</div></td><td className="p-3 text-end font-bold">{money(row.salesValue)}</td><td className="p-3 text-end">{number(row.ordersCount)}</td><td className="p-3 text-end text-xs">{row.lastOrderAt || '—'}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
