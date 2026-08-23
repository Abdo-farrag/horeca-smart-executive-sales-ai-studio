import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  Layers,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Tag,
  DollarSign,
  ShoppingCart,
  Users,
  Building2,
  Calendar,
  ArrowUpDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useProductDashboard } from '../hooks/useProductDashboard';
import { Product360Panel } from '../components/Product360Panel';
import { ProductSummaryResult } from '../analytics/types';
import { Customer360Panel } from '../components/Customer360Panel';

type SortField = 'salesValue' | 'quantitySold' | 'ordersCount' | 'uniqueCustomers' | 'averageUnitValue';

export const ProductDashboard: React.FC = () => {
  const { language, filters, setSelectedCustomer, setSelectedRep, setCurrentView } = useApp();
  const isAr = language === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('salesValue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  
  const [selectedCustomerFor360, setSelectedCustomerFor360] = useState<{ id: number; name: string } | null>(null);

  const [page, setPage] = useState<number>(1);
  const itemsPerPage = 25;

  const productDashboardOptions = useMemo(() => ({
    search: searchTerm || null,
    limit: 1000,
    offset: 0,
  }), [searchTerm]);

  const {
    data,
    loading,
    error,
    reconciliation,
    reconciliationLoading,
    reconciliationError,
    refetch
  } = useProductDashboard(filters, productDashboardOptions);

  // Client-side sorting & pagination
  const sortedData = useMemo(() => {
    let result = [...data];

    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        p =>
          p.productName.toLowerCase().includes(q) ||
          String(p.productId).includes(q) ||
          (p.productCategory && p.productCategory.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchTerm, sortField, sortAsc]);

  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, page, itemsPerPage]);

  // Live KPI totals derived strictly from returned live rows
  const kpis = useMemo(() => {
    const productsCount = data.length;
    const totalSales = data.reduce((sum, p) => sum + (p.salesValue || 0), 0);
    const totalQty = data.reduce((sum, p) => sum + (p.quantitySold || 0), 0);
    const totalOrders = data.reduce((sum, p) => sum + (p.ordersCount || 0), 0);
    const totalCustomers = data.reduce((sum, p) => sum + (p.uniqueCustomers || 0), 0);
    const avgSalesPerProduct = productsCount > 0 ? totalSales / productsCount : 0;

    return {
      productsCount,
      totalSales,
      totalQty,
      totalOrders,
      totalCustomers,
      avgSalesPerProduct,
    };
  }, [data]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              [SECTION STATUS: Live]
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              [Categories: Pending Data Quality]
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {isAr ? 'لوحة تحليلات المنتجات المباشرة (Live Product Dashboard)' : 'Live Product Dashboard & Product 360'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr ? 'بيانات المبيعات والكميات والعملاء الحية لكل منتج مباشرة من قاعدة البيانات Semantic Layer' : 'Live product volume, sales, and buyer intelligence from approved Supabase RPCs'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 rtl:right-3 ltr:left-3 ltr:right-auto" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder={isAr ? 'بحث بالمنتج أو الرقم...' : 'Search product or ID...'}
              className="pr-9 pl-3 ltr:pl-9 ltr:pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none w-48 sm:w-64"
            />
          </div>

          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            title={isAr ? 'تحديث البيانات' : 'Refresh'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Reconciliation Status Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              reconciliation?.status === 'verified'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
            }`}>
              {reconciliation?.status === 'verified' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {isAr ? 'مطابقة المبيعات الإجمالية (Global Sales Reconciliation)' : 'Global Sales Reconciliation'}
                </h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  reconciliation?.status === 'verified'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                }`}>
                  {reconciliationLoading
                    ? (isAr ? 'جاري التحقق...' : 'Checking...')
                    : reconciliation?.status === 'verified'
                    ? (isAr ? 'مستقر ومطابق (Verified)' : 'Verified')
                    : (isAr ? 'تفاوت (Mismatch)' : 'Mismatch')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'التحقق من إجمالي مبيعات الطلبات مقابل مجموع قيم بنود المنتجات'
                  : 'Order header sales vs aggregated product line items'}
              </p>
            </div>
          </div>

          {reconciliationError ? (
            <div className="text-xs text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/30 p-2 rounded-xl border border-rose-200 dark:border-rose-800">
              {reconciliationError}
            </div>
          ) : reconciliation && !reconciliationLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'مبيعات الطلبات' : 'Order Sales'}</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {reconciliation.orderSales.toLocaleString('ar-EG')} ج.م
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'مبيعات بنود المنتجات' : 'Product Line Sales'}</div>
                <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {reconciliation.productLineSales.toLocaleString('ar-EG')} ج.م
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'الفروقات' : 'Difference'}</div>
                <div className={`font-bold mt-0.5 ${reconciliation.differenceValue === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {reconciliation.differenceValue.toLocaleString('ar-EG')} ج.م
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'نسبة المطابقة' : 'Coverage %'}</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {reconciliation.reconciliationPct.toFixed(2)}%
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ABC/XYZ Methodology Notice */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{isAr ? 'مصفوفة ABC / XYZ للمنتجات:' : 'ABC / XYZ Matrix:'}</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                [SECTION STATUS: Pending Methodology Approval]
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              {isAr
                ? 'سيتم احتساب تصنيفات ABC/XYZ فور الاعتماد بناءً على بيانات الطلب التاريخية.'
                : 'ABC/XYZ classifications will be calculated upon methodology approval from historical demand data.'}
            </p>
          </div>
        </div>
      </div>

      {/* Top Live KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'عدد المنتجات' : 'Products'}</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
            {loading ? '-' : kpis.productsCount.toLocaleString('ar-EG')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'إجمالي مبيعات المنتجات' : 'Product Sales'}</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {loading ? '-' : `${kpis.totalSales.toLocaleString('ar-EG')} ج.م`}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'الكمية المباعة' : 'Quantity Sold'}</span>
            <ShoppingCart className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
            {loading ? '-' : kpis.totalQty.toLocaleString('ar-EG')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'إجمالي الطلبات' : 'Total Orders'}</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
            {loading ? '-' : kpis.totalOrders.toLocaleString('ar-EG')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'إجمالي العملاء' : 'Unique Customers'}</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
            {loading ? '-' : kpis.totalCustomers.toLocaleString('ar-EG')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'متوسط مبيعات المنتج' : 'Avg / Product'}</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
            {loading ? '-' : `${kpis.avgSalesPerProduct.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م`}
          </div>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              {isAr ? 'قائمة المنتجات المباشرة (Product Leaderboard)' : 'Live Product Leaderboard'}
            </h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              [SECTION STATUS: Live]
            </span>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {isAr
              ? `عرض ${paginatedData.length} من إجمالي ${totalItems} منتج`
              : `Showing ${paginatedData.length} of ${totalItems} products`}
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">{isAr ? 'جاري تحميل قائمة المنتجات من أودو...' : 'Fetching live product summary...'}</p>
          </div>
        ) : error ? (
          <div className="p-8 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-700 dark:text-rose-300 font-bold">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500 font-bold">{isAr ? 'لم يتم العثور على منتجات مطابقة للبحث' : 'No products found'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">{isAr ? 'اسم المنتج' : 'Product Name'}</th>
                    <th className="p-3">{isAr ? 'كود/معرف المنتج' : 'Product ID'}</th>
                    <th className="p-3">{isAr ? 'الفئة' : 'Category'}</th>
                    <th
                      onClick={() => toggleSort('ordersCount')}
                      className="p-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors font-mono"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isAr ? 'الطلبات' : 'Orders'}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('uniqueCustomers')}
                      className="p-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors font-mono"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isAr ? 'العملاء' : 'Customers'}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('quantitySold')}
                      className="p-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors font-mono"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isAr ? 'الكمية المباعة' : 'Quantity'}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('salesValue')}
                      className="p-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors font-mono"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isAr ? 'المبيعات' : 'Sales'}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('averageUnitValue')}
                      className="p-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors font-mono"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isAr ? 'متوسط سعر الوحدة' : 'Avg Unit Value'}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3">{isAr ? 'أول/آخر طلب' : 'First/Last Order'}</th>
                    <th className="p-3 font-mono">{isAr ? 'المندوبين' : 'Salespeople'}</th>
                    <th className="p-3 font-mono">{isAr ? 'الشركات' : 'Companies'}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedData.map((prod, idx) => {
                    const rank = (page - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr
                        key={`${prod.productId}_${idx}`}
                        onClick={() => {
                          setSelectedProductId(prod.productId);
                          setSelectedProductName(prod.productName);
                        }}
                        className="hover:bg-blue-50/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <td className="p-3 text-center font-bold text-slate-400 font-mono text-[11px]">{rank}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{prod.productName}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">#{prod.productId}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">
                          {prod.productCategory ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {prod.productCategory}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                              غير مصنف
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200 font-mono">{prod.ordersCount}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200 font-mono">{prod.uniqueCustomers}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200 font-mono">{prod.quantitySold.toLocaleString('ar-EG')}</td>
                        <td className="p-3 font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                          {prod.salesValue.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {prod.averageUnitValue.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="p-3 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                          <div>{prod.firstOrderDate || '-'}</div>
                          <div className="text-slate-400">➔ {prod.lastOrderDate || '-'}</div>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-mono text-center">{prod.activeSalespeople}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-mono text-center">{prod.companiesCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="text-slate-500">
                  {isAr ? `الصفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                  </button>
                  <span className="font-bold px-2">{page}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Product 360 Panel Modal */}
      {selectedProductId !== null && (
        <Product360Panel
          productId={selectedProductId}
          productName={selectedProductName}
          filters={filters}
          language={language}
          onClose={() => setSelectedProductId(null)}
          onSelectCustomer={(custReqId, custReqName) => {
            setSelectedCustomerFor360({ id: custReqId, name: custReqName });
          }}
          onSelectSalesperson={(salespersonName) => {
            // Select rep and navigate to sales rep view if desired
            if (setSelectedRep) {
              setSelectedRep({
                id: salespersonName,
                nameAr: salespersonName,
                nameEn: salespersonName,
                code: salespersonName,
                avatar: '',
                company: 'Horeca Smart',
                primaryArea: 'Cairo',
                totalSalesYtd: 0,
                monthlyTarget: 0,
                monthlyAchieved: 0,
                targetAchievementPercent: 0,
                totalCustomers: 0,
                activeCustomers: 0
              } as any);
              setCurrentView('sales_rep');
            }
          }}
        />
      )}

      {/* Customer 360 Panel Modal (opened from Top Customers list in Product 360) */}
      {selectedCustomerFor360 !== null && (
        <Customer360Panel
          customerId={selectedCustomerFor360.id}
          customerName={selectedCustomerFor360.name}
          filters={filters}
          language={language}
          onClose={() => setSelectedCustomerFor360(null)}
        />
      )}

    </div>
  );
};
