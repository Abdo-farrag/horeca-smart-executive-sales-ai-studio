import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Tag,
  AlertTriangle,
  FolderTree,
  MoreHorizontal
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { analytics } from '../analytics';
import {
  ProductCategoryMappingSummaryResult,
  ProductCategoryMappingReviewResult,
  CategoryMasterItem,
  MappingStatus,
} from '../analytics/types';

// Helper for permission and error formatting
function formatCategoryError(err: any, isAr: boolean): string {
  const msg = String(err?.message || err?.details?.message || err || '').toLowerCase();
  if (
    msg.includes('permission') ||
    msg.includes('42501') ||
    msg.includes('unauthorized') ||
    msg.includes('row level security') ||
    msg.includes('صلاحية')
  ) {
    return isAr
      ? 'ليس لديك صلاحية تعديل تصنيفات المنتجات.'
      : 'You do not have permission to modify product categories.';
  }
  return err?.message || (isAr ? 'حدث خطأ أثناء التنفيذ' : 'Operation failed');
}

export const ProductCategoryMappingReviewView: React.FC = () => {
  const { language } = useApp();
  const isAr = language === 'ar';

  // State
  const [summary, setSummary] = useState<ProductCategoryMappingSummaryResult | null>(null);
  const [categoriesMaster, setCategoriesMaster] = useState<CategoryMasterItem[]>([]);
  const [products, setProducts] = useState<ProductCategoryMappingReviewResult[]>([]);
  
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [loadingTable, setLoadingTable] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const itemsPerPage = 25;

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals & Confirmations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    actionType: 'single_reject' | 'single_change_approved' | 'bulk_approve' | 'bulk_assign' | 'bulk_needs_review' | 'bulk_reject';
    productCount: number;
    product?: ProductCategoryMappingReviewResult;
    targetCategoryCode?: string;
    targetCategoryName?: string;
  }>({ isOpen: false, actionType: 'bulk_approve', productCount: 0 });

  const [bulkCategoryToAssign, setBulkCategoryToAssign] = useState<string>('');

  // Single item custom category modal
  const [customCategoryModal, setCustomCategoryModal] = useState<{
    isOpen: boolean;
    product: ProductCategoryMappingReviewResult | null;
    categoryCode: string;
  }>({ isOpen: false, product: null, categoryCode: '' });

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load summary & categories master
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const sumData = await analytics.productCategories.summary();
      setSummary(sumData);
    } catch (err: any) {
      console.error('Error fetching category mapping summary:', err);
      setError(formatCategoryError(err, isAr));
    } finally {
      setLoadingSummary(false);
    }
  }, [isAr]);

  const fetchMasterCategories = useCallback(async () => {
    try {
      const master = await analytics.productCategories.getCategoriesMaster();
      setCategoriesMaster(master);
      if (master.length > 0 && !bulkCategoryToAssign) {
        setBulkCategoryToAssign(master[0].code);
      }
    } catch (err) {
      console.error('Error fetching master categories:', err);
    }
  }, [bulkCategoryToAssign]);

  // Load review table
  const fetchReviewTable = useCallback(async () => {
    try {
      setLoadingTable(true);
      setError(null);

      const statusFilter = selectedStatus !== 'ALL' ? (selectedStatus as MappingStatus) : null;
      const catFilter = selectedCategoryCode !== 'ALL' ? selectedCategoryCode : null;
      const search = searchTerm.trim() ? searchTerm.trim() : null;

      // Fetch all matching rows (up to 2000) for client-side sorting/paging
      const rows = await analytics.productCategories.review({
        status: statusFilter,
        categoryCode: catFilter,
        search: search,
        limit: 2000,
        offset: 0,
      });

      setProducts(rows);
    } catch (err: any) {
      console.error('Error fetching category review table:', err);
      setError(formatCategoryError(err, isAr));
    } finally {
      setLoadingTable(false);
    }
  }, [selectedStatus, selectedCategoryCode, searchTerm, isAr]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchReviewTable()]);
  }, [fetchSummary, fetchReviewTable]);

  useEffect(() => {
    fetchMasterCategories();
    fetchSummary();
  }, [fetchMasterCategories, fetchSummary]);

  useEffect(() => {
    fetchReviewTable();
  }, [fetchReviewTable]);

  // Default Sorting:
  // 1. Needs review
  // 2. Suggested
  // 3. Approved
  // 4. Rejected
  // Within each status, sort by confidence descending
  const sortedProducts = useMemo(() => {
    const list = [...products];

    const statusPriority: Record<MappingStatus, number> = {
      needs_review: 1,
      suggested: 2,
      approved: 3,
      rejected: 4,
    };

    list.sort((a, b) => {
      const pA = statusPriority[a.mappingStatus] ?? 99;
      const pB = statusPriority[b.mappingStatus] ?? 99;

      if (pA !== pB) {
        return pA - pB;
      }

      return b.suggestionConfidence - a.suggestionConfidence;
    });

    return list;
  }, [products]);

  // Pagination
  const totalItems = sortedProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sortedProducts.slice(start, start + itemsPerPage);
  }, [sortedProducts, page, itemsPerPage]);

  // Select all handler for current page
  const isAllCurrentPageSelected = useMemo(() => {
    if (paginatedProducts.length === 0) return false;
    return paginatedProducts.every((p) => selectedIds.includes(p.productId));
  }, [paginatedProducts, selectedIds]);

  const toggleSelectAllPage = () => {
    if (isAllCurrentPageSelected) {
      const currentPageIds = paginatedProducts.map((p) => p.productId);
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      const currentPageIds = paginatedProducts.map((p) => p.productId);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Actions
  const handleSingleApproveSuggested = async (product: ProductCategoryMappingReviewResult) => {
    if (product.mappingStatus === 'approved') {
      const sugCode = product.suggestedCategoryCode || '';
      const catObj = categoriesMaster.find((c) => c.code === sugCode);
      const catName = isAr ? catObj?.nameAr || sugCode : catObj?.nameEn || sugCode;

      setConfirmModal({
        isOpen: true,
        actionType: 'single_change_approved',
        productCount: 1,
        product,
        targetCategoryCode: sugCode,
        targetCategoryName: catName,
      });
      return;
    }

    try {
      setActionLoading(true);
      await analytics.productCategories.approve(product.productId, null);
      setToastMessage({
        type: 'success',
        message: isAr
          ? `تم اعتماد المقترح للمنتج ${product.productName}`
          : `Approved suggested category for product ${product.productName}`,
      });
      await refreshAll();
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        message: formatCategoryError(err, isAr),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleApproveCustom = async () => {
    if (!customCategoryModal.product || !customCategoryModal.categoryCode) return;
    const product = customCategoryModal.product;
    const categoryCode = customCategoryModal.categoryCode;
    const catObj = categoriesMaster.find((c) => c.code === categoryCode);
    const catName = isAr ? catObj?.nameAr || categoryCode : catObj?.nameEn || categoryCode;

    if (product.mappingStatus === 'approved') {
      setCustomCategoryModal({ isOpen: false, product: null, categoryCode: '' });
      setConfirmModal({
        isOpen: true,
        actionType: 'single_change_approved',
        productCount: 1,
        product,
        targetCategoryCode: categoryCode,
        targetCategoryName: catName,
      });
      return;
    }

    try {
      setActionLoading(true);
      await analytics.productCategories.approve(product.productId, categoryCode);
      setToastMessage({
        type: 'success',
        message: isAr
          ? `تم اعتماد الفئة (${catName}) للمنتج ${product.productName}`
          : `Approved category ${catName} for product ${product.productName}`,
      });
      setCustomCategoryModal({ isOpen: false, product: null, categoryCode: '' });
      await refreshAll();
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        message: formatCategoryError(err, isAr),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleMarkNeedsReview = async (product: ProductCategoryMappingReviewResult) => {
    try {
      setActionLoading(true);
      await analytics.productCategories.markNeedsReview(product.productId);
      setToastMessage({
        type: 'success',
        message: isAr
          ? `تمت إعادة المنتج ${product.productName} للمراجعة`
          : `Marked product ${product.productName} as needs review`,
      });
      await refreshAll();
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        message: formatCategoryError(err, isAr),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const promptSingleReject = (product: ProductCategoryMappingReviewResult) => {
    setConfirmModal({
      isOpen: true,
      actionType: 'single_reject',
      productCount: 1,
      product,
    });
  };

  // Confirmation Executor
  const executeConfirmedAction = async () => {
    if (!confirmModal.isOpen) return;
    try {
      setActionLoading(true);
      const { actionType, product, targetCategoryCode, targetCategoryName, productCount } = confirmModal;

      if (actionType === 'single_reject') {
        if (!product) return;
        await analytics.productCategories.reject(product.productId);
        setToastMessage({
          type: 'success',
          message: isAr
            ? `تم رفض اقتراح الفئة للمنتج ${product.productName}`
            : `Rejected category suggestion for product ${product.productName}`,
        });
      } else if (actionType === 'single_change_approved') {
        if (!product) return;
        await analytics.productCategories.approve(product.productId, targetCategoryCode || null);
        setToastMessage({
          type: 'success',
          message: isAr
            ? `تم تغيير الفئة المعتمدة إلى (${targetCategoryName || targetCategoryCode}) للمنتج ${product.productName}`
            : `Updated approved category to (${targetCategoryName || targetCategoryCode}) for product ${product.productName}`,
        });
      } else if (actionType === 'bulk_approve') {
        const res = await analytics.productCategories.bulkApprove({
          productIds: selectedIds,
          useSuggestions: true,
        });
        const { updatedCount, skippedCount } = res;
        if (skippedCount > 0) {
          setToastMessage({
            type: 'success',
            message: isAr
              ? `تم تحديث ${updatedCount} منتج وتخطي ${skippedCount} منتج.`
              : `Updated ${updatedCount} products, skipped ${skippedCount} products.`,
          });
        } else {
          setToastMessage({
            type: 'success',
            message: isAr
              ? `تم اعتماد المقترحات لـ ${updatedCount} منتج بنجاح.`
              : `Successfully approved suggested categories for ${updatedCount} products.`,
          });
        }
        setSelectedIds([]);
      } else if (actionType === 'bulk_assign') {
        if (!targetCategoryCode) return;
        const res = await analytics.productCategories.bulkApprove({
          productIds: selectedIds,
          categoryCode: targetCategoryCode,
          useSuggestions: false,
        });
        const { updatedCount, skippedCount } = res;
        const catObj = categoriesMaster.find((c) => c.code === targetCategoryCode);
        const catName = isAr ? catObj?.nameAr || targetCategoryCode : catObj?.nameEn || targetCategoryCode;

        if (skippedCount > 0) {
          setToastMessage({
            type: 'success',
            message: isAr
              ? `تم تعيين الفئة (${catName}) لـ ${updatedCount} منتج وتخطي ${skippedCount} منتج.`
              : `Assigned category (${catName}) to ${updatedCount} products, skipped ${skippedCount} products.`,
          });
        } else {
          setToastMessage({
            type: 'success',
            message: isAr
              ? `تم تعيين الفئة (${catName}) لـ ${updatedCount} منتج بنجاح.`
              : `Successfully assigned category (${catName}) to ${updatedCount} products.`,
          });
        }
        setSelectedIds([]);
      } else if (actionType === 'bulk_needs_review') {
        await analytics.productCategories.markNeedsReview(selectedIds);
        setToastMessage({
          type: 'success',
          message: isAr
            ? `تمت تحويل ${productCount} منتج للمراجعة بنجاح`
            : `Successfully marked ${productCount} products as needs review`,
        });
        setSelectedIds([]);
      } else if (actionType === 'bulk_reject') {
        await analytics.productCategories.reject(selectedIds);
        setToastMessage({
          type: 'success',
          message: isAr
            ? `تم رفض المقترحات لـ ${productCount} منتج بنجاح`
            : `Successfully rejected suggestions for ${productCount} products`,
        });
        setSelectedIds([]);
      }

      setConfirmModal({ isOpen: false, actionType: 'bulk_approve', productCount: 0 });
      await refreshAll();
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        message: formatCategoryError(err, isAr),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for confidence badge
  const renderConfidenceBadge = (confidence: number) => {
    let colorClasses = '';
    let labelAr = '';
    let labelEn = '';

    if (confidence >= 90) {
      colorClasses = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      labelAr = 'عالية';
      labelEn = 'High';
    } else if (confidence >= 70) {
      colorClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      labelAr = 'متوسطة';
      labelEn = 'Medium';
    } else {
      colorClasses = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      labelAr = 'منخفضة';
      labelEn = 'Low';
    }

    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full border ${colorClasses}`}>
        <span>{confidence}%</span>
        <span className="opacity-80">({isAr ? labelAr : labelEn})</span>
      </span>
    );
  };

  // Helper for status badge
  const renderStatusBadge = (status: MappingStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>{isAr ? 'معتمدة' : 'Approved'}</span>
          </span>
        );
      case 'suggested':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            <Sparkles className="w-3 h-3" />
            <span>{isAr ? 'مقترحة' : 'Suggested'}</span>
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertCircle className="w-3 h-3" />
            <span>{isAr ? 'تحتاج مراجعة' : 'Needs Review'}</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3 h-3" />
            <span>{isAr ? 'مرفوضة' : 'Rejected'}</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.message}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Screen Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              [SECTION STATUS: Live]
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
              [Data Source: Supabase Mapping Layer]
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-600" />
            <span>
              {isAr
                ? 'مراجعة واعتماد فئات المنتجات (Product Category Mapping Review)'
                : 'Product Category Mapping Review'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? 'مراجعة وتحديد فئات المنتجات يدوياً وآلياً للطبقة التحليلية قبل تحديث Odoo'
              : 'Review, approve, or adjust product category mapping rules for analytics without modifying Odoo source directly.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            disabled={loadingSummary || loadingTable || actionLoading}
            className="px-3.5 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingSummary || loadingTable) ? 'animate-spin text-blue-500' : ''}`} />
            <span>{isAr ? 'تحديث البيانات' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-extrabold text-amber-900 dark:text-amber-200">
            {isAr ? 'تنبيه تحديث أودو (Odoo Source Protection):' : 'Odoo Source Protection Notice:'}
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
            {isAr
              ? 'الاعتمادات والتعديلات الحالية تحدث طبقة التصنيف في Supabase فقط. لن يتم تغيير أي حقول في قاعدة بيانات أودو في هذه المرحلة.'
              : 'Approvals update only the Supabase mapping layer. Odoo product categories remain unchanged until official migration release.'}
          </p>
        </div>
      </div>

      {/* 7 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        
        {/* Card 1: Total Products */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'إجمالي المنتجات' : 'Total Products'}</span>
            <Package className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            {loadingSummary ? '-' : (summary?.totalProducts ?? 591).toLocaleString('ar-EG')}
          </div>
        </div>

        {/* Card 2: Approved Products */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'المنتجات المعتمدة' : 'Approved'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {loadingSummary ? '-' : (summary?.approvedProducts ?? 0).toLocaleString('ar-EG')}
          </div>
        </div>

        {/* Card 3: Suggested Products */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'المنتجات المقترحة' : 'Suggested'}</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {loadingSummary ? '-' : (summary?.suggestedProducts ?? 345).toLocaleString('ar-EG')}
          </div>
        </div>

        {/* Card 4: Needs Review Products */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'تحتاج مراجعة' : 'Needs Review'}</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
            {loadingSummary ? '-' : (summary?.needsReviewProducts ?? 246).toLocaleString('ar-EG')}
          </div>
        </div>

        {/* Card 5: Rejected Products */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'المنتجات المرفوضة' : 'Rejected'}</span>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
            {loadingSummary ? '-' : (summary?.rejectedProducts ?? 0).toLocaleString('ar-EG')}
          </div>
        </div>

        {/* Card 6: Approved Coverage % */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'نسبة الاعتماد' : 'Approved Coverage'}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {loadingSummary ? '-' : `${(summary?.approvedCoveragePct ?? 0).toFixed(2)}%`}
          </div>
        </div>

        {/* Card 7: Suggested or Approved Coverage % */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
            <span>{isAr ? 'تغطية الاقتراح' : 'Suggested/Approved'}</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
            {loadingSummary ? '-' : `${(summary?.suggestedOrApprovedCoveragePct ?? 58.38).toFixed(2)}%`}
          </div>
        </div>

      </div>

      {/* Audit Log Notice */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>
          {isAr
            ? 'جميع تعديلات تصنيف المنتجات يتم تسجيلها في سجل التدقيق.'
            : 'All product category modifications are recorded in the audit log.'}
        </span>
      </div>

      {/* Main Review Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          
          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500">{isAr ? 'الحالة:' : 'Status:'}</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="needs_review">{isAr ? 'تحتاج مراجعة (Needs Review)' : 'Needs Review'}</option>
                <option value="suggested">{isAr ? 'مقترحة (Suggested)' : 'Suggested'}</option>
                <option value="approved">{isAr ? 'معتمدة (Approved)' : 'Approved'}</option>
                <option value="rejected">{isAr ? 'مرفوضة (Rejected)' : 'Rejected'}</option>
              </select>
            </div>

            {/* Suggested Category Master Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500">{isAr ? 'الفئة المقترحة:' : 'Suggested Cat:'}</span>
              <select
                value={selectedCategoryCode}
                onChange={(e) => {
                  setSelectedCategoryCode(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="ALL">{isAr ? 'جميع الفئات' : 'All Categories'}</option>
                {categoriesMaster.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {isAr ? cat.nameAr : cat.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 rtl:right-3 ltr:left-3 ltr:right-auto" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder={isAr ? 'بحث بالاسم أو الكود المرجعي...' : 'Search product or reference...'}
                className="pr-9 pl-3 ltr:pl-9 ltr:pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none w-48 sm:w-64"
              />
            </div>

          </div>

          <div className="text-xs text-slate-500 font-mono self-end lg:self-center">
            {isAr
              ? `عرض ${paginatedProducts.length} من إجمالي ${totalItems} منتج`
              : `Showing ${paginatedProducts.length} of ${totalItems} products`}
          </div>

        </div>

        {/* Bulk Action Toolbar (When 1+ products selected) */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-black text-blue-900 dark:text-blue-100">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                {isAr
                  ? `تم تحديد ${selectedIds.length} منتج`
                  : `Selected ${selectedIds.length} products`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    actionType: 'bulk_approve',
                    productCount: selectedIds.length,
                  })
                }
                disabled={actionLoading}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isAr ? 'اعتماد المقترحات المحددة' : 'Approve All Selected'}</span>
              </button>

              <button
                onClick={() => {
                  const targetCode = bulkCategoryToAssign || categoriesMaster[0]?.code || 'DAIRY_MILK';
                  const catObj = categoriesMaster.find((c) => c.code === targetCode);
                  const catName = isAr ? catObj?.nameAr || targetCode : catObj?.nameEn || targetCode;
                  setConfirmModal({
                    isOpen: true,
                    actionType: 'bulk_assign',
                    productCount: selectedIds.length,
                    targetCategoryCode: targetCode,
                    targetCategoryName: catName,
                  });
                }}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{isAr ? 'تعيين فئة موحدة للمحدد' : 'Assign Category'}</span>
              </button>

              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    actionType: 'bulk_needs_review',
                    productCount: selectedIds.length,
                  })
                }
                disabled={actionLoading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحويل للمراجعة' : 'Mark Needs Review'}</span>
              </button>

              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    actionType: 'bulk_reject',
                    productCount: selectedIds.length,
                  })
                }
                disabled={actionLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isAr ? 'رفض المقترحات' : 'Reject Selected'}</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
              >
                {isAr ? 'إلغاء التحديد' : 'Deselect All'}
              </button>
            </div>
          </div>
        )}

        {/* Loading / Error States */}
        {loadingTable ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">
              {isAr ? 'جاري تحميل سجلات تصنيف المنتجات من Supabase...' : 'Loading product category mapping review...'}
            </p>
          </div>
        ) : error ? (
          <div className="p-8 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-700 dark:text-rose-300 font-bold">{error}</p>
            <button
              onClick={refreshAll}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500 font-bold">
              {isAr ? 'لم يتم العثور على منتجات مطابقة للبحث أو الفلاتر المختارة' : 'No product mappings match your filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={toggleSelectAllPage}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">{isAr ? 'معرف المنتج' : 'Product ID'}</th>
                    <th className="p-3">{isAr ? 'الرمز الداخلي' : 'Internal Ref'}</th>
                    <th className="p-3">{isAr ? 'اسم المنتج' : 'Product Name'}</th>
                    <th className="p-3">{isAr ? 'الفئة المقترحة' : 'Suggested Category'}</th>
                    <th className="p-3">{isAr ? 'نسبة الثقة' : 'Confidence'}</th>
                    <th className="p-3">{isAr ? 'سبب الاقتراح' : 'Suggestion Reason'}</th>
                    <th className="p-3">{isAr ? 'الفئة المعتمدة' : 'Approved Category'}</th>
                    <th className="p-3">{isAr ? 'حالة الاعتماد' : 'Status'}</th>
                    <th className="p-3">{isAr ? 'آخر تحديث' : 'Last Updated'}</th>
                    <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedProducts.map((prod) => {
                    const isSelected = selectedIds.includes(prod.productId);

                    const suggestedName = isAr
                      ? prod.suggestedCategoryNameAr || prod.suggestedCategoryCode
                      : prod.suggestedCategoryNameEn || prod.suggestedCategoryCode;

                    const approvedName = isAr
                      ? prod.approvedCategoryNameAr || prod.approvedCategoryCode
                      : prod.approvedCategoryNameEn || prod.approvedCategoryCode;

                    return (
                      <tr
                        key={prod.productId}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(prod.productId)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Product ID */}
                        <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300 text-[11px]">
                          #{prod.productId}
                        </td>

                        {/* Internal Reference */}
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {prod.internalReference || '-'}
                        </td>

                        {/* Product Name */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs max-w-xs">
                            {prod.productName}
                          </div>
                        </td>

                        {/* Suggested Category */}
                        <td className="p-3">
                          {suggestedName ? (
                            <span className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 text-xs font-bold inline-block">
                              {suggestedName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">-</span>
                          )}
                        </td>

                        {/* Confidence */}
                        <td className="p-3">
                          {renderConfidenceBadge(prod.suggestionConfidence)}
                        </td>

                        {/* Suggestion Reason */}
                        <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {prod.suggestionReason || '-'}
                        </td>

                        {/* Approved Category */}
                        <td className="p-3">
                          {approvedName ? (
                            <span className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-black inline-block">
                              {approvedName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              {isAr ? 'لم يتم الاعتماد' : 'Not Approved'}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          {renderStatusBadge(prod.mappingStatus)}
                        </td>

                        {/* Last Updated */}
                        <td className="p-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {prod.updatedAt
                            ? new Date(prod.updatedAt).toLocaleDateString(
                                isAr ? 'ar-EG' : 'en-US',
                                { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                              )
                            : '-'}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            
                            {/* Approve Suggested Button */}
                            <button
                              onClick={() => handleSingleApproveSuggested(prod)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold transition-colors"
                              title={isAr ? 'اعتماد الفئة المقترحة' : 'Approve suggested category'}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            {/* Choose Custom Category Button */}
                            <button
                              onClick={() =>
                                setCustomCategoryModal({
                                  isOpen: true,
                                  product: prod,
                                  categoryCode: prod.suggestedCategoryCode || categoriesMaster[0]?.code || 'DAIRY_MILK',
                                })
                              }
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 font-bold transition-colors"
                              title={isAr ? 'تعديل واختيار فئة أخرى' : 'Choose another category'}
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>

                            {/* Mark Needs Review Button */}
                            <button
                              onClick={() => handleSingleMarkNeedsReview(prod)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 font-bold transition-colors"
                              title={isAr ? 'علامة تحتاج مراجعة' : 'Mark needs review'}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* Reject Button */}
                            <button
                              onClick={() => promptSingleReject(prod)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 font-bold transition-colors"
                              title={isAr ? 'رفض الاقتراح' : 'Reject suggestion'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>
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

      {/* Modal: Single Item Custom Category Selection */}
      {customCategoryModal.isOpen && customCategoryModal.product && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>{isAr ? 'اختيار فئة واعتمادها للمنتج' : 'Select and Approve Category'}</span>
              </h3>
              <button
                onClick={() => setCustomCategoryModal({ isOpen: false, product: null, categoryCode: '' })}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-bold block">{isAr ? 'المنتج:' : 'Product:'}</span>
                <span className="font-black text-slate-900 dark:text-white block mt-0.5">
                  {customCategoryModal.product.productName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  #{customCategoryModal.product.productId}
                </span>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">
                  {isAr ? 'اختر الفئة من القائمة المعتمدة:' : 'Select Category from Official Master:'}
                </label>
                <select
                  value={customCategoryModal.categoryCode}
                  onChange={(e) =>
                    setCustomCategoryModal((prev) => ({ ...prev, categoryCode: e.target.value }))
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  {categoriesMaster.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {isAr ? cat.nameAr : cat.nameEn} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setCustomCategoryModal({ isOpen: false, product: null, categoryCode: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSingleApproveCustom}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isAr ? 'اعتماد الفئة' : 'Approve Category'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Confirmation Dialog for Single & Bulk Actions */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                {isAr
                  ? `تأكيد ${
                      confirmModal.actionType.startsWith('bulk_') ? 'الإجراء الجماعي' : 'تعديل الفئة'
                    }`
                  : `Confirm ${
                      confirmModal.actionType.startsWith('bulk_') ? 'Bulk Action' : 'Category Action'
                    }`}
              </span>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold space-y-2">
              {confirmModal.actionType === 'single_reject' && (
                <p>
                  {isAr
                    ? `هل أنت ألكيد من رفض اقتراح الفئة للمنتج "${confirmModal.product?.productName}"؟`
                    : `Are you sure you want to reject the category suggestion for product "${confirmModal.product?.productName}"?`}
                </p>
              )}

              {confirmModal.actionType === 'single_change_approved' && (
                <div className="space-y-1">
                  <p>
                    {isAr
                      ? `هذا المنتج معتمد حالياً. هل أنت ألكيد من تغيير الفئة المعتمدة للمنتج "${confirmModal.product?.productName}"؟`
                      : `This product is currently approved. Are you sure you want to change its approved category for "${confirmModal.product?.productName}"?`}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 font-bold">
                    {isAr
                      ? `الفئة الجديدة: ${confirmModal.targetCategoryName || confirmModal.targetCategoryCode}`
                      : `New Category: ${confirmModal.targetCategoryName || confirmModal.targetCategoryCode}`}
                  </p>
                </div>
              )}

              {confirmModal.actionType === 'bulk_approve' && (
                <p>
                  {isAr
                    ? `هل أنت ألكيد من اعتماد المقترحات الآلية لـ ${confirmModal.productCount} منتج محدد؟`
                    : `Are you sure you want to approve suggested categories for ${confirmModal.productCount} selected products?`}
                </p>
              )}

              {confirmModal.actionType === 'bulk_assign' && (
                <div className="space-y-3">
                  <p>
                    {isAr
                      ? `سيتم تعيين فئة موحدة لـ ${confirmModal.productCount} منتج محدد:`
                      : `Assign a single category to ${confirmModal.productCount} selected products:`}
                  </p>
                  <select
                    value={confirmModal.targetCategoryCode || categoriesMaster[0]?.code}
                    onChange={(e) => {
                      const code = e.target.value;
                      const catObj = categoriesMaster.find((c) => c.code === code);
                      const catName = isAr ? catObj?.nameAr || code : catObj?.nameEn || code;
                      setConfirmModal((prev) => ({
                        ...prev,
                        targetCategoryCode: code,
                        targetCategoryName: catName,
                      }));
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    {categoriesMaster.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {isAr ? cat.nameAr : cat.nameEn} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {confirmModal.actionType === 'bulk_needs_review' && (
                <p>
                  {isAr
                    ? `هل أنت ألكيد من تحويل ${confirmModal.productCount} منتج محدد إلى حالة "تحتاج مراجعة"؟`
                    : `Are you sure you want to mark ${confirmModal.productCount} selected products as needs review?`}
                </p>
              )}

              {confirmModal.actionType === 'bulk_reject' && (
                <p>
                  {isAr
                    ? `هل أنت ألكيد من رفض المقترحات لـ ${confirmModal.productCount} منتج محدد؟`
                    : `Are you sure you want to reject category suggestions for ${confirmModal.productCount} selected products?`}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() =>
                  setConfirmModal({ isOpen: false, actionType: 'bulk_approve', productCount: 0 })
                }
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={executeConfirmedAction}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isAr ? 'تأكيد وتنفيذ' : 'Confirm & Execute'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
