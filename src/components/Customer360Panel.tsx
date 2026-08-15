import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Info,
  Clock,
  PieChart,
  UserCheck,
  TrendingDown,
  Sparkles,
  Users,
  AlertCircle
} from 'lucide-react';
import { analytics } from '../analytics';
import {
  Customer360Result,
  CustomerTrendResult,
  CustomerOrderResult,
  CustomerBuyingFrequencyResult,
  CustomerFavoriteProductsResult,
  CustomerSalespersonHistoryResult,
  CustomerRiskResult,
  CustomerProductDropoffResult,
  CustomerCrossSellCandidatesResult
} from '../analytics/types';
import { GlobalFilterState } from '../types';

interface Customer360PanelProps {
  customerId: number;
  customerName?: string;
  filters: GlobalFilterState;
  onClose: () => void;
  language: 'ar' | 'en';
  onSelectProduct?: (productId: number) => void;
}

type ActiveTab =
  | 'overview'
  | 'buying_frequency'
  | 'favorite_products'
  | 'product_dropoff'
  | 'cross_sell'
  | 'salespeople'
  | 'orders'
  | 'risk';

export const Customer360Panel: React.FC<Customer360PanelProps> = ({
  customerId,
  customerName,
  filters,
  onClose,
  language,
  onSelectProduct
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Overview Data State
  const [c360, setC360] = useState<Customer360Result | null>(null);
  const [trends, setTrends] = useState<CustomerTrendResult[]>([]);
  const [loading360, setLoading360] = useState<boolean>(true);
  const [loadingTrend, setLoadingTrend] = useState<boolean>(true);
  const [error360, setError360] = useState<string | null>(null);
  const [errorTrend, setErrorTrend] = useState<string | null>(null);

  // Buying Frequency State
  const [buyingFreq, setBuyingFreq] = useState<CustomerBuyingFrequencyResult | null>(null);
  const [loadingFreq, setLoadingFreq] = useState<boolean>(false);
  const [errorFreq, setErrorFreq] = useState<string | null>(null);

  // Favorite Products State
  const [favProducts, setFavProducts] = useState<CustomerFavoriteProductsResult[]>([]);
  const [loadingFav, setLoadingFav] = useState<boolean>(false);
  const [errorFav, setErrorFav] = useState<string | null>(null);

  // Product Dropoff / Recovery State
  const [dropoffProducts, setDropoffProducts] = useState<CustomerProductDropoffResult[]>([]);
  const [loadingDropoff, setLoadingDropoff] = useState<boolean>(false);
  const [errorDropoff, setErrorDropoff] = useState<string | null>(null);

  // Cross Sell Candidates State
  const [crossSellList, setCrossSellList] = useState<CustomerCrossSellCandidatesResult[]>([]);
  const [loadingCrossSell, setLoadingCrossSell] = useState<boolean>(false);
  const [errorCrossSell, setErrorCrossSell] = useState<string | null>(null);

  // Salesperson History State
  const [salesHistory, setSalesHistory] = useState<CustomerSalespersonHistoryResult[]>([]);
  const [loadingSalesHistory, setLoadingSalesHistory] = useState<boolean>(false);
  const [errorSalesHistory, setErrorSalesHistory] = useState<string | null>(null);

  // Customer Risk State
  const [riskData, setRiskData] = useState<CustomerRiskResult | null>(null);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(false);
  const [errorRisk, setErrorRisk] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<CustomerOrderResult[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [errorOrders, setErrorOrders] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState<number>(1);
  const ordersPerPage = 6;

  const startDate = filters.dateRange?.startDate ?? null;
  const endDate = filters.dateRange?.endDate ?? null;
  const companyName = filters.company === 'All' ? null : filters.company;

  // Overview Fetching
  const fetch360 = useCallback(async () => {
    setLoading360(true);
    setError360(null);
    try {
      const res = await analytics.customers.get360({ customerId, startDate, endDate, companyName });
      setC360(res && res.length > 0 ? res[0] : null);
    } catch (err: any) {
      console.error('Error fetching Customer 360:', err);
      setError360(err?.message || 'فشل تحميل بيانات العميل 360');
      setC360(null);
    } finally {
      setLoading360(false);
    }
  }, [customerId, startDate, endDate, companyName]);

  const fetchTrend = useCallback(async () => {
    setLoadingTrend(true);
    setErrorTrend(null);
    try {
      const res = await analytics.customers.trend({ customerId, companyName });
      setTrends(res || []);
    } catch (err: any) {
      console.error('Error fetching Customer Trend:', err);
      setErrorTrend(err?.message || 'فشل تحميل مسار المبيعات للعميل');
      setTrends([]);
    } finally {
      setLoadingTrend(false);
    }
  }, [customerId, companyName]);

  // Buying Frequency Fetching
  const fetchBuyingFrequency = useCallback(async () => {
    setLoadingFreq(true);
    setErrorFreq(null);
    try {
      const res = await analytics.customers.buyingFrequency({ customerId, companyName });
      setBuyingFreq(res && res.length > 0 ? res[0] : null);
    } catch (err: any) {
      console.error('Error fetching buying frequency:', err);
      setErrorFreq(err?.message || 'فشل تحميل نمط شراء العميل');
      setBuyingFreq(null);
    } finally {
      setLoadingFreq(false);
    }
  }, [customerId, companyName]);

  // Favorite Products Fetching
  const fetchFavoriteProducts = useCallback(async () => {
    setLoadingFav(true);
    setErrorFav(null);
    try {
      const res = await analytics.customers.favoriteProducts({ customerId, startDate, endDate, companyName, limit: 50 });
      setFavProducts(res || []);
    } catch (err: any) {
      console.error('Error fetching favorite products:', err);
      setErrorFav(err?.message || 'فشل تحميل المنتجات المفضلة');
      setFavProducts([]);
    } finally {
      setLoadingFav(false);
    }
  }, [customerId, startDate, endDate, companyName]);

  // Product Dropoff Fetching
  const fetchProductDropoff = useCallback(async () => {
    setLoadingDropoff(true);
    setErrorDropoff(null);
    try {
      const res = await analytics.customers.productDropoff({ customerId, startDate, endDate, companyName });
      setDropoffProducts(res || []);
    } catch (err: any) {
      console.error('Error fetching product dropoff:', err);
      setErrorDropoff(err?.message || 'فشل تحميل فرص استرجاع المنتجات');
      setDropoffProducts([]);
    } finally {
      setLoadingDropoff(false);
    }
  }, [customerId, startDate, endDate, companyName]);

  // Cross Sell Candidates Fetching
  const fetchCrossSell = useCallback(async () => {
    setLoadingCrossSell(true);
    setErrorCrossSell(null);
    try {
      const res = await analytics.customers.crossSellCandidates({ customerId, startDate, endDate, companyName, limit: 50 });
      setCrossSellList(res || []);
    } catch (err: any) {
      console.error('Error fetching cross sell candidates:', err);
      setErrorCrossSell(err?.message || 'فشل تحميل فرص البيع الإضافي');
      setCrossSellList([]);
    } finally {
      setLoadingCrossSell(false);
    }
  }, [customerId, startDate, endDate, companyName]);

  // Salesperson History Fetching
  const fetchSalesHistory = useCallback(async () => {
    setLoadingSalesHistory(true);
    setErrorSalesHistory(null);
    try {
      const res = await analytics.customers.salespersonHistory({ customerId, companyName });
      setSalesHistory(res || []);
    } catch (err: any) {
      console.error('Error fetching salesperson history:', err);
      setErrorSalesHistory(err?.message || 'فشل تحميل سجل المندوبين');
      setSalesHistory([]);
    } finally {
      setLoadingSalesHistory(false);
    }
  }, [customerId, companyName]);

  // Risk Fetching
  const fetchRisk = useCallback(async () => {
    setLoadingRisk(true);
    setErrorRisk(null);
    try {
      const res = await analytics.customers.risk({ customerId, companyName });
      setRiskData(res && res.length > 0 ? res[0] : null);
    } catch (err: any) {
      console.error('Error fetching customer risk:', err);
      setErrorRisk(err?.message || 'فشل تحميل تحليل مخاطر العميل');
      setRiskData(null);
    } finally {
      setLoadingRisk(false);
    }
  }, [customerId, companyName]);

  // Orders Fetching
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    setErrorOrders(null);
    try {
      const offset = (ordersPage - 1) * ordersPerPage;
      const res = await analytics.customers.orders({ customerId, startDate, endDate, companyName, limit: ordersPerPage, offset });
      setOrders(res || []);
    } catch (err: any) {
      console.error('Error fetching Customer Orders:', err);
      setErrorOrders(err?.message || 'فشل تحميل سجل الطلبات');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [customerId, startDate, endDate, companyName, ordersPage]);

  // Trigger data fetching based on active tab
  useEffect(() => {
    fetch360();
  }, [fetch360]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchTrend();
    } else if (activeTab === 'buying_frequency') {
      fetchBuyingFrequency();
    } else if (activeTab === 'favorite_products') {
      fetchFavoriteProducts();
    } else if (activeTab === 'product_dropoff') {
      fetchProductDropoff();
    } else if (activeTab === 'cross_sell') {
      fetchCrossSell();
    } else if (activeTab === 'salespeople') {
      fetchSalesHistory();
    } else if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'risk') {
      fetchRisk();
    }
  }, [
    activeTab,
    fetchTrend,
    fetchBuyingFrequency,
    fetchFavoriteProducts,
    fetchProductDropoff,
    fetchCrossSell,
    fetchSalesHistory,
    fetchOrders,
    fetchRisk
  ]);

  const formatEgp = (val: number) => {
    return val.toLocaleString('ar-EG', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }) + ' ج.م';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">نشط</span>;
      case 'AT_RISK':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">معرض للخطر</span>;
      case 'SLEEPING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">نائم</span>;
      case 'LOST':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">مفقود</span>;
      case 'NEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">جديد</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  const getFrequencyBadge = (status: string) => {
    switch (status) {
      case 'ON_TIME':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">في الموعد</span>;
      case 'LATE':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">متأخر</span>;
      case 'OVERDUE':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700">متأخر عن نمط الشراء</span>;
      case 'INSUFFICIENT_HISTORY':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">تاريخ غير كافٍ</span>;
      case 'NO_ACTIVITY':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">لا يوجد نشاط</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  const getDropoffBadge = (status: string) => {
    switch (status) {
      case 'STOPPED_BUYING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">توقف عن شراء المنتج</span>;
      case 'DECLINING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">انخفض شراء المنتج</span>;
      case 'NEW_PRODUCT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">منتج جديد للعميل</span>;
      case 'STABLE_OR_GROWING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">مستقر أو ينمو</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">منخفض</span>;
      case 'MEDIUM':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">متوسط</span>;
      case 'HIGH':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700">مرتفع</span>;
      case 'LOST':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-300 dark:border-purple-700">مفقود</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">تاريخ غير كافٍ</span>;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">أولوية عالية</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">أولوية متوسطة</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">أولوية منخفضة</span>;
    }
  };

  // Calculations for Favorite Products
  const topProductShare = favProducts.length > 0 ? favProducts[0].salesSharePct : 0;
  const top3ProductShare = favProducts.slice(0, 3).reduce((sum, p) => sum + p.salesSharePct, 0);

  // Total Recovery Value calculation
  const totalRecoveryOpportunity = dropoffProducts
    .filter(p => p.status === 'STOPPED_BUYING' || p.status === 'DECLINING')
    .reduce((sum, p) => sum + p.recoveryValue, 0);

  // Salesperson stability check
  const isSalespersonStable = salesHistory.length > 0 && salesHistory.every(h => h.salespersonName === salesHistory[0].salespersonName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full p-6 space-y-6 text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
        
        {/* Top Header Bar */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                #360 ID: {customerId}
              </span>
              {c360?.customerStatus && getStatusBadge(c360.customerStatus)}
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <span>{c360?.customerName || customerName || 'عميل'}</span>
            </h2>
            <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
              <span>الشركة: <strong className="text-slate-800 dark:text-slate-200">{c360?.companyName || companyName || 'MAS'}</strong></span>
              <span>•</span>
              <span>المندوب الحالي: <strong className="text-slate-800 dark:text-slate-200">{c360?.currentSalesperson || 'غير محدد'}</strong></span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8-Tab Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 no-scrollbar text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. نظرة عامة</span>
          </button>

          <button
            onClick={() => setActiveTab('buying_frequency')}
            className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'buying_frequency'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>2. نمط الشراء</span>
          </button>

          <button
            onClick={() => setActiveTab('favorite_products')}
            className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'favorite_products'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>3. المنتجات</span>
          </button>

          <button
            onClick={() => setActiveTab('product_dropoff')}
            className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'product_dropoff'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-amber-300" />
            <span>4. فرص الاسترجاع</span>
          </button>

          <button
            onClick={() => setActiveTab('cross_sell')}
            className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'cross_sell'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>5. البيع الإضافي</span>
          </button>

          <button
            onClick={() => setActiveTab('salespeople')}
            className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'salespeople'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>6. المندوبون</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>7. الطلبات</span>
          </button>

          <button
            onClick={() => setActiveTab('risk')}
            className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'risk'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
            <span>8. المخاطر</span>
          </button>
        </div>

        {/* ==================== TAB 1: Overview (نظرة عامة) ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loading360 ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">{isAr ? 'جاري تحميل ملف العميل 360...' : 'Loading Customer 360 profile...'}</p>
              </div>
            ) : error360 ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error360}</span>
                </div>
                <button onClick={fetch360} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors">
                  إعادة المحاولة
                </button>
              </div>
            ) : !c360 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">العميل غير موجود في قاعدة البيانات المباشرة</p>
                <p className="text-xs text-slate-500">Customer record not found for ID {customerId}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Contact Strip */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{isAr ? 'حالة العميل' : 'Status'}</span>
                    <div className="mt-1">{getStatusBadge(c360.customerStatus)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{isAr ? 'الهاتف' : 'Phone'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mt-1">{c360.phone || 'غير متاح'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{isAr ? 'الجوال' : 'Mobile'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mt-1">{c360.mobile || 'غير متاح'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mt-1 truncate">{c360.email || 'غير متاح'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{isAr ? 'المدينة' : 'City'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mt-1">{c360.city || 'غير متاح'}</span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                    <span className="text-slate-500 font-semibold block text-[10px]">{isAr ? 'طلبات الفترة المختارة' : 'Period Orders'}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">{c360.periodOrders} طلبات</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                    <span className="text-slate-500 font-semibold block text-[10px]">{isAr ? 'مبيعات الفترة المختارة' : 'Period Sales'}</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 block mt-0.5">{formatEgp(c360.periodSales)}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">{isAr ? 'متوسط قيمة الطلب' : 'Average Order Value'}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">{formatEgp(c360.averageOrderValue)}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">{isAr ? 'متوسط الأيام بين الطلبات' : 'Avg Order Interval'}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">
                      {c360.averageDaysBetweenOrders > 0 ? `${c360.averageDaysBetweenOrders.toFixed(1)} أيام` : 'غير متاح'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">{isAr ? 'أول طلب بالشركة' : 'First Order Date'}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1 font-mono">{c360.firstOrderDate || 'غير متاح'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">{isAr ? 'آخر طلب منجَز' : 'Last Order Date'}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1 font-mono">{c360.lastOrderDate || 'غير متاح'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">{isAr ? 'الأيام منذ آخر طلب' : 'Days Silent'}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">{c360.daysSinceLastOrder} أيام</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">{isAr ? 'عدد المنتجات الفريدة' : 'Unique Products'}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">
                      {c360.uniqueProductsCount > 0 ? c360.uniqueProductsCount : 'غير متاح'}
                    </span>
                  </div>
                </div>

                {/* Lifetime Performance Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-700 pb-2">
                    <span className="font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      {isAr ? 'المبيعات والطلبات التراكمية مدى الحياة' : 'Lifetime Cumulative Performance'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">{isAr ? 'إجمالي الطلبات التراكمية:' : 'Lifetime Orders:'}</span>
                      <span className="text-2xl font-black text-white">{c360.lifetimeOrders} طلبات</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">{isAr ? 'إجمالي المبيعات التراكمية:' : 'Lifetime Sales:'}</span>
                      <span className="text-2xl font-black text-emerald-400">{formatEgp(c360.lifetimeSales)}</span>
                    </div>
                  </div>
                </div>

                {/* Monthly Trend Bars */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>{isAr ? 'مسار المبيعات الشهرية' : 'Monthly Sales Trend'}</span>
                  </h3>
                  {loadingTrend ? (
                    <div className="p-4 text-center text-xs text-slate-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
                  ) : errorTrend ? (
                    <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center justify-between">
                      <span>{errorTrend}</span>
                      <button onClick={fetchTrend} className="font-bold underline">إعادة المحاولة</button>
                    </div>
                  ) : trends.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      لا توجد بيانات مسار زمني متاحة
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      {trends.map((t, idx) => {
                        const maxSales = Math.max(...trends.map(x => x.salesValue), 1);
                        const pct = Math.min(100, Math.max(10, (t.salesValue / maxSales) * 100));
                        return (
                          <div key={`${t.orderMonth}_${idx}`} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{t.orderMonth}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500">{t.ordersCount} طلبات</span>
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{formatEgp(t.salesValue)}</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: Buying Pattern (نمط الشراء) ==================== */}
        {activeTab === 'buying_frequency' && (
          <div className="space-y-6">
            {loadingFreq ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">جاري حساب وتعديل نمط شراء العميل...</p>
              </div>
            ) : errorFreq ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorFreq}</span>
                </div>
                <button onClick={fetchBuyingFrequency} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors">
                  إعادة المحاولة
                </button>
              </div>
            ) : !buyingFreq ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-xs text-slate-500 font-bold">لا توجد بيانات نمط شراء مسجلة لهذا العميل</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Frequency Banner Header */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">حالة التوقيت التشغيلي للشراء</span>
                    <div className="flex items-center gap-3">
                      {getFrequencyBadge(buyingFreq.frequencyStatus)}
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                        آخر طلب: <strong>{buyingFreq.lastOrderDate || 'غير متاح'}</strong> ({buyingFreq.daysSinceLastOrder} أيام مضت)
                      </span>
                    </div>
                  </div>
                  {buyingFreq.expectedNextOrderDate && (
                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
                      <span className="text-slate-500 text-[10px] block font-semibold">تاريخ الطلب المتوقع القادم:</span>
                      <span className="font-black text-blue-700 dark:text-blue-300 font-mono">{buyingFreq.expectedNextOrderDate}</span>
                    </div>
                  )}
                </div>

                {/* Notice Box */}
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    حالة نمط الشراء تعكس التوقيت التشغيلي للطلب بناءً على فترات الشراء السابقة ولا تعبر بمفردها عن مخاطر العميل.
                  </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">إجمالي الطلبات:</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">{buyingFreq.ordersCount} طلبات</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">أيام الشراء النشطة:</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">{buyingFreq.activeDays} يوم</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">متوسط الأيام بين الطلبات:</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 block mt-0.5">{buyingFreq.averageDaysBetweenOrders.toFixed(2)} أيام</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">الوسيط الفعلي للأيام بين الطلبات:</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">{buyingFreq.medianDaysBetweenOrders} أيام</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">أول طلب مسجَّل:</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1 font-mono">{buyingFreq.firstOrderDate || 'غير متاح'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">آخر طلب مسجَّل:</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1 font-mono">{buyingFreq.lastOrderDate || 'غير متاح'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">الأيام منذ آخر طلب:</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">{buyingFreq.daysSinceLastOrder} يوم</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">حالة الالتزام بالنظام:</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1">{buyingFreq.frequencyStatus}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: Favorite Products (المنتجات المفضلة) ==================== */}
        {activeTab === 'favorite_products' && (
          <div className="space-y-6">
            {loadingFav ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">جاري تحليل المنتجات المفضلة للعميل...</p>
              </div>
            ) : errorFav ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorFav}</span>
                </div>
                <button onClick={fetchFavoriteProducts} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors">
                  إعادة المحاولة
                </button>
              </div>
            ) : favProducts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-xs text-slate-500 font-bold">لا توجد منتجات مسجلة لهذا العميل في هذه الفترة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Concentration Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[10px] font-bold uppercase block">تركيز المنتج الأول</span>
                      <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 block">{topProductShare.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block truncate max-w-[200px]">{favProducts[0]?.productName}</span>
                    </div>
                    <PieChart className="w-8 h-8 text-blue-500 opacity-60 shrink-0" />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[10px] font-bold uppercase block">تركيز أعلى 3 منتجات</span>
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">{top3ProductShare.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">من إجمالي مشتريات العميل</span>
                    </div>
                    <Layers className="w-8 h-8 text-indigo-500 opacity-60 shrink-0" />
                  </div>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">المنتج</th>
                        <th className="p-2.5">عدد الطلبات</th>
                        <th className="p-2.5">الكمية الإجمالية</th>
                        <th className="p-2.5">إجمالي المبيعات</th>
                        <th className="p-2.5">حصة المبيعات %</th>
                        <th className="p-2.5">آخر طلب</th>
                        <th className="p-2.5">المندوب الرئيسي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {favProducts.map((p, idx) => (
                        <tr key={`${p.productId}_${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold font-sans text-slate-900 dark:text-white">
                            {onSelectProduct ? (
                              <button
                                onClick={() => onSelectProduct(p.productId)}
                                className="text-blue-600 dark:text-blue-400 hover:underline text-right"
                              >
                                {p.productName}
                              </button>
                            ) : (
                              p.productName
                            )}
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">{p.ordersCount}</td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">{p.quantity.toLocaleString('ar-EG')}</td>
                          <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">{formatEgp(p.salesValue)}</td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, p.salesSharePct)}%` }} />
                              </div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{p.salesSharePct.toFixed(2)}%</span>
                            </div>
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{p.lastOrderDate || 'غير متاح'}</td>
                          <td className="p-2.5 font-sans text-slate-600 dark:text-slate-400">{p.primarySalesperson || 'غير محدد'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: Product Dropoff / Recovery (فرص الاسترجاع) ==================== */}
        {activeTab === 'product_dropoff' && (
          <div className="space-y-6">
            {loadingDropoff ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">جاري حساب فجوات وفرص استرجاع المنتجات للعميل...</p>
              </div>
            ) : errorDropoff ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorDropoff}</span>
                </div>
                <button onClick={fetchProductDropoff} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors">
                  إعادة المحاولة
                </button>
              </div>
            ) : dropoffProducts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-xs text-slate-500 font-bold">لا توجد فجوات شراء أو انخفاض في أصناف هذا العميل</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Total Recovery Header */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950 to-slate-900 border border-rose-900/60 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-rose-300 font-bold uppercase block">إجمالي فرصة استرجاع الأصناف المتوقفة والمتقاطعة</span>
                    <span className="text-2xl font-black text-rose-400 mt-0.5 block">{formatEgp(totalRecoveryOpportunity)}</span>
                  </div>
                  <TrendingDown className="w-8 h-8 text-rose-400 shrink-0" />
                </div>

                {/* Dropoff Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">المنتج</th>
                        <th className="p-2.5">المبيعات السابقة</th>
                        <th className="p-2.5">المبيعات الحالية</th>
                        <th className="p-2.5">الكمية السابقة / الحالية</th>
                        <th className="p-2.5">التغير %</th>
                        <th className="p-2.5">الحالة</th>
                        <th className="p-2.5">قيمة الاسترجاع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {dropoffProducts.map((p, idx) => (
                        <tr key={`${p.productId}_${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold font-sans text-slate-900 dark:text-white">
                            {onSelectProduct ? (
                              <button
                                onClick={() => onSelectProduct(p.productId)}
                                className="text-blue-600 dark:text-blue-400 hover:underline text-right"
                              >
                                {p.productName}
                              </button>
                            ) : (
                              p.productName
                            )}
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">{formatEgp(p.previousSales)}</td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">{formatEgp(p.currentSales)}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">
                            {p.previousQuantity.toLocaleString('ar-EG')} / {p.currentQuantity.toLocaleString('ar-EG')}
                          </td>
                          <td className="p-2.5">
                            <span className={`font-bold ${p.salesChangePct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {p.salesChangePct > 0 ? `+${p.salesChangePct.toFixed(1)}%` : `${p.salesChangePct.toFixed(1)}%`}
                            </span>
                          </td>
                          <td className="p-2.5">{getDropoffBadge(p.status)}</td>
                          <td className="p-2.5 font-bold text-rose-600 dark:text-rose-400">{formatEgp(p.recoveryValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 5: Cross Sell Candidates (فرص البيع الإضافي) ==================== */}
        {activeTab === 'cross_sell' && (
          <div className="space-y-6">
            {loadingCrossSell ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">جاري استخراج فرص البيع الإضافي المبنية على سلوك عملاء مشابهين...</p>
              </div>
            ) : errorCrossSell ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorCrossSell}</span>
                </div>
                <button onClick={fetchCrossSell} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors">
                  إعادة المحاولة
                </button>
              </div>
            ) : crossSellList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-xs text-slate-500 font-bold">لا توجد مرشحات بيع إضافي لهذا العميل</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Notice Banner */}
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-2 text-xs text-indigo-900 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">فرص البيع الإضافي المبنية على سلوك عملاء مشابهين</h4>
                    <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed mt-0.5">
                      هذه الدرجة مشتقة من أداء منتجات تم شراؤها بواسطة عملاء لهم نمط شرائي مماثل.
                    </p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">المنتج المقترح</th>
                        <th className="p-2.5">عدد العملاء المماثلين</th>
                        <th className="p-2.5">طلبات المماثلين</th>
                        <th className="p-2.5">مبيعات المماثلين</th>
                        <th className="p-2.5">درجة الملاءمة (Affinity Score)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {crossSellList.map((p, idx) => (
                        <tr key={`${p.productId}_${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold font-sans text-slate-900 dark:text-white">
                            {onSelectProduct ? (
                              <button
                                onClick={() => onSelectProduct(p.productId)}
                                className="text-blue-600 dark:text-blue-400 hover:underline text-right"
                              >
                                {p.productName}
                              </button>
                            ) : (
                              p.productName
                            )}
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">{p.peerCustomersCount} عملاء</td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">{p.peerOrdersCount} طلبات</td>
                          <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">{formatEgp(p.peerSalesValue)}</td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, p.affinityScore)}%` }} />
                              </div>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">{p.affinityScore.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 6: Salespeople History (المندوبون) ==================== */}
        {activeTab === 'salespeople' && (
          <div className="space-y-6">
            {loadingSalesHistory ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">جاري تحميل سجل انتقال ملكية العميل بين المندوبين...</p>
              </div>
            ) : errorSalesHistory ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorSalesHistory}</span>
                </div>
                <button onClick={fetchSalesHistory} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors">
                  إعادة المحاولة
                </button>
              </div>
            ) : salesHistory.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-xs text-slate-500 font-bold">لا يوجد سجل تاريخي للمندوبين لهذا العميل</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Ownership Stability Banner */}
                {isSalespersonStable ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">ملكية مستقرة للعميل: </span>
                      <span>تتحقق جميع المبيعات بشكل مستقر تحت إشراف المندوب <strong>{salesHistory[0]?.salespersonName}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold">سجل تغير المندوبين: </span>
                      <span>تم رصد انتقال في ملكية العميل أو تداول الخدمة بين أكثر من مندوب خلال الأشهر السابقة.</span>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">الشهر</th>
                        <th className="p-2.5">المندوب</th>
                        <th className="p-2.5">عدد الطلبات</th>
                        <th className="p-2.5">المبيعات</th>
                        <th className="p-2.5">أول طلب</th>
                        <th className="p-2.5">آخر طلب</th>
                        <th className="p-2.5">الصفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {salesHistory.map((h, idx) => (
                        <tr key={`${h.orderMonth}_${h.salespersonName}_${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{h.orderMonth}</td>
                          <td className="p-2.5 font-sans font-bold text-blue-600 dark:text-blue-400">{h.salespersonName}</td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">{h.ordersCount} طلبات</td>
                          <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">{formatEgp(h.salesValue)}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{h.firstOrderDate || 'غير متاح'}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{h.lastOrderDate || 'غير متاح'}</td>
                          <td className="p-2.5">
                            {h.isPrimary ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                المندوب الرئيسي
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                مندوب ثانوي
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 7: Orders List (الطلبات) ==================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {loadingOrders ? (
              <div className="p-8 text-center text-xs text-slate-500 font-semibold">{isAr ? 'جاري تحميل الطلبات...' : 'Loading orders...'}</div>
            ) : errorOrders ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-center justify-between">
                <span>{errorOrders}</span>
                <button onClick={fetchOrders} className="font-bold underline">إعادة المحاولة</button>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                لا توجد طلبات مسجلة للعميل خلال هذه الفترة
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">رقم الطلب</th>
                        <th className="p-2.5">التاريخ</th>
                        <th className="p-2.5">الشركة</th>
                        <th className="p-2.5">المندوب</th>
                        <th className="p-2.5">قيمة الطلب</th>
                        <th className="p-2.5">البنود</th>
                        <th className="p-2.5">المنتجات</th>
                        <th className="p-2.5">الكمية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {orders.map((o, idx) => (
                        <tr key={`${o.orderId}_${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400">{o.orderName}</td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">{o.orderDate}</td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300 font-sans">{o.companyName}</td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300 font-sans">{o.salesperson}</td>
                          <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">{formatEgp(o.orderValue)}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{o.linesCount}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{o.productsCount}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{o.totalQty.toLocaleString('ar-EG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Orders Pagination Controls */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">صفحة {ordersPage}</span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={ordersPage <= 1}
                      onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      disabled={orders.length < ordersPerPage}
                      onClick={() => setOrdersPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 8: Customer Risk (المخاطر) ==================== */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            {loadingRisk ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">جاري حساب وتقييم مؤشرات مخاطر العميل...</p>
              </div>
            ) : errorRisk ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorRisk}</span>
                </div>
                <button onClick={fetchRisk} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors">
                  إعادة المحاولة
                </button>
              </div>
            ) : !riskData ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-xs text-slate-500 font-bold">لا توجد بيانات مخاطر مسجلة لهذا العميل</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Risk Level Header Card */}
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-slate-600 dark:text-slate-300 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">مستوى مخاطر العميل الحالي</span>
                        <div className="flex items-center gap-2 mt-1">
                          {getRiskBadge(riskData.riskLevel)}
                          {getPriorityBadge(riskData.recoveryPriority)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {riskData.riskReason && (
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">سبب تقييم المخاطر:</span>
                      <p className="text-slate-800 dark:text-slate-200 font-semibold mt-0.5">{riskData.riskReason}</p>
                    </div>
                  )}
                </div>

                {/* Risk Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">مبيعات آخر 30 يوماً:</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">{formatEgp(riskData.recent30DaySales)}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">مبيعات الـ 30 يوماً السابقة:</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">{formatEgp(riskData.previous30DaySales)}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">تغير المبيعات %:</span>
                    <span className={`text-lg font-black block mt-0.5 ${riskData.salesChangePct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {riskData.salesChangePct > 0 ? `+${riskData.salesChangePct.toFixed(2)}%` : `${riskData.salesChangePct.toFixed(2)}%`}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">الأيام منذ آخر طلب:</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">{riskData.daysSinceLastOrder} أيام</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">وسيط فترات الشراء:</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 block mt-0.5">{riskData.medianBuyingInterval} أيام</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-semibold block text-[10px]">تاريخ آخر طلب:</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1 font-mono">{riskData.lastOrderDate || 'غير متاح'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
