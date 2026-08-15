import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Building2,
  MapPin,
  Package,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  FileText,
  Search,
  ExternalLink,
  Zap,
  Sparkles,
  BarChart3,
  Calendar,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Info,
  UserCheck,
  UserX,
  UserPlus
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useApp } from '../context/AppContext';
import { KpiCard } from '../components/KpiCard';
import { DataSourceStatus } from '../components/DataSourceStatus';
import { AuditDiagnosticsPanel } from '../components/AuditDiagnosticsPanel';
import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard';
import { DailySalesRepPerformance } from '../components/DailySalesRepPerformance';

export const ExecutiveDashboard: React.FC = () => {
  const {
    language,
    filters,
    kpis: fallbackKpis,
    openDrillDown,
    setSelectedCustomer,
    setSelectedRep,
    setSelectedProduct,
    setAiPanelOpen,
    setCurrentView,
  } = useApp();

  const isAr = language === 'ar';

  // Live Supabase Hook for Executive Dashboard
  const { data: execData, loading, status, refetch, error, lastFetchedAt } = useExecutiveDashboard(filters);

  // Table Search States
  const [repSearch, setRepSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Data selections
  const activeKpis = execData.kpis && execData.kpis.length > 0 ? execData.kpis : fallbackKpis;
  const diag = execData.diagnostics;

  const companyPieData = execData.salesByCompany && execData.salesByCompany.length > 0
    ? execData.salesByCompany.map((c, idx) => ({
        name: c.company,
        value: c.revenue,
        color: idx === 0 ? '#2563eb' : '#0284c7'
      }))
    : [];

  const repsToDisplay = (execData.topSalesReps || []).filter(r =>
    isAr ? r.nameAr.includes(repSearch) : r.nameEn.toLowerCase().includes(repSearch.toLowerCase())
  );

  const custsToDisplay = (execData.topCustomers || []).filter(c =>
    isAr ? c.nameAr.includes(customerSearch) : c.nameEn.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Executive Welcome & Live Status Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-blue-400 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isAr ? 'المركز الإستراتيجي المباشر • تحديث تلقائي' : 'Live Strategic Operations Node • Auto Sync'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {isAr ? 'ماذا يحدث في الأعمال اليوم؟' : 'What is happening in the business today?'}
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed font-medium">
            {isAr
              ? 'مراقبة فورية لمؤشرات الأداء الرئيسية، تدفق الإيرادات اليومية، تغطية المندوبين، وتحليلات مخاطر العميل لقطاع هوريكا وماس بالجنيه المصري.'
              : 'Real-time monitoring of key KPIs, daily revenue flow, rep coverage, and account risk across HORECA & MAS in EGP.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <button
            onClick={() => setAiPanelOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>{isAr ? 'التقرير التوجيهي اليومي (AI)' : 'Daily Executive AI Brief'}</span>
          </button>
        </div>
      </div>

      {/* Live Data Source Status & Data Freshness Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex-1">
          <DataSourceStatus
            status={status}
            isAr={isAr}
            lastUpdated={lastFetchedAt}
            errorMessage={error}
            onRetry={refetch}
          />
        </div>

        {/* Compact Business-Friendly Data Freshness Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between lg:justify-end gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-500">{isAr ? 'البيانات متاحة حتى:' : 'Data available through:'}</span>
            <span className="font-extrabold font-mono text-slate-900 dark:text-white">
              {execData.freshnessInfo?.maxOrderDate || '2026-08-04'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-slate-500">{isAr ? 'آخر مزامنة مبيعات:' : 'Last sales sync:'}</span>
            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
              {execData.freshnessInfo?.lastSuccessfulSyncAt || '2026-08-04 12:00 UTC'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-slate-500">{isAr ? 'الصفوف المزامنة:' : 'Rows synced:'}</span>
            <span className="font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
              {(execData.freshnessInfo?.rowsSynced || 15209).toLocaleString('ar-EG')}
            </span>
          </div>

          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{execData.freshnessInfo?.syncStatus === 'Fresh' ? (isAr ? 'محدث' : 'Fresh') : (isAr ? 'متأخر' : 'Delayed')}</span>
          </span>
        </div>
      </div>

      {/* Optional Audit Diagnostics Panel (enabled via VITE_SHOW_DATA_DIAGNOSTICS=true) */}
      {import.meta.env.VITE_SHOW_DATA_DIAGNOSTICS === 'true' && (
        <AuditDiagnosticsPanel
          diagnostics={diag}
          isAr={isAr}
          lastFetchedAt={lastFetchedAt}
          error={error}
          onRetry={refetch}
        />
      )}

      {/* KPI Cards Grid Section */}
      <div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{isAr ? 'مؤشرات الأداء التنفيذية (KPIs)' : 'Executive KPIs Overview'}</span>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              [SECTION STATUS: {execData.isLiveSupabaseData ? 'Derived from live data' : 'Mock'}]
            </span>
          </div>

          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline">
            {isAr ? 'انقر على أي بطاقة للتفاصيل' : 'Click any card for drill down'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {activeKpis.map(kpi => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        )}
      </div>

      {/* Part 2: Customer Retention Live Analytics Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                {isAr ? 'مؤشرات الاحتفاظ بالعملاء وحركة الحسابات (مقارنة شهرياً)' : 'Live Customer Retention & Account Movement (Monthly Comparison)'}
              </h3>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                [SECTION STATUS: {execData.retentionMetrics?.isLive ? 'Derived from live data' : 'Pending period completion'}]
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isAr
                ? 'استعلام مباشر من منظر customer_retention_odoo18 مقارنة بالشهر السابق (مقياس شهري وليس يومي)'
                : 'Direct live query from customer_retention_odoo18 view vs previous month (monthly metric, not daily)'}
            </p>
          </div>

          <div className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {isAr ? `الشهر المستعلم: ${execData.retentionMetrics?.currentMonth || filters.dateRange?.startDate || '2026-08-01'}` : `Month: ${execData.retentionMetrics?.currentMonth || filters.dateRange?.startDate || '2026-08-01'}`}
          </div>
        </div>

        {/* Notice for Month in Progress (e.g. August MTD) */}
        {(execData.retentionMetrics?.currentMonth?.startsWith('2026-08') || filters.dateRange?.startDate?.startsWith('2026-08')) && (
          <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl p-3 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200 font-medium">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              {isAr
                ? 'معدل الاحتفاظ لشهر أغسطس 2026 قيد التقدم (اكتمال 4 أيام من أصل 31). تعكس مؤشرات الاحتفاظ نشاط كامل الشهر مقارنة بالشهر السابق.'
                : 'August 2026 MTD retention is in progress (4 of 31 days completed). Monthly retention metrics reflect full-month activity.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 font-bold uppercase">{isAr ? 'عملاء الفترة السابقة' : 'Prev Active'}</div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
              {(execData.retentionMetrics?.previousActiveCustomers ?? 0).toLocaleString('ar-EG')}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">{isAr ? 'نشطون بالشهر الماضي' : 'Active in prev month'}</div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
            <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase">{isAr ? 'مستمرون نفس المندوب' : 'Retained (Same Rep)'}</div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">
              {(execData.retentionMetrics?.retainedWithSameRep ?? 0).toLocaleString('ar-EG')}
            </div>
            <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5">{isAr ? 'نفس مندوب المبيعات' : 'Maintained salesperson'}</div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800/50">
            <div className="text-[10px] text-blue-800 dark:text-blue-300 font-bold uppercase">{isAr ? 'منقولون لمندوب آخر' : 'Transferred'}</div>
            <div className="text-lg font-black text-blue-700 dark:text-blue-400 mt-1">
              {(execData.retentionMetrics?.transferredCustomers ?? 0).toLocaleString('ar-EG')}
            </div>
            <div className="text-[9px] text-blue-600 dark:text-blue-400 mt-0.5">{isAr ? 'تحويل الداخلي' : 'Internal rep reassign'}</div>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800/50">
            <div className="text-[10px] text-rose-800 dark:text-rose-300 font-bold uppercase">{isAr ? 'عملاء مفقودون فعلياً' : 'True Lost'}</div>
            <div className="text-lg font-black text-rose-700 dark:text-rose-400 mt-1">
              {(execData.retentionMetrics?.trueLostCustomers ?? 0).toLocaleString('ar-EG')}
            </div>
            <div className="text-[9px] text-rose-600 dark:text-rose-400 mt-0.5">{isAr ? 'لم يطلبوا هذا الشهر' : 'Zero orders in period'}</div>
          </div>

          <div className="bg-teal-50 dark:bg-teal-950/40 p-3 rounded-xl border border-teal-200 dark:border-teal-800/50">
            <div className="text-[10px] text-teal-800 dark:text-teal-300 font-bold uppercase">{isAr ? 'عملاء جدد' : 'New Customers'}</div>
            <div className="text-lg font-black text-teal-700 dark:text-teal-400 mt-1">
              {(execData.retentionMetrics?.newCustomers ?? 0).toLocaleString('ar-EG')}
            </div>
            <div className="text-[9px] text-teal-600 dark:text-teal-400 mt-0.5">{isAr ? 'أول طلب في الفترة' : 'First order in window'}</div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/50">
            <div className="text-[10px] text-indigo-800 dark:text-indigo-300 font-bold uppercase">{isAr ? 'نسبة الاحتفاظ بالشركة' : 'Company Retention'}</div>
            <div className="text-lg font-black text-indigo-700 dark:text-indigo-400 mt-1">
              {execData.retentionMetrics?.companyRetentionRate ?? 0}%
            </div>
            <div className="text-[9px] text-indigo-600 dark:text-indigo-400 mt-0.5">{isAr ? '(المستمرون + المنقولون) ÷ السابق' : '(Retained + Trans) / Prev'}</div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800/50">
            <div className="text-[10px] text-purple-800 dark:text-purple-300 font-bold uppercase">{isAr ? 'نسبة احتفاظ المندوب' : 'Same-Rep Retention'}</div>
            <div className="text-lg font-black text-purple-700 dark:text-purple-400 mt-1">
              {execData.retentionMetrics?.sameRepRetentionRate ?? 0}%
            </div>
            <div className="text-[9px] text-purple-600 dark:text-purple-400 mt-0.5">{isAr ? 'المستمرون بنفس المندوب' : 'Same rep retained / Prev'}</div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50">
            <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold uppercase">{isAr ? 'إيرادات المفقودين' : 'Lost Customer Rev.'}</div>
            <div className="text-sm font-black text-amber-800 dark:text-amber-300 mt-1">
              {(execData.retentionMetrics?.lostCustomerRevenueEgp ?? 0).toLocaleString('ar-EG')} ج.م
            </div>
            <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">{isAr ? 'إيراد الشهر السابق المفقود' : 'Previous month revenue lost'}</div>
          </div>
        </div>
      </div>

      {/* Main Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isAr ? 'اتجاه المبيعات والطلبات اليومية' : 'Daily Sales & Orders Trend'}
                </h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  [SECTION STATUS: {execData.isLiveSupabaseData ? 'Derived from live data' : 'Mock'}]
                </span>
              </div>
              <p className="text-xs text-slate-500">{isAr ? 'حجم التوريد اليومي المعتمد بالجنيه المصري (EGP)' : 'Daily sales fulfillment volume in EGP'}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{isAr ? 'حسب الفترة المحددة' : 'Selected Date Range'}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={execData.dailySalesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, isAr ? 'المبيعات' : 'Sales']}
                />
                <Area type="monotone" dataKey="totalSales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operating Company Distribution Donut Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isAr ? 'توزيع المبيعات حسب الشركة' : 'Sales by Operating Company'}
              </h3>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                [SECTION STATUS: {execData.isLiveSupabaseData ? 'Derived from live data' : 'Mock'}]
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">{isAr ? 'مقارنة حصة هوريكا سمارت مقابل ماس' : 'Horeca Smart vs MAS share'}</p>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={companyPieData}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {companyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    formatter={(val: any) => `${Number(val).toLocaleString('ar-EG')} ج.م`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {companyPieData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold">
                  {item.value.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Pending Data Quality Grid: Regional Revenue & Products/Categories Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales by Area Territory */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isAr ? 'الإيرادات حسب المنطقة الجغرافية' : 'Revenue by Area Territory'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  [SECTION STATUS: Pending data quality]
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr ? 'تغطية المناطق والمدن في سجلات Odoo 18' : 'City and territory coverage in Odoo 18 customer records'}
              </p>
            </div>
            <MapPin className="w-4 h-4 text-slate-400" />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isAr
                    ? 'يتطلب إكمال بيانات مدينة العميل في نظام Odoo قبل تفعيل التحليلات الجغرافية.'
                    : 'Customer city data requires completion in Odoo before geographic analytics can be activated.'}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isAr
                    ? 'حقل المدينة لا يحتوي على قيم كافية لعملاء مبيعات شهر أغسطس الحالي. تم استبعاد نتائج "غير معروف" لضمان معايير الدقة.'
                    : 'City field is not sufficiently populated for current August sales customers. "Unknown" results are excluded to maintain reporting standards.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">{isAr ? 'تغطية المدن المكتملة:' : 'Populated City Coverage:'}</span>
                <span className="font-extrabold text-amber-600 dark:text-amber-400">0.0%</span>
              </div>

              <button
                onClick={() => setCurrentView('settings')}
                className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <span>{isAr ? 'الإعدادات ← جودة البيانات' : 'Settings → Data Quality'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Product & Category Mix Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isAr ? 'مزيج المنتجات والفئات' : 'Products & Categories Mix'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  [SECTION STATUS: Pending data quality]
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr ? 'تحليلات المبيعات حسب خطوط المنتجات والفئات' : 'Sales attribution across product lines and category mixes'}
              </p>
            </div>
            <Package className="w-4 h-4 text-slate-400" />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isAr
                    ? 'ربط خطوط المنتجات لا يتطابق بالكامل مع المبيعات على مستوى الطلبات.'
                    : 'Product-line attribution does not yet reconcile fully with order-level sales.'}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isAr
                    ? 'تغطية الفئات غير مكتملة في المنظر المباشر الحالي. تم إيقاف المظهر الوهمي للحفاظ على مطابقة البيانات.'
                    : 'Category coverage is incomplete in current source view. Mock values are omitted to uphold strict audit integrity.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">{isAr ? 'تطابق فئات المنتجات:' : 'Product Category Match:'}</span>
                <span className="font-extrabold text-amber-600 dark:text-amber-400">{isAr ? 'قيد التدقيق' : 'Pending reconciliation'}</span>
              </div>

              <button
                onClick={() => setCurrentView('settings')}
                className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <span>{isAr ? 'الإعدادات ← جودة البيانات' : 'Settings → Data Quality'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Daily Sales Representative Performance */}
      <div>
        <DailySalesRepPerformance />
      </div>

      {/* Tables Section: Top Sales Representatives & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Part 3: Live Sales Representatives Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                    {isAr ? 'أداء مندوبي المبيعات (Sales Representatives)' : 'Sales Representatives Performance'}
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    [SECTION STATUS: Live]
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {isAr ? 'منظر sales_rep_monthly_performance_odoo18 المباشر' : 'Live query from sales_rep_monthly_performance_odoo18'}
                </p>
              </div>

              {repsToDisplay.length > 0 && (
                <div className="relative">
                  <input
                    type="text"
                    value={repSearch}
                    onChange={(e) => setRepSearch(e.target.value)}
                    placeholder={isAr ? 'فلترة بالاسم...' : 'Filter name...'}
                    className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none font-semibold"
                  />
                </div>
              )}
            </div>

            {repsToDisplay.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <div className="font-extrabold text-xs text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  {isAr ? 'لا توجد بيانات مندوبين لهذه الفترة' : 'No Sales Representative Data Found'}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2">{isAr ? 'المندوب' : 'Rep'}</th>
                      <th className="p-2">{isAr ? 'الشركة' : 'Company'}</th>
                      <th className="p-2">{isAr ? 'عملاء' : 'Cust'}</th>
                      <th className="p-2">{isAr ? 'مستمر' : 'Retained'}</th>
                      <th className="p-2">{isAr ? 'مفقود' : 'Lost'}</th>
                      <th className="p-2">{isAr ? 'جديد' : 'New'}</th>
                      <th className="p-2">{isAr ? 'الاحتفاظ' : 'Retention'}</th>
                      <th className="p-2">{isAr ? 'الطلبات' : 'Orders'}</th>
                      <th className="p-2">{isAr ? 'المبيعات' : 'Sales'}</th>
                      <th className="p-2">{isAr ? 'إيراد المفقودين' : 'Lost Rev.'}</th>
                      <th className="p-2">{isAr ? 'الهدف' : 'Target'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {repsToDisplay.slice(0, 8).map(rep => (
                      <tr
                        key={rep.id}
                        onClick={() => setSelectedRep(rep)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="p-2 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{isAr ? rep.nameAr : rep.nameEn}</span>
                        </td>
                        <td className="p-2 text-slate-500 font-mono font-semibold">{rep.company}</td>
                        <td className="p-2 font-mono font-bold text-slate-700 dark:text-slate-300">{rep.activeCustomers}</td>
                        <td className="p-2 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{rep.retainedCustomers ?? 0}</td>
                        <td className="p-2 font-mono text-rose-600 dark:text-rose-400 font-bold">{rep.lostCustomers}</td>
                        <td className="p-2 font-mono text-teal-600 dark:text-teal-400 font-bold">{rep.newCustomers ?? 0}</td>
                        <td className="p-2 font-mono font-extrabold text-blue-600 dark:text-blue-400">{rep.retentionRate}%</td>
                        <td className="p-2 font-mono text-slate-700 dark:text-slate-300">{rep.recentOrdersCount}</td>
                        <td className="p-2 font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {rep.monthlyAchieved.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="p-2 font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {(rep.lostPreviousSales ?? 0) > 0 ? `${(rep.lostPreviousSales ?? 0).toLocaleString('ar-EG')} ج.م` : '-'}
                        </td>
                        <td className="p-2 font-mono text-slate-400 text-[10px] italic whitespace-nowrap">
                          Target data pending
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-wider cursor-pointer text-center hover:underline">
            {isAr ? `عرض جميع المندوبين (${repsToDisplay.length})` : `View All Representatives (${repsToDisplay.length})`}
          </div>
        </div>

        {/* Part 4: Top Customers Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                    {isAr ? 'أعلى العملاء إيراداً (Top Key Accounts)' : 'Top Key Accounts'}
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    [SECTION STATUS: Derived from live data]
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {isAr ? 'تجمعي مباشر من منظر sales_orders_odoo18 حسب العميل' : 'Aggregated from sales_orders_odoo18 by customer'}
                </p>
              </div>

              {custsToDisplay.length > 0 && (
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={isAr ? 'بحث بالعميل...' : 'Search client...'}
                    className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none font-semibold"
                  />
                </div>
              )}
            </div>

            {custsToDisplay.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <div className="font-extrabold text-xs text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  {isAr ? 'لا توجد بيانات عملاء لهذه الفترة' : 'No Customer Data Found'}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5">{isAr ? 'العميل' : 'Customer'}</th>
                      <th className="p-2.5">{isAr ? 'الشركة' : 'Company'}</th>
                      <th className="p-2.5">{isAr ? 'الطلبات' : 'Orders'}</th>
                      <th className="p-2.5">{isAr ? 'الإيراد' : 'Revenue'}</th>
                      <th className="p-2.5">{isAr ? 'تاريخ آخر طلب' : 'Last Order Date'}</th>
                      <th className="p-2.5">{isAr ? 'المندوب الرئيسي' : 'Primary Rep'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {custsToDisplay.slice(0, 8).map(cust => (
                      <tr
                        key={cust.id}
                        onClick={() => setSelectedCustomer(cust)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">
                          {isAr ? cust.nameAr : cust.nameEn}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500 font-semibold">{cust.company}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{cust.ordersCount}</td>
                        <td className="p-2.5 font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {cust.totalRevenueYtd.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="p-2.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {cust.lastOrderDate}
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {cust.salesRepName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-wider cursor-pointer text-center hover:underline">
            {isAr ? `عرض جميع العملاء (${custsToDisplay.length})` : `View Full Customer Roster (${custsToDisplay.length})`}
          </div>
        </div>

      </div>

    </div>
  );
};
