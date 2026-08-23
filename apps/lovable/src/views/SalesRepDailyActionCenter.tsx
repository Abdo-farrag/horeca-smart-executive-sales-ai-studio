import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserCheck,
  AlertTriangle,
  TrendingDown,
  Clock,
  UserX,
  Target,
  RefreshCw,
  Search,
  Filter,
  Info,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckCircle2,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  Flame,
  Award,
  DollarSign
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { analytics } from '../analytics';
import { CustomerActionOption } from '../analytics/filters';
import {
  fetchSalesRepActionSummary,
  fetchSalesRepDailyActions,
  fetchSalesRepRecoveryPipeline,
  fetchSalesRepCustomerPriorities
} from '../services/salesRepService';
import {
  SalesRepActionSummaryResult,
  SalesRepDailyActionResult,
  SalesRepRecoveryPipelineResult,
  SalesRepCustomerPrioritiesResult
} from '../analytics/types';
import { Customer } from '../types';

// Approved Action Labels in Arabic
export const ACTION_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  REACTIVATE_LOST: {
    ar: 'إعادة تنشيط',
    en: 'Reactivate Lost',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300 dark:border-rose-800'
  },
  WIN_BACK: {
    ar: 'استرجاع العميل',
    en: 'Win-back Customer',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-800'
  },
  RECOVER_DECLINE: {
    ar: 'معالجة انخفاض المبيعات',
    en: 'Recover Decline',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300 dark:border-orange-800'
  },
  OVERDUE_FOLLOWUP: {
    ar: 'متابعة تأخر الشراء',
    en: 'Overdue Follow-up',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800'
  },
  OWNER_TRANSFER_REVIEW: {
    ar: 'مراجعة نقل العميل',
    en: 'Owner Transfer Review',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-800'
  },
  MONITOR: {
    ar: 'متابعة عادية',
    en: 'Monitor',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-800'
  }
};

// Priority Badges Helper
const getPriorityBadge = (priority: string, isAr: boolean) => {
  const p = (priority || '').toUpperCase();
  if (p === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
        <Flame className="w-3 h-3" />
        {isAr ? 'عالية' : 'HIGH'}
      </span>
    );
  }
  if (p === 'MEDIUM') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        <AlertTriangle className="w-3 h-3" />
        {isAr ? 'متوسطة' : 'MEDIUM'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
      <CheckCircle2 className="w-3 h-3 text-slate-400" />
      {isAr ? 'منخفضة' : 'LOW'}
    </span>
  );
};

// Risk Level Helper
const getRiskBadge = (risk: string, isAr: boolean) => {
  const r = (risk || '').toUpperCase();
  if (r === 'HIGH' || r === 'CRITICAL') {
    return <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{isAr ? 'مرتفعة' : 'High Risk'}</span>;
  }
  if (r === 'MEDIUM') {
    return <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{isAr ? 'متوسطة' : 'Medium Risk'}</span>;
  }
  return <span className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'منخفضة' : 'Low Risk'}</span>;
};

// Currency Formatter Helper
const formatEgp = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + ' EGP';
};

export const SalesRepDailyActionCenter: React.FC = () => {
  const { language, filters, setSelectedCustomer, salesReps } = useApp();
  const isAr = language === 'ar';

  // Available Sales Representatives list
  const salesRepOptions = useMemo(() => {
    const list = salesReps.map(sr => sr.nameEn);
    if (!list.includes('Haddil Haron')) list.unshift('Haddil Haron');
    return Array.from(new Set(list));
  }, [salesReps]);

  // Primary State Filters
  const [asOfDate, setAsOfDate] = useState<string>(filters.latestAvailableDataDate || '');

  useEffect(() => {
    if (filters.latestAvailableDataDate) {
      setAsOfDate(filters.latestAvailableDataDate);
    }
  }, [filters.latestAvailableDataDate]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('Haddil Haron');
  const [selectedCompany, setSelectedCompany] = useState<string>(filters.company || 'All');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Active Workflow Tab Tracker
  const [activeQuickTab, setActiveQuickTab] = useState<string>('ALL');

  // Independent Loading / Error States
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<SalesRepActionSummaryResult | null>(null);

  const [loadingPriorities, setLoadingPriorities] = useState<boolean>(true);
  const [errorPriorities, setErrorPriorities] = useState<string | null>(null);
  const [prioritiesData, setPrioritiesData] = useState<SalesRepCustomerPrioritiesResult[]>([]);

  const [loadingActions, setLoadingActions] = useState<boolean>(true);
  const [errorActions, setErrorActions] = useState<string | null>(null);
  const [actionsData, setActionsData] = useState<SalesRepDailyActionResult[]>([]);

  const [loadingPipeline, setLoadingPipeline] = useState<boolean>(true);
  const [errorPipeline, setErrorPipeline] = useState<string | null>(null);
  const [pipelineData, setPipelineData] = useState<SalesRepRecoveryPipelineResult[]>([]);

  const [actionOptions, setActionOptions] = useState<CustomerActionOption[]>([]);
  const [loadingActionOptions, setLoadingActionOptions] = useState<boolean>(false);

  // Fetch live Customer Action Filter Options (Priority & Action Type) with cascading resets
  useEffect(() => {
    let isMounted = true;
    async function loadActionOptions() {
      setLoadingActionOptions(true);
      try {
        const res = await analytics.filters.customerActionOptions({
          effectiveEndDate: asOfDate,
          companyName: selectedCompany !== 'All' ? selectedCompany : null,
          salespersonName: selectedSalesperson !== 'All' ? selectedSalesperson : null,
        });
        if (isMounted) {
          setActionOptions(res);

          const priorities = res.filter(r => r.optionType === 'PRIORITY');
          const actionTypes = res.filter(r => r.optionType === 'ACTION_TYPE');

          // Cascading reset: reset selected Priority/ActionType to 'ALL' if no longer valid
          if (selectedPriority !== 'ALL') {
            if (!priorities.some(p => p.optionCode === selectedPriority)) {
              setSelectedPriority('ALL');
            }
          }
          if (selectedActionType !== 'ALL') {
            if (!actionTypes.some(a => a.optionCode === selectedActionType)) {
              setSelectedActionType('ALL');
            }
          }
        }
      } catch (err) {
        console.error('Error loading customer action filter options:', err);
      } finally {
        if (isMounted) setLoadingActionOptions(false);
      }
    }
    loadActionOptions();
    return () => { isMounted = false; };
  }, [asOfDate, selectedCompany, selectedSalesperson]);

  const priorityOptions = useMemo(() => actionOptions.filter(o => o.optionType === 'PRIORITY'), [actionOptions]);
  const actionTypeOptions = useMemo(() => actionOptions.filter(o => o.optionType === 'ACTION_TYPE'), [actionOptions]);

  // Pagination for Daily Work Queue Table
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // 1. Fetch Summary KPIs
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setErrorSummary(null);
    const res = await fetchSalesRepActionSummary({
      asOfDate,
      salesperson: selectedSalesperson,
      companyName: selectedCompany === 'All' ? null : selectedCompany
    });
    if (res.error) {
      setErrorSummary(res.error);
    } else {
      setSummaryData(res.data);
    }
    setLoadingSummary(false);
  }, [asOfDate, selectedSalesperson, selectedCompany]);

  // 2. Fetch Priorities Distribution
  const loadPriorities = useCallback(async () => {
    setLoadingPriorities(true);
    setErrorPriorities(null);
    const res = await fetchSalesRepCustomerPriorities({
      asOfDate,
      salesperson: selectedSalesperson,
      companyName: selectedCompany === 'All' ? null : selectedCompany
    });
    if (res.error) {
      setErrorPriorities(res.error);
    } else {
      setPrioritiesData(res.data);
    }
    setLoadingPriorities(false);
  }, [asOfDate, selectedSalesperson, selectedCompany]);

  // 3. Fetch Daily Actions Work Queue
  const loadDailyActions = useCallback(async () => {
    setLoadingActions(true);
    setErrorActions(null);
    const res = await fetchSalesRepDailyActions({
      asOfDate,
      salesperson: selectedSalesperson,
      companyName: selectedCompany === 'All' ? null : selectedCompany,
      priority: selectedPriority === 'ALL' ? null : selectedPriority,
      actionType: selectedActionType === 'ALL' ? null : selectedActionType,
      risk: selectedRisk === 'ALL' ? null : selectedRisk,
      search: searchQuery.trim() || null,
      limit: 100,
      offset: 0
    });
    if (res.error) {
      setErrorActions(res.error);
    } else {
      setActionsData(res.data);
    }
    setLoadingActions(false);
  }, [asOfDate, selectedSalesperson, selectedCompany, selectedPriority, selectedActionType, selectedRisk, searchQuery]);

  // 4. Fetch Recovery Pipeline
  const loadPipeline = useCallback(async () => {
    setLoadingPipeline(true);
    setErrorPipeline(null);
    const res = await fetchSalesRepRecoveryPipeline({
      asOfDate,
      salesperson: selectedSalesperson,
      companyName: selectedCompany === 'All' ? null : selectedCompany,
      limit: 15
    });
    if (res.error) {
      setErrorPipeline(res.error);
    } else {
      setPipelineData(res.data);
    }
    setLoadingPipeline(false);
  }, [asOfDate, selectedSalesperson, selectedCompany]);

  // Reload everything when primary filters change
  useEffect(() => {
    loadSummary();
    loadPriorities();
    loadDailyActions();
    loadPipeline();
  }, [loadSummary, loadPriorities, loadDailyActions, loadPipeline]);

  // Quick Workflow Filter Handler
  const handleQuickTabSelect = (tabKey: string) => {
    setActiveQuickTab(tabKey);
    setPage(1);
    if (tabKey === 'HIGH_PRIORITY') {
      setSelectedPriority('HIGH');
      setSelectedActionType('ALL');
    } else if (tabKey === 'WIN_BACK') {
      setSelectedPriority('ALL');
      setSelectedActionType('WIN_BACK');
    } else if (tabKey === 'RECOVER_DECLINE') {
      setSelectedPriority('ALL');
      setSelectedActionType('RECOVER_DECLINE');
    } else if (tabKey === 'OVERDUE') {
      setSelectedPriority('ALL');
      setSelectedActionType('OVERDUE_FOLLOWUP');
    } else {
      setSelectedPriority('ALL');
      setSelectedActionType('ALL');
    }
  };

  // Click Customer Handler -> Drilldown to Customer 360
  const handleCustomerClick = (customerId: number, customerName: string) => {
    setSelectedCustomer({
      id: customerId as any,
      nameAr: customerName,
      nameEn: customerName,
      company: selectedCompany === 'All' ? 'MAS' : (selectedCompany as any),
      sector: 'restaurant',
      area: '',
      city: '',
      salesRepName: selectedSalesperson,
      healthScore: 100,
      lifecycle: 'active',
      riskLevel: 'low',
      lastOrderDate: '',
      avgDaysBetweenOrders: 0,
      daysSinceLastOrder: 0,
      totalRevenueYtd: 0,
      ordersCount: 0,
      avgOrderValue: 0,
      retentionRate: 100,
      creditLimit: 0,
      currentBalance: 0,
      overdueAmount: 0,
      abcClass: 'A',
      favoriteCategory: '',
      churnProbabilityPct: 0
    } as unknown as Customer);
  };

  // Filtered/Paginated Daily Actions Queue
  const paginatedActions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return actionsData.slice(start, start + pageSize);
  }, [actionsData, page]);

  const totalPages = Math.max(1, Math.ceil(actionsData.length / pageSize));

  return (
    <div className="space-y-6 pb-12 text-right dir-rtl">
      {/* 1. Header Section & Context Tooltip */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'مركز عمل المندوب اليومي' : 'Sales Rep Daily Action Center'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'قائمة التشغيل اليومية المرتّبة حسب الأولوية للتواصل مع العملاء واسترجاع الفرص'
                  : 'Prioritized operational daily queue for client outreach and revenue recovery'}
              </p>
            </div>
          </div>
        </div>

        {/* Indicative Gap Tooltip Disclaimer */}
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 max-w-lg">
          <Info className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            {isAr
              ? 'قيمة الفرصة مبنية على الفرق بين الشراء السابق والحالي ولا تمثل مبيعات مضمونة.'
              : 'Recovery opportunity reflects the indicative sales gap and is not guaranteed revenue.'}
          </span>
        </div>
      </div>

      {/* 2. Mandatory Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* As-Of Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 inline ml-1 text-slate-400" />
              {isAr ? 'تاريخ المتابعة (As-of Date)' : 'As-of Date'}
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Salesperson Filter (Required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              <UserCheck className="w-3.5 h-3.5 inline ml-1 text-slate-400" />
              {isAr ? 'مندوب المبيعات (مطلوب)' : 'Sales Representative'}
            </label>
            <select
              value={selectedSalesperson}
              onChange={(e) => setSelectedSalesperson(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {salesRepOptions.map((rep, idx) => (
                <option key={`rep-opt-${rep}-${idx}`} value={rep}>
                  {rep}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              <Building2 className="w-3.5 h-3.5 inline ml-1 text-slate-400" />
              {isAr ? 'الشركة' : 'Company'}
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="All">{isAr ? 'جميع الشركات (All)' : 'All Companies'}</option>
              <option value="MAS">MAS</option>
              <option value="Horeca Smart">Horeca Smart</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              <Flame className="w-3.5 h-3.5 inline ml-1 text-slate-400" />
              {isAr ? 'درجة الأولوية' : 'Priority'}
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setActiveQuickTab('CUSTOM');
              }}
              disabled={loadingActionOptions}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="ALL">
                {loadingActionOptions
                  ? (isAr ? 'جاري التحميل...' : 'Loading...')
                  : (isAr ? 'كل الأولويات' : 'All Priorities')}
              </option>
              {priorityOptions.map((p) => (
                <option key={`rep-prio-${p.optionCode}`} value={p.optionCode}>
                  {p.optionLabelAr} ({p.customersCount})
                </option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              <SlidersHorizontal className="w-3.5 h-3.5 inline ml-1 text-slate-400" />
              {isAr ? 'نوع الإجراء' : 'Action Type'}
            </label>
            <select
              value={selectedActionType}
              onChange={(e) => {
                setSelectedActionType(e.target.value);
                setActiveQuickTab('CUSTOM');
              }}
              disabled={loadingActionOptions}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="ALL">
                {loadingActionOptions
                  ? (isAr ? 'جاري التحميل...' : 'Loading...')
                  : (isAr ? 'جميع الإجراءات' : 'All Action Types')}
              </option>
              {actionTypeOptions.map((a) => (
                <option key={`rep-act-${a.optionCode}`} value={a.optionCode}>
                  {a.optionLabelAr} ({a.customersCount})
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 inline ml-1 text-slate-400" />
              {isAr ? 'مستوى المخاطرة' : 'Risk Level'}
            </label>
            <select
              value={selectedRisk}
              onChange={(e) => {
                setSelectedRisk(e.target.value);
                setActiveQuickTab('CUSTOM');
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="ALL">{isAr ? 'جميع المخاطر' : 'All Risk Levels'}</option>
              <option value="HIGH">{isAr ? 'مرتفع (High)' : 'High Risk'}</option>
              <option value="MEDIUM">{isAr ? 'متوسط (Medium)' : 'Medium Risk'}</option>
              <option value="LOW">{isAr ? 'منخفض (Low)' : 'Low Risk'}</option>
            </select>
          </div>
        </div>

        {/* 3. Daily Workflow Quick View Tabs */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">
            {isAr ? 'مسارات العمل السريعة:' : 'Quick Workflows:'}
          </span>

          <button
            onClick={() => handleQuickTabSelect('HIGH_PRIORITY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeQuickTab === 'HIGH_PRIORITY'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-300" />
            {isAr ? 'ابدأ بالأولوية العالية' : 'Start High Priority'}
          </button>

          <button
            onClick={() => handleQuickTabSelect('WIN_BACK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeQuickTab === 'WIN_BACK'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <UserX className="w-3.5 h-3.5 text-amber-300" />
            {isAr ? 'Win-back (استرجاع)' : 'Win-back Queue'}
          </button>

          <button
            onClick={() => handleQuickTabSelect('RECOVER_DECLINE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeQuickTab === 'RECOVER_DECLINE'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-orange-300" />
            {isAr ? 'انخفاض المبيعات' : 'Recover Decline'}
          </button>

          <button
            onClick={() => handleQuickTabSelect('OVERDUE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeQuickTab === 'OVERDUE'
                ? 'bg-yellow-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-yellow-300" />
            {isAr ? 'متأخر عن الطلب' : 'Overdue Orders'}
          </button>

          <button
            onClick={() => handleQuickTabSelect('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeQuickTab === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {isAr ? 'كل المهام' : 'All Tasks'}
          </button>
        </div>
      </div>

      {/* 4. Action Summary KPIs Card Grid */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {isAr ? `ملخص حقيبة المندوب: ${selectedSalesperson}` : `Action Summary: ${selectedSalesperson}`}
          </h2>
          <button
            onClick={loadSummary}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title={isAr ? 'تحديث البيانات' : 'Refresh Data'}
          >
            <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingSummary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        ) : errorSummary ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <span>{errorSummary}</span>
            <button onClick={loadSummary} className="underline font-bold">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : summaryData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Customers */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                {isAr ? 'إجمالي عملاء الحقيبة' : 'Total Customers'}
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                {summaryData.totalCustomers}
              </span>
            </div>

            {/* 2. Actionable Customers */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">
                {isAr ? 'عملاء يحتاجون إجراء' : 'Actionable Customers'}
              </span>
              <span className="text-xl font-black text-emerald-800 dark:text-emerald-200">
                {summaryData.actionableCustomers}
              </span>
            </div>

            {/* 3. High Priority */}
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200/80 dark:border-rose-800/80">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block mb-1">
                {isAr ? 'أولوية عالية' : 'High Priority'}
              </span>
              <span className="text-xl font-black text-rose-800 dark:text-rose-200">
                {summaryData.highPriority}
              </span>
            </div>

            {/* 4. Medium Priority */}
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/80">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block mb-1">
                {isAr ? 'أولوية متوسطة' : 'Medium Priority'}
              </span>
              <span className="text-xl font-black text-amber-800 dark:text-amber-200">
                {summaryData.mediumPriority}
              </span>
            </div>

            {/* 5. Win-back Customers */}
            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200/80 dark:border-purple-800/80">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 block mb-1">
                {isAr ? 'عملاء استرجاع (Win-back)' : 'Win-back Customers'}
              </span>
              <span className="text-xl font-black text-purple-800 dark:text-purple-200">
                {summaryData.winBackCustomers}
              </span>
            </div>

            {/* 6. Declining Customers */}
            <div className="p-3.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200/80 dark:border-orange-800/80">
              <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400 block mb-1">
                {isAr ? 'تراجع المبيعات' : 'Declining Customers'}
              </span>
              <span className="text-xl font-black text-orange-800 dark:text-orange-200">
                {summaryData.decliningCustomers}
              </span>
            </div>

            {/* 7. Overdue Customers */}
            <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl border border-yellow-200/80 dark:border-yellow-800/80">
              <span className="text-[11px] font-semibold text-yellow-700 dark:text-yellow-400 block mb-1">
                {isAr ? 'متأخر عن الشراء' : 'Overdue Customers'}
              </span>
              <span className="text-xl font-black text-yellow-800 dark:text-yellow-200">
                {summaryData.overdueCustomers}
              </span>
            </div>

            {/* 8. Transfer Review */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                {isAr ? 'مراجعة نقل العميل' : 'Transfer Review'}
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                {summaryData.transferReviewCustomers}
              </span>
            </div>

            {/* 9. Total Recovery Opportunity */}
            <div className="p-3.5 bg-emerald-100/60 dark:bg-emerald-950/50 rounded-xl border border-emerald-300 dark:border-emerald-800 col-span-2">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                {isAr ? 'إجمالي فرصة الاسترجاع' : 'Total Recovery Opportunity'}
              </span>
              <span className="text-lg font-black text-emerald-900 dark:text-emerald-100 dir-ltr inline-block">
                {formatEgp(summaryData.totalRecoveryOpportunity)}
              </span>
            </div>

            {/* 10. High Priority Recovery */}
            <div className="p-3.5 bg-rose-100/60 dark:bg-rose-950/50 rounded-xl border border-rose-300 dark:border-rose-800 col-span-2">
              <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block mb-1">
                {isAr ? 'فرصة الاسترجاع للأولوية العالية' : 'High Priority Recovery'}
              </span>
              <span className="text-lg font-black text-rose-900 dark:text-rose-100 dir-ltr inline-block">
                {formatEgp(summaryData.highPriorityRecoveryOpportunity)}
              </span>
            </div>

            {/* 11. Previous 30d Sales */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 col-span-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                {isAr ? 'مبيعات الـ 30 يوم السابقة (Previous 30d)' : 'Previous 30d Sales'}
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-200 dir-ltr inline-block">
                {formatEgp(summaryData.previous30dSales)}
              </span>
            </div>

            {/* 12. Recent 30d Sales */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 col-span-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                {isAr ? 'مبيعات الـ 30 يوم الحالية (Recent 30d)' : 'Recent 30d Sales'}
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-200 dir-ltr inline-block">
                {formatEgp(summaryData.recent30dSales)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 5. Priority Distribution Section (Compact) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            {isAr ? 'توزيع أولويات العملاء والقيم المتوقعة' : 'Customer Priorities Distribution'}
          </h2>
        </div>

        {loadingPriorities ? (
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ) : errorPriorities ? (
          <div className="text-xs text-rose-600 dark:text-rose-400">{errorPriorities}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {prioritiesData.map((p, idx) => {
              const priorityUpper = (p.priority || '').toUpperCase();
              const isHigh = priorityUpper === 'HIGH';
              const isMed = priorityUpper === 'MEDIUM';

              const barColor = isHigh
                ? 'bg-rose-500'
                : isMed
                ? 'bg-amber-500'
                : 'bg-slate-400 dark:bg-slate-600';

              const cardBg = isHigh
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                : isMed
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50';

              return (
                <div key={`${p.priority}_${idx}`} className={`p-4 rounded-xl border ${cardBg} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                      {isAr
                        ? isHigh
                          ? 'أولوية عالية (HIGH)'
                          : isMed
                          ? 'أولوية متوسطة (MEDIUM)'
                          : 'أولوية منخفضة (LOW)'
                        : p.priority}
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {p.customersCount} {isAr ? 'عميل' : 'clients'} ({p.customersPct.toFixed(2)}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-300`}
                      style={{ width: `${Math.min(100, p.customersPct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isAr ? 'فرصة الاسترجاع:' : 'Recovery:'}
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 dir-ltr">
                      {formatEgp(p.recoveryOpportunity)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Today's Work Queue Table (Primary Focus) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {isAr ? 'قائمة عمل اليوم المرتبة' : "Today's Work Queue"}
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {actionsData.length} {isAr ? 'عميل' : 'clients'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'مرتبة تلقائياً حسب ترتيب الأولوية (Action Rank) لتوضيح من أكلمه أولاً'
                : 'Ordered by Action Rank to determine contact priority'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={isAr ? 'بحث باسم العميل أو السبب...' : 'Search customer or reason...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={loadDailyActions}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              title={isAr ? 'تحديث القائمة' : 'Refresh Queue'}
            >
              <RefreshCw className={`w-4 h-4 ${loadingActions ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loadingActions ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs">{isAr ? 'جاري تحميل قائمة العمل اليومية...' : 'Loading daily action queue...'}</p>
          </div>
        ) : errorActions ? (
          <div className="p-6 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{errorActions}</p>
            <button
              onClick={loadDailyActions}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : actionsData.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'لا توجد مهام مطابقة للشروط الحالية' : 'No action items match current filters'}
            </p>
            <p className="text-xs">{isAr ? 'جرّب تغيير الفلاتر أو المسارات السريعة' : 'Try adjusting the filters above'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-center w-12">#</th>
                  <th className="p-3">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3">{isAr ? 'الشركة' : 'Company'}</th>
                  <th className="p-3 text-center">{isAr ? 'الأولوية' : 'Priority'}</th>
                  <th className="p-3">{isAr ? 'الإجراء المطلوبة' : 'Action Required'}</th>
                  <th className="p-3">{isAr ? 'سبب الإجراء' : 'Reason'}</th>
                  <th className="p-3 text-center">{isAr ? 'المخاطرة' : 'Risk'}</th>
                  <th className="p-3 text-center">{isAr ? 'آخر طلب' : 'Last Order'}</th>
                  <th className="p-3 text-center">{isAr ? 'أيام الغياب' : 'Days Idle'}</th>
                  <th className="p-3 text-center">{isAr ? 'فترة الشراء' : 'Interval'}</th>
                  <th className="p-3 text-left">{isAr ? '30d سابقة' : 'Prev 30d'}</th>
                  <th className="p-3 text-left">{isAr ? '30d حالية' : 'Recent 30d'}</th>
                  <th className="p-3 text-center">{isAr ? 'التغير %' : 'Change %'}</th>
                  <th className="p-3 text-left">{isAr ? 'فرصة الاسترجاع' : 'Recovery'}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedActions.map((row, idx) => {
                  const actionMeta = ACTION_LABELS[row.actionType] || {
                    ar: row.actionType,
                    en: row.actionType,
                    color: 'bg-slate-100 text-slate-800'
                  };

                  return (
                    <tr
                      key={`${row.customerId}_${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Rank */}
                      <td className="p-3 text-center font-black text-slate-400 dark:text-slate-500">
                        {row.actionRank}
                      </td>

                      {/* Customer Name -> Customer 360 Drilldown */}
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                        <button
                          onClick={() => handleCustomerClick(row.customerId, row.customerName)}
                          className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center gap-1.5 text-right w-full"
                        >
                          <span className="truncate">{row.customerName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 inline" />
                        </button>
                      </td>

                      {/* Company */}
                      <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {row.companyName}
                      </td>

                      {/* Priority Badge */}
                      <td className="p-3 text-center">
                        {getPriorityBadge(row.priority, isAr)}
                      </td>

                      {/* Action Label */}
                      <td className="p-3">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${actionMeta.color}`}>
                          {isAr ? actionMeta.ar : actionMeta.en}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="p-3 text-slate-600 dark:text-slate-300 max-w-[220px] truncate" title={row.actionReason}>
                        {row.actionReason}
                      </td>

                      {/* Risk */}
                      <td className="p-3 text-center">
                        {getRiskBadge(row.risk, isAr)}
                      </td>

                      {/* Last Order Date */}
                      <td className="p-3 text-center font-mono text-slate-500 dark:text-slate-400">
                        {row.lastOrderDate || '—'}
                      </td>

                      {/* Days Since Last Order */}
                      <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {row.daysSinceLastOrder} {isAr ? 'يوم' : 'd'}
                      </td>

                      {/* Median Buying Interval */}
                      <td className="p-3 text-center font-mono text-slate-500 dark:text-slate-400">
                        {row.medianBuyingInterval} {isAr ? 'يوم' : 'd'}
                      </td>

                      {/* Previous 30d Sales */}
                      <td className="p-3 text-left font-mono text-slate-700 dark:text-slate-300 dir-ltr">
                        {formatEgp(row.previous30dSales)}
                      </td>

                      {/* Recent 30d Sales */}
                      <td className="p-3 text-left font-mono text-slate-700 dark:text-slate-300 dir-ltr">
                        {formatEgp(row.recent30dSales)}
                      </td>

                      {/* Sales Change % */}
                      <td className="p-3 text-center font-bold">
                        {row.salesChangePct != null ? (
                          <span
                            className={`dir-ltr inline-block ${
                              row.salesChangePct < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {row.salesChangePct > 0 ? '+' : ''}
                            {row.salesChangePct.toFixed(1)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Recovery Opportunity */}
                      <td className="p-3 text-left font-black text-emerald-700 dark:text-emerald-300 dir-ltr">
                        {formatEgp(row.recoveryOpportunity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination */}
        {actionsData.length > pageSize && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {isAr
                ? `عرض ${ (page - 1) * pageSize + 1 } إلى ${ Math.min(page * pageSize, actionsData.length) } من أصل ${ actionsData.length }`
                : `Showing ${ (page - 1) * pageSize + 1 } to ${ Math.min(page * pageSize, actionsData.length) } of ${ actionsData.length }`}
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Top Recovery Opportunities Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-500" />
            {isAr ? 'أعلى فرص الاسترجاع (Top Recovery Pipeline)' : 'Top Recovery Pipeline'}
          </h2>
          <button
            onClick={loadPipeline}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPipeline ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingPipeline ? (
          <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ) : errorPipeline ? (
          <div className="text-xs text-rose-600 dark:text-rose-400">{errorPipeline}</div>
        ) : pipelineData.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">
            {isAr ? 'لا توجد فرص استرجاع مسجلة' : 'No recovery pipeline records found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-2.5">{isAr ? 'الإجراء' : 'Action'}</th>
                  <th className="p-2.5 text-left">{isAr ? 'مبيعات سابقة' : 'Previous Sales'}</th>
                  <th className="p-2.5 text-left">{isAr ? 'مبيعات حالية' : 'Recent Sales'}</th>
                  <th className="p-2.5 text-left">{isAr ? 'الفجوة (Decline Gap)' : 'Sales Gap'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'نسبة التغير' : 'Change %'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'أيام الغياب' : 'Idle Days'}</th>
                  <th className="p-2.5 text-left">{isAr ? 'قيمة فرصة الاسترجاع' : 'Recovery Opportunity'}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {pipelineData.map((item, idx) => {
                  const actionMeta = ACTION_LABELS[item.actionType] || {
                    ar: item.actionType,
                    en: item.actionType,
                    color: 'bg-slate-100 text-slate-800'
                  };

                  return (
                    <tr
                      key={`${item.customerId}_${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">
                        <button
                          onClick={() => handleCustomerClick(item.customerId, item.customerName)}
                          className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          {item.customerName}
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                        </button>
                      </td>

                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actionMeta.color}`}>
                          {isAr ? actionMeta.ar : actionMeta.en}
                        </span>
                      </td>

                      <td className="p-2.5 text-left font-mono dir-ltr text-slate-700 dark:text-slate-300">
                        {formatEgp(item.previous30dSales)}
                      </td>

                      <td className="p-2.5 text-left font-mono dir-ltr text-slate-700 dark:text-slate-300">
                        {formatEgp(item.recent30dSales)}
                      </td>

                      <td className="p-2.5 text-left font-mono dir-ltr text-rose-600 dark:text-rose-400 font-bold">
                        {formatEgp(item.salesGap)}
                      </td>

                      <td className="p-2.5 text-center font-bold">
                        {item.salesChangePct != null ? (
                          <span className="dir-ltr inline-block text-rose-600 dark:text-rose-400">
                            {item.salesChangePct.toFixed(2)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="p-2.5 text-center font-bold text-slate-600 dark:text-slate-400">
                        {item.daysSinceLastOrder} {isAr ? 'يوم' : 'd'}
                      </td>

                      <td className="p-2.5 text-left font-black text-emerald-700 dark:text-emerald-300 dir-ltr">
                        {formatEgp(item.recoveryOpportunity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
