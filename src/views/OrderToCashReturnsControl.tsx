import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, FileCheck2, RefreshCw, RotateCcw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../context/AppContext';
import { fetchOrderToCashControlData, type OrderToCashControlData } from '../services/orderToCashService';
import type { OtcDateBasis } from '../analytics/orderToCash';

const money = (value: number) => `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP`;

const KpiCard: React.FC<{ label: string; value: string; note?: string; tone?: 'normal' | 'warn' }> = ({ label, value, note, tone = 'normal' }) => (
  <div className={`rounded-2xl border p-4 shadow-sm ${tone === 'warn' ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">{value}</div>
    {note ? <div className="mt-1 text-[11px] text-slate-500">{note}</div> : null}
  </div>
);

export const OrderToCashReturnsControl: React.FC = () => {
  const { language, filters } = useApp();
  const isAr = language === 'ar';
  const [dateBasis, setDateBasis] = useState<OtcDateBasis>('order_cohort');
  const [data, setData] = useState<OrderToCashControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchOrderToCashControlData(filters, {
      dateBasis,
      trendDateBasis: dateBasis === 'order_cohort' ? 'order' : 'event',
    })
      .then((next) => {
        if (active) setData(next);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [filters, dateBasis, reloadKey]);

  const k = data?.kpis;
  const trend = useMemo(() => data?.trend ?? [], [data]);
  const exceptions = data?.exceptions ?? [];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? 'مراقبة دورة الطلب والمرتجعات' : 'Order-to-Cash & Returns Control'}</h1>
            </div>
            <p className="mt-1 max-w-3xl text-xs text-slate-500">
              {isAr ? 'متابعة مستقلة للطلب، التسليم، المرتجع، الفاتورة والإشعار الدائن دون خلط التواريخ التشغيلية بالمحاسبية.' : 'Reconcile ordered, delivered, returned, invoiced and credited events without mixing operational and accounting dates.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-bold text-slate-500">{isAr ? 'أساس التاريخ' : 'Date Basis'}</label>
            <select value={dateBasis} onChange={(event) => setDateBasis(event.target.value as OtcDateBasis)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-950">
              <option value="order_cohort">{isAr ? 'دفعة الطلبات' : 'Order Cohort'}</option>
              <option value="event">{isAr ? 'تاريخ الحدث' : 'Event Date'}</option>
            </select>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {isAr ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={isAr ? 'قيمة الطلبات' : 'Ordered'} value={money(k?.orderedValue ?? 0)} />
        <KpiCard label="Net Delivered" value={money(k?.netDeliveredValue ?? 0)} note={`${isAr ? 'مرتجعات' : 'Returns'}: ${money(k?.returnedValue ?? 0)}`} />
        <KpiCard label="Net Invoiced" value={money(k?.netInvoicedValue ?? 0)} note={`${isAr ? 'إشعارات دائنة' : 'Credit Notes'}: ${money(k?.creditNoteValue ?? 0)}`} />
        <KpiCard label="Uncredited Returns" value={String(k?.uncreditedReturnsCount ?? 0)} note={money(k?.uncreditedReturnsValue ?? 0)} tone={(k?.uncreditedReturnsCount ?? 0) > 0 ? 'warn' : 'normal'} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label={isAr ? 'فجوة التسليم' : 'Delivery Gap'} value={money(k?.deliveryGapValue ?? 0)} note={isAr ? 'الطلبات ناقص إجمالي التسليم' : 'Ordered minus gross delivered'} />
        <KpiCard label={isAr ? 'فجوة الفوترة' : 'Invoice Gap'} value={money(k?.invoiceGapValue ?? 0)} note={isAr ? 'إجمالي التسليم ناقص إجمالي الفوترة' : 'Gross delivered minus gross invoiced'} />
        <KpiCard label={isAr ? 'معدل المرتجع' : 'Return Rate'} value={`${(k?.returnRatePct ?? 0).toFixed(2)}%`} note={`${isAr ? 'ربط مباشر' : 'Direct link'} ${(k?.directLinkPct ?? 0).toFixed(1)}%`} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'اتجاه دورة الطلب إلى التحصيل' : 'Order-to-Cash Trend'}</h2>
            <p className="mt-1 text-xs text-slate-500">{dateBasis === 'order_cohort' ? (isAr ? 'حسب تاريخ الطلب' : 'Order-date cohort') : (isAr ? 'كل حدث في تاريخه الفعلي' : 'Each event on its own event date')}</p>
          </div>
          <FileCheck2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="h-80">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="periodStart" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: unknown) => money(Number(value ?? 0))} />
                <Line type="monotone" dataKey="orderedValue" name="Ordered" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="netDeliveredValue" name="Net Delivered" stroke="#059669" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="netInvoicedValue" name="Net Invoiced" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">{loading ? (isAr ? 'جاري التحميل…' : 'Loading…') : (isAr ? 'لا توجد بيانات للفترة المحددة' : 'No data for selected period')}</div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'طابور الاستثناءات' : 'Returns & Reconciliation Exception Queue'}</h2>
              <p className="text-xs text-slate-500">{isAr ? 'المرتجعات غير المخصومة، البنود متعددة الربط، والأحداث غير المطابقة.' : 'Uncredited returns, multi-link accounting lines and unmatched events.'}</p>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-500">{exceptions.length} {isAr ? 'حالة' : 'cases'}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <tr><th className="px-3 py-3">Type</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Product</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Value</th><th className="px-3 py-3">Link</th><th className="px-3 py-3">Details</th></tr>
            </thead>
            <tbody>
              {exceptions.map((row) => (
                <tr key={`${row.exceptionType}-${row.sourceEventId}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800/80">
                  <td className="px-3 py-3 font-bold"><span className="inline-flex items-center gap-1">{row.exceptionType === 'UNCREDITED_RETURN' ? <RotateCcw className="h-3.5 w-3.5 text-amber-600" /> : row.value >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" /> : <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />}{row.exceptionType}</span></td>
                  <td className="px-3 py-3">{row.eventDate}</td>
                  <td className="px-3 py-3">#{row.customerId}</td>
                  <td className="px-3 py-3">#{row.productId}</td>
                  <td className="px-3 py-3">{row.qty.toLocaleString()}</td>
                  <td className="px-3 py-3 font-semibold">{money(row.value)}</td>
                  <td className="px-3 py-3">{row.linkConfidence || '—'}</td>
                  <td className="max-w-sm px-3 py-3 text-slate-500">{row.details}</td>
                </tr>
              ))}
              {!loading && exceptions.length === 0 ? <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">{isAr ? 'لا توجد استثناءات في النطاق المحدد' : 'No reconciliation exceptions in the selected scope'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
