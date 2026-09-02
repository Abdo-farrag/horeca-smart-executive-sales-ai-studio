import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Calendar,
  Database,
  ExternalLink,
  Info,
  MapPin,
  Package,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DataSourceStatus } from '../components/DataSourceStatus';
import { DailySalesRepPerformance } from '../components/DailySalesRepPerformance';
import { KpiCard } from '../components/KpiCard';
import { useApp } from '../context/AppContext';
import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard';

export const ExecutiveDashboard: React.FC = () => {
  const {
    language,
    filters,
    setAiPanelOpen,
    setSelectedCustomer,
    setSelectedRep,
    setCurrentView,
  } = useApp();
  const isAr = language === 'ar';
  const { data: execData, loading, status, refetch, error, lastFetchedAt } = useExecutiveDashboard(filters);
  const [repSearch, setRepSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const repsToDisplay = useMemo(
    () =>
      execData.topSalesReps.filter((rep) => {
        const value = isAr ? rep.nameAr : rep.nameEn;
        return value.toLowerCase().includes(repSearch.trim().toLowerCase());
      }),
    [execData.topSalesReps, isAr, repSearch],
  );

  const custsToDisplay = useMemo(
    () =>
      execData.topCustomers.filter((customer) => {
        const value = isAr ? customer.nameAr : customer.nameEn;
        return value.toLowerCase().includes(customerSearch.trim().toLowerCase());
      }),
    [execData.topCustomers, isAr, customerSearch],
  );

  const companyPieData = execData.salesByCompany.map((company, index) => ({
    name: company.company,
    value: company.revenue,
    color: index === 0 ? '#2563eb' : '#0284c7',
  }));

  const money = (value: number) => `${value.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م`;

  const header = (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-blue-400 mb-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${status === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>{isAr ? 'المركز الإستراتيجي للمبيعات' : 'Executive Sales Control'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {isAr ? 'ماذا يحدث في الأعمال اليوم؟' : 'What is happening in the business today?'}
        </h1>
        <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed font-medium">
          {isAr
            ? 'المؤشرات التجارية في هذه الشاشة تُعرض فقط عند نجاح مصدر Analytics الموثق للنطاق المحدد.'
            : 'Commercial metrics on this screen are shown only when the verified Analytics source succeeds for the selected scope.'}
        </p>
      </div>
      <button
        onClick={() => setAiPanelOpen(true)}
        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
      >
        <Sparkles className="w-4 h-4 text-blue-200" />
        <span>{isAr ? 'التقرير التوجيهي اليومي (AI)' : 'Daily Executive AI Brief'}</span>
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-200">
        {header}
        <DataSourceStatus status={status} isAr={isAr} lastUpdated={lastFetchedAt} errorMessage={error} onRetry={refetch} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!execData.isLiveSupabaseData) {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-200">
        {header}
        <DataSourceStatus status={status} isAr={isAr} lastUpdated={lastFetchedAt} errorMessage={error} onRetry={refetch} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-black">{isAr ? 'البيانات التجارية غير متاحة حاليًا' : 'Commercial data is currently unavailable'}</h2>
              <p className="mt-1 text-sm opacity-80">
                {error || (isAr ? 'لم يتم إرجاع بيانات موثقة للنطاق المحدد.' : 'No verified data was returned for the selected scope.')}
              </p>
              <p className="mt-2 text-xs opacity-70">
                {isAr ? 'لن يتم عرض أرقام بديلة أو بيانات تجريبية داخل اللوحة التنفيذية.' : 'No substitute or demo commercial values will be displayed in the Executive dashboard.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {header}

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex-1">
          <DataSourceStatus status={status} isAr={isAr} lastUpdated={lastFetchedAt} errorMessage={error} onRetry={refetch} />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between lg:justify-end gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">{isAr ? 'البيانات متاحة حتى:' : 'Data available through:'}</span>
            <strong className="font-mono">{execData.freshnessInfo.maxOrderDate || '—'}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-500">{isAr ? 'آخر مزامنة:' : 'Last sales sync:'}</span>
            <strong className="font-mono">{execData.freshnessInfo.lastSuccessfulSyncAt || '—'}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-500">{isAr ? 'الصفوف المزامنة:' : 'Rows synced:'}</span>
            <strong className="font-mono">{execData.freshnessInfo.rowsSynced > 0 ? execData.freshnessInfo.rowsSynced.toLocaleString('ar-EG') : '—'}</strong>
          </div>
        </div>
      </div>

      <section>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
          <span>{isAr ? 'مؤشرات الأداء التنفيذية (KPIs)' : 'Executive KPIs Overview'}</span>
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            [SECTION STATUS: Derived from live data]
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {execData.kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-base">{isAr ? 'مؤشرات الاحتفاظ بالعملاء وحركة الحسابات' : 'Customer Retention & Account Movement'}</h3>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${execData.retentionMetrics.isLive ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                [SECTION STATUS: {execData.retentionMetrics.isLive ? 'Live' : 'Unavailable'}]
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{isAr ? 'مقياس شهري مقارنة بالفترة السابقة.' : 'Monthly comparison against the previous period.'}</p>
          </div>
          <div className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {execData.retentionMetrics.currentMonth || '—'}
          </div>
        </div>

        {execData.retentionMetrics.isLive ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
            {[
              [isAr ? 'السابقون' : 'Prev Active', execData.retentionMetrics.previousActiveCustomers],
              [isAr ? 'نفس المندوب' : 'Retained', execData.retentionMetrics.retainedWithSameRep],
              [isAr ? 'منقولون' : 'Transferred', execData.retentionMetrics.transferredCustomers],
              [isAr ? 'مفقودون' : 'True Lost', execData.retentionMetrics.trueLostCustomers],
              [isAr ? 'جدد' : 'New', execData.retentionMetrics.newCustomers],
              [isAr ? 'احتفاظ الشركة' : 'Company Retention', `${execData.retentionMetrics.companyRetentionRate.toFixed(1)}%`],
              [isAr ? 'احتفاظ المندوب' : 'Same-Rep Retention', `${execData.retentionMetrics.sameRepRetentionRate.toFixed(1)}%`],
              [isAr ? 'إيراد مفقود' : 'Lost Revenue', money(execData.retentionMetrics.lostCustomerRevenueEgp)],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-500 font-bold uppercase">{label}</div>
                <div className="text-base font-black mt-1">{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-xs text-slate-500 flex gap-2 items-center">
            <Info className="w-4 h-4" />
            <span>{isAr ? 'لا توجد نتيجة احتفاظ موثقة للفترة المحددة.' : 'No verified retention result is available for the selected period.'}</span>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm">{isAr ? 'اتجاه المبيعات والطلبات اليومية' : 'Daily Sales & Orders Trend'}</h3>
              <p className="text-xs text-slate-500">{isAr ? 'حسب الفترة المحددة' : 'Selected date range'}</p>
            </div>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={execData.dailySalesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number | string) => money(Number(value))} />
                <Area type="monotone" dataKey="totalSales" stroke="#2563eb" strokeWidth={3} fill="#2563eb" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-sm">{isAr ? 'توزيع المبيعات حسب الشركة' : 'Sales by Operating Company'}</h3>
          <p className="text-xs text-slate-500 mb-2">Horeca Smart vs MAS</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={companyPieData} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                  {companyPieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number | string) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 text-xs">
            {execData.salesByCompany.map((company) => (
              <div key={company.company} className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <span className="font-bold">{company.company}</span>
                <span className="font-mono">{money(company.revenue)} • {company.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div><h3 className="font-bold text-sm">{isAr ? 'الإيرادات حسب المنطقة الجغرافية' : 'Revenue by Area Territory'}</h3><p className="text-xs text-slate-500">[SECTION STATUS: Pending data quality]</p></div>
            <MapPin className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">{isAr ? 'لن يتم عرض توزيع جغرافي قبل اكتمال حقول المدينة والمنطقة ومطابقتها.' : 'Geographic distribution remains withheld until city and territory fields are sufficiently complete and reconciled.'}</p>
          <button onClick={() => setCurrentView('settings')} className="text-xs font-bold text-blue-600 flex items-center gap-1">{isAr ? 'الإعدادات ← جودة البيانات' : 'Settings → Data Quality'} <ExternalLink className="w-3 h-3" /></button>
        </section>
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div><h3 className="font-bold text-sm">{isAr ? 'مزيج المنتجات والفئات' : 'Products & Categories Mix'}</h3><p className="text-xs text-slate-500">[SECTION STATUS: Pending data quality]</p></div>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">{isAr ? 'لن يتم عرض قيم منتجات أو فئات غير متطابقة مع المبيعات المؤكدة.' : 'Product/category figures remain withheld until attribution reconciles with confirmed sales.'}</p>
          <button onClick={() => setCurrentView('settings')} className="text-xs font-bold text-blue-600 flex items-center gap-1">{isAr ? 'الإعدادات ← جودة البيانات' : 'Settings → Data Quality'} <ExternalLink className="w-3 h-3" /></button>
        </section>
      </div>

      <DailySalesRepPerformance />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div><h3 className="font-black text-base">{isAr ? 'أداء مندوبي المبيعات' : 'Sales Representatives Performance'}</h3><p className="text-xs text-slate-500">[SECTION STATUS: Live]</p></div>
            <input value={repSearch} onChange={(event) => setRepSearch(event.target.value)} placeholder={isAr ? 'فلترة بالاسم...' : 'Filter name...'} className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg" />
          </div>
          {repsToDisplay.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">{isAr ? 'لا توجد بيانات مندوبين لهذه الفترة' : 'No sales representative data found'}</div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-100 dark:bg-slate-800 text-slate-500"><th className="p-2 text-start">{isAr ? 'المندوب' : 'Rep'}</th><th className="p-2">{isAr ? 'الشركة' : 'Company'}</th><th className="p-2">{isAr ? 'العملاء' : 'Customers'}</th><th className="p-2">{isAr ? 'الاحتفاظ' : 'Retention'}</th><th className="p-2">{isAr ? 'الطلبات' : 'Orders'}</th><th className="p-2">{isAr ? 'المبيعات' : 'Sales'}</th></tr></thead><tbody>{repsToDisplay.slice(0, 8).map((rep) => <tr key={rep.id} onClick={() => setSelectedRep(rep)} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"><td className="p-2 font-bold">{isAr ? rep.nameAr : rep.nameEn}</td><td className="p-2 text-center">{rep.company}</td><td className="p-2 text-center">{rep.activeCustomers}</td><td className="p-2 text-center">{rep.retentionRate.toFixed(1)}%</td><td className="p-2 text-center">{rep.recentOrdersCount}</td><td className="p-2 text-end font-black">{money(rep.monthlyAchieved)}</td></tr>)}</tbody></table></div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div><h3 className="font-black text-base">{isAr ? 'أعلى العملاء إيراداً' : 'Top Key Accounts'}</h3><p className="text-xs text-slate-500">[SECTION STATUS: Derived from live data]</p></div>
            <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder={isAr ? 'بحث بالعميل...' : 'Search client...'} className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg" />
          </div>
          {custsToDisplay.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500"><Building2 className="w-6 h-6 mx-auto mb-2" />{isAr ? 'لا توجد بيانات عملاء لهذه الفترة' : 'No customer data found'}</div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-100 dark:bg-slate-800 text-slate-500"><th className="p-2 text-start">{isAr ? 'العميل' : 'Customer'}</th><th className="p-2">{isAr ? 'الشركة' : 'Company'}</th><th className="p-2">{isAr ? 'الطلبات' : 'Orders'}</th><th className="p-2">{isAr ? 'الإيراد' : 'Revenue'}</th><th className="p-2">{isAr ? 'آخر طلب' : 'Last Order'}</th><th className="p-2">{isAr ? 'المندوب' : 'Rep'}</th></tr></thead><tbody>{custsToDisplay.slice(0, 8).map((customer) => <tr key={customer.id} onClick={() => setSelectedCustomer(customer)} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"><td className="p-2 font-bold">{isAr ? customer.nameAr : customer.nameEn}</td><td className="p-2 text-center">{customer.company}</td><td className="p-2 text-center">{customer.ordersCount}</td><td className="p-2 text-end font-black">{money(customer.totalRevenueYtd)}</td><td className="p-2 text-center font-mono">{customer.lastOrderDate || '—'}</td><td className="p-2 text-center">{customer.salesRepName || '—'}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </div>
  );
};
