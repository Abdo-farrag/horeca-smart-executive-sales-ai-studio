import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Package,
  Building2,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Users,
  UserCheck,
  Tag,
  ShieldCheck,
  Layers,
  Award,
  Clock,
  PieChart,
  Bell,
  CheckCircle2,
  XCircle,
  BarChart2,
  FileText,
  Activity,
  Search
} from 'lucide-react';
import {
  Product360Result,
  ProductTrendResult,
  ProductDailyTrendResult,
  ProductCompanySplitResult,
  ProductLifecycleResult,
  ProductDataQualityResult,
  ProductAlertResult,
  ProductScoreResult,
  ProductTopCustomerResult,
  ProductTopSalespersonResult,
  ProductCustomerRetentionResult,
  ProductCustomerRetentionSummaryResult,
} from '../analytics/types';
import {
  fetchProduct360,
  fetchProductTrend,
  fetchProductDailyTrend,
  fetchProductCompanySplit,
  fetchProductLifecycle,
  fetchProductDataQuality,
  fetchProductAlerts,
  fetchProductScore,
  fetchProductTopCustomers,
  fetchProductTopSalespeople,
  fetchProductCustomerRetention,
  fetchProductCustomerRetentionSummary,
} from '../services/productService';
import { GlobalFilterState } from '../types';

interface Product360PanelProps {
  productId: number;
  productName?: string;
  filters: GlobalFilterState;
  onClose: () => void;
  language: 'ar' | 'en';
  onSelectCustomer?: (customerId: number, customerName: string) => void;
  onSelectSalesperson?: (salesperson: string) => void;
}

type TabType = 'overview' | 'dailyTrend' | 'monthlyTrend' | 'customers' | 'recovery' | 'salespeople' | 'companies' | 'alerts' | 'dataQuality';

export const Product360Panel: React.FC<Product360PanelProps> = ({
  productId,
  productName,
  filters,
  onClose,
  language,
  onSelectCustomer,
  onSelectSalesperson,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // State per section to isolate failures
  const [p360, setP360] = useState<Product360Result | null>(null);
  const [loading360, setLoading360] = useState<boolean>(true);
  const [error360, setError360] = useState<string | null>(null);

  const [score, setScore] = useState<ProductScoreResult | null>(null);
  const [loadingScore, setLoadingScore] = useState<boolean>(true);
  const [errorScore, setErrorScore] = useState<string | null>(null);

  const [lifecycle, setLifecycle] = useState<ProductLifecycleResult | null>(null);
  const [loadingLifecycle, setLoadingLifecycle] = useState<boolean>(true);
  const [errorLifecycle, setErrorLifecycle] = useState<string | null>(null);

  const [dailyTrends, setDailyTrends] = useState<ProductDailyTrendResult[]>([]);
  const [loadingDaily, setLoadingDaily] = useState<boolean>(true);
  const [errorDaily, setErrorDaily] = useState<string | null>(null);

  const [monthlyTrends, setMonthlyTrends] = useState<ProductTrendResult[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState<boolean>(true);
  const [errorMonthly, setErrorMonthly] = useState<string | null>(null);

  const [customers, setCustomers] = useState<ProductTopCustomerResult[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(true);
  const [errorCustomers, setErrorCustomers] = useState<string | null>(null);

  const [salespeople, setSalespeople] = useState<ProductTopSalespersonResult[]>([]);
  const [loadingSalespeople, setLoadingSalespeople] = useState<boolean>(true);
  const [errorSalespeople, setErrorSalespeople] = useState<string | null>(null);

  const [companySplits, setCompanySplits] = useState<ProductCompanySplitResult[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState<boolean>(true);
  const [errorCompanies, setErrorCompanies] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<ProductAlertResult[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [errorAlerts, setErrorAlerts] = useState<string | null>(null);

  const [dataQuality, setDataQuality] = useState<ProductDataQualityResult | null>(null);
  const [loadingQuality, setLoadingQuality] = useState<boolean>(true);
  const [errorQuality, setErrorQuality] = useState<string | null>(null);

  const [retention, setRetention] = useState<ProductCustomerRetentionResult[]>([]);
  const [retentionSummary, setRetentionSummary] = useState<ProductCustomerRetentionSummaryResult | null>(null);
  const [loadingRetention, setLoadingRetention] = useState<boolean>(true);
  const [errorRetention, setErrorRetention] = useState<string | null>(null);
  const [recoverySearch, setRecoverySearch] = useState<string>('');

  // Individual Loaders
  const load360 = useCallback(async () => {
    setLoading360(true);
    setError360(null);
    const res = await fetchProduct360(productId, filters);
    if (res.error) {
      setError360(res.error);
      setP360(null);
    } else {
      setP360(res.data);
    }
    setLoading360(false);
  }, [productId, filters]);

  const loadScore = useCallback(async () => {
    setLoadingScore(true);
    setErrorScore(null);
    const res = await fetchProductScore(productId, filters);
    if (res.error) {
      setErrorScore(res.error);
      setScore(null);
    } else {
      setScore(res.data);
    }
    setLoadingScore(false);
  }, [productId, filters]);

  const loadLifecycle = useCallback(async () => {
    setLoadingLifecycle(true);
    setErrorLifecycle(null);
    const res = await fetchProductLifecycle(productId);
    if (res.error) {
      setErrorLifecycle(res.error);
      setLifecycle(null);
    } else {
      setLifecycle(res.data);
    }
    setLoadingLifecycle(false);
  }, [productId]);

  const loadDailyTrend = useCallback(async () => {
    setLoadingDaily(true);
    setErrorDaily(null);
    const res = await fetchProductDailyTrend(productId, filters);
    if (res.error) {
      setErrorDaily(res.error);
      setDailyTrends([]);
    } else {
      setDailyTrends(res.data);
    }
    setLoadingDaily(false);
  }, [productId, filters]);

  const loadMonthlyTrend = useCallback(async () => {
    setLoadingMonthly(true);
    setErrorMonthly(null);
    const res = await fetchProductTrend(productId, filters);
    if (res.error) {
      setErrorMonthly(res.error);
      setMonthlyTrends([]);
    } else {
      setMonthlyTrends(res.data);
    }
    setLoadingMonthly(false);
  }, [productId, filters]);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    setErrorCustomers(null);
    const res = await fetchProductTopCustomers(productId, filters, { limit: 50 });
    if (res.error) {
      setErrorCustomers(res.error);
      setCustomers([]);
    } else {
      setCustomers(res.data);
    }
    setLoadingCustomers(false);
  }, [productId, filters]);

  const loadSalespeople = useCallback(async () => {
    setLoadingSalespeople(true);
    setErrorSalespeople(null);
    const res = await fetchProductTopSalespeople(productId, filters, { limit: 50 });
    if (res.error) {
      setErrorSalespeople(res.error);
      setSalespeople([]);
    } else {
      setSalespeople(res.data);
    }
    setLoadingSalespeople(false);
  }, [productId, filters]);

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    setErrorCompanies(null);
    const res = await fetchProductCompanySplit(productId, filters);
    if (res.error) {
      setErrorCompanies(res.error);
      setCompanySplits([]);
    } else {
      setCompanySplits(res.data);
    }
    setLoadingCompanies(false);
  }, [productId, filters]);

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    setErrorAlerts(null);
    const res = await fetchProductAlerts(productId, filters);
    if (res.error) {
      setErrorAlerts(res.error);
      setAlerts([]);
    } else {
      setAlerts(res.data);
    }
    setLoadingAlerts(false);
  }, [productId, filters]);

  const loadQuality = useCallback(async () => {
    setLoadingQuality(true);
    setErrorQuality(null);
    const res = await fetchProductDataQuality(productId);
    if (res.error) {
      setErrorQuality(res.error);
      setDataQuality(null);
    } else {
      setDataQuality(res.data);
    }
    setLoadingQuality(false);
  }, [productId]);

  const loadRetention = useCallback(async () => {
    setLoadingRetention(true);
    setErrorRetention(null);
    const [retRes, sumRes] = await Promise.all([
      fetchProductCustomerRetention(productId, filters),
      fetchProductCustomerRetentionSummary(productId, filters),
    ]);
    if (retRes.error) {
      setErrorRetention(retRes.error);
      setRetention([]);
    } else {
      setRetention(retRes.data);
    }
    if (sumRes.error) {
      console.error('Error fetching retention summary:', sumRes.error);
      setRetentionSummary(null);
    } else {
      setRetentionSummary(sumRes.data);
    }
    setLoadingRetention(false);
  }, [productId, filters]);

  useEffect(() => {
    load360();
    loadScore();
    loadLifecycle();
    loadDailyTrend();
    loadMonthlyTrend();
    loadCustomers();
    loadSalespeople();
    loadCompanies();
    loadAlerts();
    loadQuality();
    loadRetention();
  }, [
    load360,
    loadScore,
    loadLifecycle,
    loadDailyTrend,
    loadMonthlyTrend,
    loadCustomers,
    loadSalespeople,
    loadCompanies,
    loadAlerts,
    loadQuality,
    loadRetention,
  ]);

  const tabs: { id: TabType; labelAr: string; labelEn: string; icon: React.ReactNode; badgeCount?: number }[] = [
    { id: 'overview', labelAr: 'النظرة العامة', labelEn: 'Overview', icon: <Package className="w-4 h-4" /> },
    { id: 'dailyTrend', labelAr: 'المسار اليومي', labelEn: 'Daily Trend', icon: <Activity className="w-4 h-4" /> },
    { id: 'monthlyTrend', labelAr: 'المسار الشهري', labelEn: 'Monthly Trend', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'customers', labelAr: 'أعلى العملاء', labelEn: 'Customers', icon: <Users className="w-4 h-4" /> },
    {
      id: 'recovery',
      labelAr: 'استرجاع العملاء',
      labelEn: 'Product Customer Recovery',
      icon: <UserCheck className="w-4 h-4" />,
      badgeCount: retention.filter(r => r.status === 'STOPPED_BUYING' || r.status === 'DECLINING').length,
    },
    { id: 'salespeople', labelAr: 'المندوبين', labelEn: 'Sales Reps', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'companies', labelAr: 'توزيع الشركات', labelEn: 'Companies', icon: <Building2 className="w-4 h-4" /> },
    { id: 'alerts', labelAr: 'التنبيهات', labelEn: 'Alerts', icon: <Bell className="w-4 h-4" />, badgeCount: alerts.length },
    { id: 'dataQuality', labelAr: 'جودة البيانات', labelEn: 'Data Quality', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 sticky top-0 z-20 backdrop-blur flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    [Product 360: Live]
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">ID: #{productId}</span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {p360?.productName || productName || `منتج #${productId}`}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-slate-200/60 dark:border-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}>
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Main 360 Summary */}
              {loading360 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{isAr ? 'جاري تحميل ملخص المنتج 360...' : 'Loading Product 360 summary...'}</p>
                </div>
              ) : error360 ? (
                <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs text-rose-700 dark:text-rose-300 font-bold">{error360}</p>
                  <button onClick={load360} className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold">
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : p360 ? (
                <div className="space-y-6">
                  {/* Category Info */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-500">{isAr ? 'فئة المنتج:' : 'Product Category:'}</span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {p360.productCategory || (isAr ? 'غير مصنف' : 'Uncategorized')}
                      </span>
                    </div>
                  </div>

                  {/* Period vs Lifetime Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Period Metrics */}
                    <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          {isAr ? 'أداء الفترة المحددة' : 'Selected Period Performance'}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                          {p360.firstOrderDate || '-'} ➔ {p360.lastOrderDate || '-'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'مبيعات الفترة' : 'Period Sales'}</div>
                          <div className="text-sm font-black text-blue-700 dark:text-blue-400 mt-0.5 font-mono">
                            {p360.periodSales.toLocaleString('ar-EG')} ج.م
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'الكمية المباعة' : 'Period Quantity'}</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                            {p360.periodQuantity.toLocaleString('ar-EG')}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'عدد الطلبات' : 'Period Orders'}</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                            {p360.periodOrders.toLocaleString('ar-EG')}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'العملاء' : 'Period Customers'}</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                            {p360.periodCustomers.toLocaleString('ar-EG')}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'المندوبين' : 'Salespeople'}</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                            {p360.periodSalespeople}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'متوسط سعر الوحدة' : 'Avg Unit Value'}</div>
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                            {p360.averageUnitValue.toLocaleString('ar-EG')} ج.م
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lifetime Metrics */}
                    <div className="p-5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                          {isAr ? 'المؤشرات التراكمية (Lifetime Totals)' : 'Lifetime Totals'}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'إجمالي المبيعات' : 'Lifetime Sales'}</div>
                          <div className="text-sm font-black text-purple-700 dark:text-purple-400 mt-0.5 font-mono">
                            {p360.lifetimeSales.toLocaleString('ar-EG')} ج.م
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'إجمالي الكمية' : 'Lifetime Quantity'}</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                            {p360.lifetimeQuantity.toLocaleString('ar-EG')}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'إجمالي الطلبات' : 'Lifetime Orders'}</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                            {p360.lifetimeOrders.toLocaleString('ar-EG')}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50">
                          <div className="text-[10px] text-slate-500">{isAr ? 'إجمالي العملاء' : 'Lifetime Customers'}</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                            {p360.lifetimeCustomers.toLocaleString('ar-EG')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* OPERATIONAL PRODUCT SCORE SECTION */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {isAr ? 'تقييم كفاءة تشغيل المنتج (Operational Product Score)' : 'Operational Product Score'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {isAr ? 'مؤشر الكفاءة التشغيلية وحجم المبيعات واستقرار الطلب (وليس الربحية أو القيمة الاستراتيجية)' : 'Operational activity & demand consistency index'}
                      </p>
                    </div>
                  </div>
                  {score && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      v{score.methodologyVersion}
                    </span>
                  )}
                </div>

                {loadingScore ? (
                  <div className="p-4 text-center">
                    <RefreshCw className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-1" />
                    <p className="text-xs text-slate-500">{isAr ? 'جاري حساب تقييم كفاءة تشغيل المنتج...' : 'Calculating Operational Product Score...'}</p>
                  </div>
                ) : errorScore ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-2">
                    <p className="font-bold">{isAr ? 'تعذر تحميل التقييم المباشر للمنتج حالياً' : 'Operational Product Score currently unavailable'}</p>
                    <p className="text-[10px] font-mono opacity-80">{errorScore}</p>
                    <button onClick={loadScore} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-bold">
                      {isAr ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                  </div>
                ) : score ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-amber-900 dark:text-amber-200">{isAr ? 'قوة المبيعات' : 'Sales Strength'}</div>
                      <div className="text-lg font-black text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                        {score.salesStrengthScore} <span className="text-[10px] text-slate-400 font-normal">/ 40</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{isAr ? 'النمو' : 'Growth'}</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                        {score.growthScore} <span className="text-[10px] text-slate-400 font-normal">/ 20</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{isAr ? 'التغطية' : 'Coverage'}</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                        {score.coverageScore} <span className="text-[10px] text-slate-400 font-normal">/ 20</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{isAr ? 'الاستقرار' : 'Consistency'}</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                        {score.consistencyScore} <span className="text-[10px] text-slate-400 font-normal">/ 10</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{isAr ? 'جودة البيانات' : 'Data Quality'}</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                        {score.dataQualityScore} <span className="text-[10px] text-slate-400 font-normal">/ 10</span>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-600 text-white rounded-xl text-center">
                      <div className="text-[10px] font-bold opacity-90">{isAr ? 'الدرجة الكلية' : 'Total Score'}</div>
                      <div className="text-lg font-black font-mono mt-0.5">
                        {score.totalScore} <span className="text-[10px] opacity-75 font-normal">/ 100</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* LIFECYCLE SECTION */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr ? 'تحليل دورة حياة المنتج (Product Lifecycle)' : 'Product Lifecycle Metrics'}
                  </h3>
                </div>

                {loadingLifecycle ? (
                  <div className="p-4 text-center">
                    <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin mx-auto mb-1" />
                    <p className="text-xs text-slate-500">{isAr ? 'جاري تحميل مؤشرات دورة الحياة...' : 'Loading lifecycle metrics...'}</p>
                  </div>
                ) : errorLifecycle ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold">
                    {errorLifecycle}
                  </div>
                ) : lifecycle ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'أول عملية بيع' : 'First Sale'}</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{lifecycle.firstSaleDate || 'غير متاح'}</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'آخر عملية بيع' : 'Last Sale'}</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{lifecycle.lastSaleDate || 'غير متاح'}</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'أيام منذ آخر بيع' : 'Days Since Last Sale'}</div>
                      <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">{lifecycle.daysSinceLastSale} يوم</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'أشهر النشاط' : 'Active Months'}</div>
                      <div className="font-bold text-purple-600 dark:text-purple-400 mt-0.5">{lifecycle.activeMonths} شهر</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'متوسط الأيام بين البيعات' : 'Avg Days Between Sales'}</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{lifecycle.averageDaysBetweenSales.toFixed(1)} يوم</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'إجمالي الطلبات التراكمي' : 'Lifetime Orders'}</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{lifecycle.lifetimeOrders.toLocaleString('ar-EG')}</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'إجمالي العملاء التراكمي' : 'Lifetime Customers'}</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{lifecycle.lifetimeCustomers.toLocaleString('ar-EG')}</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'إجمالي المبيعات التراكمية' : 'Lifetime Sales'}</div>
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{lifecycle.lifetimeSales.toLocaleString('ar-EG')} ج.م</div>
                    </div>
                  </div>
                ) : null}
              </div>

            </div>
          )}

          {/* TAB 2: DAILY TREND */}
          {activeTab === 'dailyTrend' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  {isAr ? 'مسار المبيعات اليومي للمنتج (Daily Sales Trend)' : 'Product Daily Sales Trend'}
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {isAr ? 'يتم عرض الأيام الفعلية فقط (No zero-padded dates)' : 'Actual sales dates only'}
                </span>
              </div>

              {loadingDaily ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{isAr ? 'جاري تحميل المسار اليومي للمبيعات...' : 'Loading daily trend...'}</p>
                </div>
              ) : errorDaily ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold space-y-2">
                  <p>{errorDaily}</p>
                  <button onClick={loadDailyTrend} className="px-3 py-1 bg-rose-600 text-white rounded-lg">
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : dailyTrends.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold">{isAr ? 'لا توجد حركات بيع يومية للمنتج بالفترة المحددة' : 'No daily sales recorded for this period'}</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                          <th className="p-3 font-sans">{isAr ? 'التاريخ' : 'Date'}</th>
                          <th className="p-3 font-sans">{isAr ? 'المبيعات' : 'Sales Value'}</th>
                          <th className="p-3 font-sans">{isAr ? 'الكمية' : 'Quantity'}</th>
                          <th className="p-3 font-sans">{isAr ? 'الطلبات' : 'Orders'}</th>
                          <th className="p-3 font-sans">{isAr ? 'العملاء' : 'Customers'}</th>
                          <th className="p-3 font-sans">{isAr ? 'متوسط سعر الوحدة' : 'Avg Unit Value'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dailyTrends.map((d, idx) => (
                          <tr key={`${d.reportDate}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{d.reportDate}</td>
                            <td className="p-3 font-black text-blue-600 dark:text-blue-400">{d.salesValue.toLocaleString('ar-EG')} ج.م</td>
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{d.quantitySold.toLocaleString('ar-EG')}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{d.ordersCount}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{d.customersCount}</td>
                            <td className="p-3 text-emerald-600 dark:text-emerald-400">{d.averageUnitValue.toLocaleString('ar-EG')} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MONTHLY TREND */}
          {activeTab === 'monthlyTrend' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                {isAr ? 'مسار المبيعات الشهري للمنتج (Monthly Sales Trend)' : 'Product Monthly Sales Trend'}
              </h3>

              {loadingMonthly ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-6 h-6 text-purple-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{isAr ? 'جاري تحميل الاتجاه الشهري...' : 'Loading monthly trend...'}</p>
                </div>
              ) : errorMonthly ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold space-y-2">
                  <p>{errorMonthly}</p>
                  <button onClick={loadMonthlyTrend} className="px-3 py-1 bg-rose-600 text-white rounded-lg">
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : monthlyTrends.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold">{isAr ? 'لا توجد بيانات مسار شهري لهذا المنتج' : 'No monthly trend data for this product'}</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                          <th className="p-3 font-sans">{isAr ? 'الشهر' : 'Month'}</th>
                          <th className="p-3 font-sans">{isAr ? 'المبيعات' : 'Sales Value'}</th>
                          <th className="p-3 font-sans">{isAr ? 'الكمية' : 'Quantity'}</th>
                          <th className="p-3 font-sans">{isAr ? 'الطلبات' : 'Orders'}</th>
                          <th className="p-3 font-sans">{isAr ? 'العملاء' : 'Customers'}</th>
                          <th className="p-3 font-sans">{isAr ? 'متوسط سعر الوحدة' : 'Avg Unit Value'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {monthlyTrends.map((t, idx) => (
                          <tr key={`${t.orderMonth}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{t.orderMonth}</td>
                            <td className="p-3 font-black text-blue-600 dark:text-blue-400">{t.salesValue.toLocaleString('ar-EG')} ج.م</td>
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{t.quantitySold.toLocaleString('ar-EG')}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{t.ordersCount}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{t.uniqueCustomers}</td>
                            <td className="p-3 text-emerald-600 dark:text-emerald-400">{t.averageUnitValue.toLocaleString('ar-EG')} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TOP CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                {isAr ? 'أعلى العملاء شراءً للمنتج' : 'Top Product Customers'}
              </h3>

              {loadingCustomers ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-6 h-6 text-purple-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{isAr ? 'جاري تحميل قائمة العملاء...' : 'Loading top customers...'}</p>
                </div>
              ) : errorCustomers ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold space-y-2">
                  <p>{errorCustomers}</p>
                  <button onClick={loadCustomers} className="px-3 py-1 bg-rose-600 text-white rounded-lg">
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : customers.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold">{isAr ? 'لا يوجد عملاء قاموا بشراء هذا المنتج بالفترة المحددة' : 'No top customers for this period'}</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                          <th className="p-3">{isAr ? 'اسم العميل' : 'Customer Name'}</th>
                          <th className="p-3">{isAr ? 'الشركة' : 'Company'}</th>
                          <th className="p-3 font-mono">{isAr ? 'الطلبات' : 'Orders'}</th>
                          <th className="p-3 font-mono">{isAr ? 'الكمية' : 'Quantity'}</th>
                          <th className="p-3 font-mono">{isAr ? 'إجمالي المبيعات' : 'Sales Value'}</th>
                          <th className="p-3">{isAr ? 'المندوب' : 'Salesperson'}</th>
                          <th className="p-3 font-mono">{isAr ? 'آخر طلب' : 'Last Order'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {customers.map((c, idx) => (
                          <tr
                            key={`${c.customerId}_${idx}`}
                            onClick={() => onSelectCustomer && onSelectCustomer(c.customerId, c.customerName)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          >
                            <td className="p-3 font-bold text-blue-600 dark:text-blue-400 font-sans">{c.customerName}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">{c.companyName}</td>
                            <td className="p-3 text-slate-800 dark:text-slate-200">{c.ordersCount}</td>
                            <td className="p-3 text-slate-800 dark:text-slate-200">{c.quantitySold.toLocaleString('ar-EG')}</td>
                            <td className="p-3 font-extrabold text-blue-600 dark:text-blue-400">{c.salesValue.toLocaleString('ar-EG')} ج.م</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">{c.primarySalesperson || '-'}</td>
                            <td className="p-3 text-slate-500 text-[11px]">{c.lastOrderDate || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SALESPEOPLE */}
          {activeTab === 'salespeople' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                {isAr ? 'أعلى مندوبي المبيعات بيعاً للمنتج' : 'Top Product Salespeople'}
              </h3>

              {loadingSalespeople ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{isAr ? 'جاري تحميل قائمة المندوبين...' : 'Loading top salespeople...'}</p>
                </div>
              ) : errorSalespeople ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold space-y-2">
                  <p>{errorSalespeople}</p>
                  <button onClick={loadSalespeople} className="px-3 py-1 bg-rose-600 text-white rounded-lg">
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : salespeople.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold">{isAr ? 'لا يوجد مندوبين للمنتج بالفترة الحالية' : 'No top salespeople found for this period'}</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                          <th className="p-3">{isAr ? 'اسم المندوب' : 'Salesperson'}</th>
                          <th className="p-3">{isAr ? 'الشركة' : 'Company'}</th>
                          <th className="p-3 font-mono">{isAr ? 'الطلبات' : 'Orders'}</th>
                          <th className="p-3 font-mono">{isAr ? 'العملاء' : 'Customers'}</th>
                          <th className="p-3 font-mono">{isAr ? 'الكمية' : 'Quantity'}</th>
                          <th className="p-3 font-mono">{isAr ? 'إجمالي المبيعات' : 'Sales Value'}</th>
                          <th className="p-3 font-mono">{isAr ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {salespeople.map((s, idx) => (
                          <tr
                            key={`${s.salesperson}_${s.companyName}_${idx}`}
                            onClick={() => onSelectSalesperson && onSelectSalesperson(s.salesperson)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          >
                            <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 font-sans">{s.salesperson}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">{s.companyName}</td>
                            <td className="p-3 text-slate-800 dark:text-slate-200">{s.ordersCount}</td>
                            <td className="p-3 text-slate-800 dark:text-slate-200">{s.uniqueCustomers}</td>
                            <td className="p-3 text-slate-800 dark:text-slate-200">{s.quantitySold.toLocaleString('ar-EG')}</td>
                            <td className="p-3 font-extrabold text-blue-600 dark:text-blue-400">{s.salesValue.toLocaleString('ar-EG')} ج.م</td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">{s.averageOrderValue.toLocaleString('ar-EG')} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: COMPANIES */}
          {activeTab === 'companies' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                {isAr ? 'توزيع مبيعات المنتج حسب الشركات' : 'Company Product Sales Split'}
              </h3>

              {loadingCompanies ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{isAr ? 'جاري تحميل توزيع الشركات...' : 'Loading company split...'}</p>
                </div>
              ) : errorCompanies ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold space-y-2">
                  <p>{errorCompanies}</p>
                  <button onClick={loadCompanies} className="px-3 py-1 bg-rose-600 text-white rounded-lg">
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : companySplits.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold">{isAr ? 'لا توجد بيانات توزيع شركات لهذا المنتج' : 'No company split data for this product'}</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                          <th className="p-3">{isAr ? 'الشركة' : 'Company'}</th>
                          <th className="p-3 font-mono">{isAr ? 'المبيعات' : 'Sales Value'}</th>
                          <th className="p-3 font-mono">{isAr ? 'حصة المبيعات %' : 'Sales Share %'}</th>
                          <th className="p-3 font-mono">{isAr ? 'الكمية' : 'Quantity'}</th>
                          <th className="p-3 font-mono">{isAr ? 'الطلبات' : 'Orders'}</th>
                          <th className="p-3 font-mono">{isAr ? 'العملاء' : 'Customers'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {companySplits.map((cs, idx) => (
                          <tr key={`${cs.companyName}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-bold text-slate-900 dark:text-white font-sans">{cs.companyName}</td>
                            <td className="p-3 font-extrabold text-blue-600 dark:text-blue-400">{cs.salesValue.toLocaleString('ar-EG')} ج.م</td>
                            <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{cs.salesSharePct.toFixed(2)}%</td>
                            <td className="p-3 text-slate-800 dark:text-slate-200">{cs.quantitySold.toLocaleString('ar-EG')}</td>
                            <td className="p-3 text-slate-800 dark:text-slate-200">{cs.ordersCount}</td>
                            <td className="p-3 text-slate-800 dark:text-slate-200">{cs.customersCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  {isAr ? 'تنبيهات المنتج (Product Intelligence Alerts)' : 'Product Intelligence Alerts'}
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  {isAr ? 'تنبيهات مشتقة مباشرة من البيانات' : 'Direct live RPC alerts'}
                </span>
              </div>

              {loadingAlerts ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{isAr ? 'جاري كشف التنبيهات الذكية للمنتج...' : 'Detecting product alerts...'}</p>
                </div>
              ) : errorAlerts ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold space-y-2">
                  <p>{errorAlerts}</p>
                  <button onClick={loadAlerts} className="px-3 py-1 bg-rose-600 text-white rounded-lg">
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                    {isAr ? 'لا يوجد تنبيهات أو مخاطر حرجية مكتشفة للمنتج حالياً' : 'No critical alert flags detected for this product'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a, idx) => {
                    const isHigh = a.severity === 'high' || a.severity === 'critical';
                    const isMedium = a.severity === 'medium';
                    return (
                      <div
                        key={`${a.alertCode}_${idx}`}
                        className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                          isHigh
                            ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                            : isMedium
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                            : 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                        }`}
                      >
                        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isHigh ? 'text-rose-600' : isMedium ? 'text-amber-600' : 'text-blue-600'}`} />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-black">{a.titleAr || a.alertCode}</h4>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/30 font-extrabold">
                              {a.severity}
                            </span>
                          </div>
                          <p className="text-xs opacity-90 leading-relaxed">{a.detailsAr}</p>
                          {a.metricValue !== null && a.metricValue !== undefined && (
                            <div className="text-[11px] font-mono font-bold pt-1">
                              {isAr ? 'القيمة المقاسة:' : 'Metric Value:'} {a.metricValue}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: DATA QUALITY */}
          {activeTab === 'dataQuality' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {isAr ? 'فحص جودة بيانات المنتج Master Data' : 'Product Master Data Quality'}
                </h3>
              </div>

              {loadingQuality ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{isAr ? 'جاري فحص جودة البيانات...' : 'Checking data quality...'}</p>
                </div>
              ) : errorQuality ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold space-y-2">
                  <p>{errorQuality}</p>
                  <button onClick={loadQuality} className="px-3 py-1 bg-rose-600 text-white rounded-lg">
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : dataQuality ? (
                <div className="space-y-4">
                  
                  {/* Quality Score Meter */}
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-500">{isAr ? 'مؤشر كمال جودة البيانات الأساسية:' : 'Data Completeness Score:'}</div>
                      <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                        {dataQuality.qualityScore} %
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-xl text-xs font-black ${
                      dataQuality.qualityScore >= 80
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {dataQuality.qualityScore >= 80 ? (isAr ? 'جودة عالية' : 'High Quality') : (isAr ? 'يحتاج استكمال' : 'Incomplete')}
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'اسم المنتج (Product Name)' : 'Product Name'}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {dataQuality.hasName ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {dataQuality.productName}</span>
                        ) : (
                          <span className="text-rose-500 font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> غير متاح</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'الكود الداخلي (Internal Ref)' : 'Internal Reference'}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {dataQuality.hasInternalReference ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {dataQuality.internalReference}</span>
                        ) : (
                          <span className="text-amber-600 font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> غير متاح</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'الباركود (Barcode)' : 'Barcode'}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {dataQuality.hasBarcode ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {dataQuality.barcode}</span>
                        ) : (
                          <span className="text-amber-600 font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> غير متاح</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'الفئة (Category)' : 'Category Name'}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {dataQuality.hasCategory ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {dataQuality.categoryName}</span>
                        ) : (
                          <span className="text-amber-600 font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> غير متاح</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'سعر البيع (Sale Price)' : 'Sale Price'}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {dataQuality.hasSalePrice ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {dataQuality.salePrice?.toLocaleString('ar-EG')} ج.م</span>
                        ) : (
                          <span className="text-amber-600 font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> غير متاح</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'التكلفة (Cost)' : 'Cost'}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {dataQuality.hasCost ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {dataQuality.cost?.toLocaleString('ar-EG')} ج.م</span>
                        ) : (
                          <span className="text-amber-600 font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> غير متاح</span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 9: RECOVERY (استرجاع العملاء) */}
          {activeTab === 'recovery' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    {isAr ? 'تحليل استرجاع واحتفاظ العملاء بالمنتج (Product Customer Recovery)' : 'Product Customer Retention & Recovery'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr ? 'فرص استرجاع العملاء المتوقفين والمنخفض شرائهم مع تحديد أولويات المتابعة' : 'Opportunities to recover stopped or declining customers with prioritized actions'}
                  </p>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
                  <input
                    type="text"
                    value={recoverySearch}
                    onChange={(e) => setRecoverySearch(e.target.value)}
                    placeholder={isAr ? 'بحث بالعميل، الشركة، أو المندوب...' : 'Search customer, company, salesperson...'}
                    className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {loadingRetention ? (
                <div className="p-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{isAr ? 'جاري تحليل بيانات استرجاع العملاء...' : 'Loading retention & recovery metrics...'}</p>
                </div>
              ) : errorRetention ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold space-y-2">
                  <p>{errorRetention}</p>
                  <button onClick={loadRetention} className="px-3 py-1 bg-rose-600 text-white rounded-lg">
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Summary KPIs */}
                  {retentionSummary && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <div className="text-[10px] text-slate-500 font-bold">{isAr ? 'عملاء الفترة السابقة' : 'Previous Period Customers'}</div>
                        <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                          {retentionSummary.previousCustomers.toLocaleString('ar-EG')}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <div className="text-[10px] text-slate-500 font-bold">{isAr ? 'عملاء الفترة الحالية' : 'Current Period Customers'}</div>
                        <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                          {retentionSummary.currentCustomers.toLocaleString('ar-EG')}
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                        <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">{isAr ? 'العملاء المستمرون (Retained)' : 'Retained Customers'}</div>
                        <div className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                          {retentionSummary.retainedCustomers.toLocaleString('ar-EG')}
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                        <div className="text-[10px] text-blue-800 dark:text-blue-300 font-bold">{isAr ? 'عملاء جدد للمنتج' : 'New-to-Product Customers'}</div>
                        <div className="text-base font-black text-blue-700 dark:text-blue-400 font-mono mt-0.5">
                          {retentionSummary.newToProductCustomers.toLocaleString('ar-EG')}
                        </div>
                      </div>

                      <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-xl">
                        <div className="text-[10px] text-rose-800 dark:text-rose-300 font-bold">{isAr ? 'توقفوا عن شراء المنتج' : 'Stopped Buying Customers'}</div>
                        <div className="text-base font-black text-rose-700 dark:text-rose-400 font-mono mt-0.5">
                          {retentionSummary.stoppedBuyingCustomers.toLocaleString('ar-EG')}
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                        <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">{isAr ? 'انخفض شراؤهم للمنتج' : 'Declining Customers'}</div>
                        <div className="text-base font-black text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                          {retentionSummary.decliningCustomers.toLocaleString('ar-EG')}
                        </div>
                      </div>

                      <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl">
                        <div className="text-[10px] text-indigo-800 dark:text-indigo-300 font-bold">{isAr ? 'نسبة الاحتفاظ (Retention Rate)' : 'Retention Rate'}</div>
                        <div className="text-base font-black text-indigo-700 dark:text-indigo-400 font-mono mt-0.5">
                          {retentionSummary.retentionRate.toFixed(2)} %
                        </div>
                      </div>

                      <div className="p-3 bg-rose-100/70 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl">
                        <div className="text-[10px] text-rose-900 dark:text-rose-200 font-bold">{isAr ? 'فرصة المبيعات المتوقفة' : 'Stopped Sales Opportunity'}</div>
                        <div className="text-base font-black text-rose-700 dark:text-rose-400 font-mono mt-0.5">
                          {retentionSummary.stoppedSalesOpportunity.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </div>
                      </div>

                      <div className="p-3 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl">
                        <div className="text-[10px] text-amber-900 dark:text-amber-200 font-bold">{isAr ? 'فجوة المبيعات المنخفضة' : 'Declining Sales Gap'}</div>
                        <div className="text-base font-black text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                          {retentionSummary.decliningSalesGap.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <div className="text-[10px] text-slate-500 font-bold">{isAr ? 'مبيعات الفترة السابقة' : 'Previous Sales'}</div>
                        <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                          {retentionSummary.previousSales.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <div className="text-[10px] text-slate-500 font-bold">{isAr ? 'مبيعات الفترة الحالية' : 'Current Sales'}</div>
                        <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                          {retentionSummary.currentSales.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recovery Table */}
                  {(() => {
                    const filtered = retention.filter((r) => {
                      if (!recoverySearch.trim()) return true;
                      const q = recoverySearch.toLowerCase();
                      return (
                        r.customerName.toLowerCase().includes(q) ||
                        r.companyName.toLowerCase().includes(q) ||
                        (r.primarySalesperson && r.primarySalesperson.toLowerCase().includes(q)) ||
                        r.status.toLowerCase().includes(q)
                      );
                    });

                    const pWeight = (p: string) => {
                      const norm = (p || '').toUpperCase();
                      if (norm === 'HIGH') return 1;
                      if (norm === 'MEDIUM') return 2;
                      if (norm === 'LOW') return 3;
                      return 4;
                    };

                    const sorted = [...filtered].sort((a, b) => {
                      const pA = pWeight(a.recoveryPriority);
                      const pB = pWeight(b.recoveryPriority);
                      if (pA !== pB) return pA - pB;
                      return (b.previousSales || 0) - (a.previousSales || 0);
                    });

                    if (sorted.length === 0) {
                      return (
                        <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                          <UserCheck className="w-10 h-10 text-slate-400 mx-auto" />
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {isAr
                              ? 'لا توجد فرص استرجاع لهذا المنتج في الفترة المحددة.'
                              : 'No customer recovery opportunities for this product in the selected period.'}
                          </p>
                        </div>
                      );
                    }

                    const getStatusProps = (status: string) => {
                      const norm = (status || '').toUpperCase();
                      switch (norm) {
                        case 'RETAINED':
                          return {
                            label: isAr ? 'مستمر' : 'Retained',
                            cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                          };
                        case 'NEW_TO_PRODUCT':
                          return {
                            label: isAr ? 'عميل جديد للمنتج' : 'New to Product',
                            cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                          };
                        case 'STOPPED_BUYING':
                          return {
                            label: isAr ? 'توقف عن شراء المنتج' : 'Stopped Buying',
                            cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
                          };
                        case 'DECLINING':
                          return {
                            label: isAr ? 'انخفض شراؤه' : 'Declining',
                            cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                          };
                        default:
                          return {
                            label: status || (isAr ? 'غير محدد' : 'Unknown'),
                            cls: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                          };
                      }
                    };

                    const getPriorityProps = (priority: string) => {
                      const norm = (priority || '').toUpperCase();
                      switch (norm) {
                        case 'HIGH':
                          return {
                            label: isAr ? 'أولوية عالية' : 'High Priority',
                            cls: 'bg-rose-600 text-white font-black',
                          };
                        case 'MEDIUM':
                          return {
                            label: isAr ? 'أولوية متوسطة' : 'Medium Priority',
                            cls: 'bg-amber-500 text-white font-black',
                          };
                        case 'LOW':
                          return {
                            label: isAr ? 'أولوية منخفضة' : 'Low Priority',
                            cls: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-bold',
                          };
                        default:
                          return {
                            label: priority || (isAr ? 'أولوية منخفضة' : 'Low Priority'),
                            cls: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-bold',
                          };
                      }
                    };

                    return (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <table className="w-full text-right rtl:text-right text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-3">{isAr ? 'العميل' : 'Customer'}</th>
                              <th className="p-3">{isAr ? 'الشركة' : 'Company'}</th>
                              <th className="p-3">{isAr ? 'المندوب الأساسي' : 'Primary Salesperson'}</th>
                              <th className="p-3 font-mono text-center">{isAr ? 'طلبات سابقة' : 'Prev Orders'}</th>
                              <th className="p-3 font-mono text-center">{isAr ? 'طلبات حالية' : 'Curr Orders'}</th>
                              <th className="p-3 font-mono text-center">{isAr ? 'كمية سابقة' : 'Prev Qty'}</th>
                              <th className="p-3 font-mono text-center">{isAr ? 'كمية حالية' : 'Curr Qty'}</th>
                              <th className="p-3 font-mono text-center">{isAr ? 'مبيعات سابقة' : 'Prev Sales'}</th>
                              <th className="p-3 font-mono text-center">{isAr ? 'مبيعات حالية' : 'Curr Sales'}</th>
                              <th className="p-3 font-mono text-center">{isAr ? 'تغير المبيعات %' : 'Sales Change %'}</th>
                              <th className="p-3 font-mono text-center">{isAr ? 'آخر طلب سابق' : 'Prev Last Order'}</th>
                              <th className="p-3 font-mono text-center">{isAr ? 'آخر طلب حالي' : 'Curr Last Order'}</th>
                              <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                              <th className="p-3 text-center">{isAr ? 'أولوية الاسترجاع' : 'Priority'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                            {sorted.map((item, idx) => {
                              const statusProps = getStatusProps(item.status);
                              const priorityProps = getPriorityProps(item.recoveryPriority);
                              return (
                                <tr
                                  key={`${item.customerId}-${idx}`}
                                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                                    <button
                                      onClick={() => onSelectCustomer?.(item.customerId, item.customerName)}
                                      className="hover:underline text-blue-600 dark:text-blue-400 text-right"
                                    >
                                      {item.customerName}
                                    </button>
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">{item.companyName}</td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">
                                    {item.primarySalesperson ? (
                                      <button
                                        onClick={() => onSelectSalesperson?.(item.primarySalesperson!)}
                                        className="hover:underline text-slate-700 dark:text-slate-300"
                                      >
                                        {item.primarySalesperson}
                                      </button>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="p-3 font-mono text-center text-slate-700 dark:text-slate-300">
                                    {item.previousOrders}
                                  </td>
                                  <td className="p-3 font-mono text-center text-slate-700 dark:text-slate-300">
                                    {item.currentOrders}
                                  </td>
                                  <td className="p-3 font-mono text-center text-slate-700 dark:text-slate-300">
                                    {item.previousQuantity.toLocaleString('ar-EG')}
                                  </td>
                                  <td className="p-3 font-mono text-center text-slate-700 dark:text-slate-300">
                                    {item.currentQuantity.toLocaleString('ar-EG')}
                                  </td>
                                  <td className="p-3 font-mono text-center font-bold text-slate-900 dark:text-white">
                                    {item.previousSales.toLocaleString('ar-EG')} ج.م
                                  </td>
                                  <td className="p-3 font-mono text-center font-bold text-slate-900 dark:text-white">
                                    {item.currentSales.toLocaleString('ar-EG')} ج.م
                                  </td>
                                  <td className="p-3 font-mono text-center font-bold">
                                    <span
                                      className={
                                        item.salesChangePct > 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : item.salesChangePct < 0
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : 'text-slate-500'
                                      }
                                    >
                                      {item.salesChangePct > 0 ? '+' : ''}
                                      {item.salesChangePct.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-center text-slate-500 text-[11px]">
                                    {item.previousLastOrder || '-'}
                                  </td>
                                  <td className="p-3 font-mono text-center text-slate-500 text-[11px]">
                                    {item.currentLastOrder || '-'}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-block px-2.5 py-1 text-[11px] rounded-full border font-bold ${statusProps.cls}`}
                                    >
                                      {statusProps.label}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-block px-2.5 py-1 text-[11px] rounded-full ${priorityProps.cls}`}
                                    >
                                      {priorityProps.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
