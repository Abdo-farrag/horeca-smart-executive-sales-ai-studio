import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  Clock,
  UserX,
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  Info,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowUpDown,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  HelpCircle,
  Zap,
  Target,
  BarChart3,
  ListFilter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { analytics } from '../analytics';
import { CustomerActionOption } from '../analytics/filters';
import {
  fetchCustomerPortfolioSummary,
  fetchCustomerRiskDistribution,
  fetchCustomerActionCenterList,
  fetchCustomerRecoveryOpportunities
} from '../services/customerService';
import {
  CustomerPortfolioSummaryResult,
  CustomerRiskDistributionResult,
  CustomerActionCenterResult,
  CustomerRecoveryOpportunitiesResult
} from '../analytics/types';
import { Customer } from '../types';

export const CustomerActionCenter: React.FC = () => {
  const { language, filters, setFilters, setSelectedCustomer } = useApp();
  const isAr = language === 'ar';

  // State for as-of date (Defaulting to latest available sales data date)
  const [asOfDate, setAsOfDate] = useState<string>(filters.latestAvailableDataDate || '');

  useEffect(() => {
    if (filters.latestAvailableDataDate) {
      setAsOfDate(filters.latestAvailableDataDate);
    }
  }, [filters.latestAvailableDataDate]);
  const [selectedCompany, setSelectedCompany] = useState<string>(filters.company || 'All');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>(filters.salesRepId || 'All');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('ALL');

  // Async data states
  const [portfolioSummary, setPortfolioSummary] = useState<CustomerPortfolioSummaryResult | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  const [riskDistribution, setRiskDistribution] = useState<CustomerRiskDistributionResult[]>([]);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(true);
  const [errorRisk, setErrorRisk] = useState<string | null>(null);

  const [recoveryOpportunities, setRecoveryOpportunities] = useState<CustomerRecoveryOpportunitiesResult[]>([]);
  const [loadingRecovery, setLoadingRecovery] = useState<boolean>(true);
  const [errorRecovery, setErrorRecovery] = useState<string | null>(null);

  const [actionItems, setActionItems] = useState<CustomerActionCenterResult[]>([]);
  const [loadingActionItems, setLoadingActionItems] = useState<boolean>(true);
  const [errorActionItems, setErrorActionItems] = useState<string | null>(null);

  const [actionOptions, setActionOptions] = useState<CustomerActionOption[]>([]);
  const [loadingActionOptions, setLoadingActionOptions] = useState<boolean>(false);

  const [salespersonOptions, setSalespersonOptions] = useState<{ salesperson: string; salespersonName: string }[]>([]);

  // Load live Salespeople Options
  useEffect(() => {
    let isMounted = true;
    async function loadSalespeople() {
      try {
        const companyId = selectedCompany === 'Horeca Smart' ? 2 : selectedCompany === 'MAS' ? 1 : undefined;
        const res = await analytics.filters.salespeople({
          startDate: filters.effectiveStartDate || '2026-01-01',
          endDate: asOfDate || filters.effectiveEndDate || '2026-12-31',
          companyId,
        });
        if (isMounted) {
          const uniqueNames = Array.from(new Set(res.map((sp) => sp.salespersonName).filter(Boolean)));
          setSalespersonOptions(uniqueNames.map((name) => ({ salesperson: name, salespersonName: name })));
        }
      } catch (err) {
        console.error('Error loading salespeople in CustomerActionCenter:', err);
      }
    }
    loadSalespeople();
    return () => { isMounted = false; };
  }, [selectedCompany, filters.effectiveStartDate, filters.effectiveEndDate, asOfDate]);

  // Load live Customer Action Filter Options (Priority & Action Type) with cascading resets
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

  // Pagination for action items table
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  // Sync with global company / salesperson filters if changed externally
  useEffect(() => {
    if (filters.company && filters.company !== selectedCompany) {
      setSelectedCompany(filters.company);
    }
  }, [filters.company]);

  useEffect(() => {
    if (filters.salesRepId && filters.salesRepId !== selectedSalesperson) {
      setSelectedSalesperson(filters.salesRepId);
    }
  }, [filters.salesRepId]);

  // Load Portfolio Summary
  const loadPortfolioSummary = useCallback(async () => {
    setLoadingSummary(true);
    setErrorSummary(null);
    const { data, error } = await fetchCustomerPortfolioSummary({
      asOfDate,
      companyName: selectedCompany,
      salesperson: selectedSalesperson
    });
    if (error) {
      setErrorSummary(error);
    } else {
      setPortfolioSummary(data);
    }
    setLoadingSummary(false);
  }, [asOfDate, selectedCompany, selectedSalesperson]);

  // Load Risk Distribution
  const loadRiskDistribution = useCallback(async () => {
    setLoadingRisk(true);
    setErrorRisk(null);
    const { data, error } = await fetchCustomerRiskDistribution({
      asOfDate,
      companyName: selectedCompany,
      salesperson: selectedSalesperson
    });
    if (error) {
      setErrorRisk(error);
    } else {
      setRiskDistribution(data);
    }
    setLoadingRisk(false);
  }, [asOfDate, selectedCompany, selectedSalesperson]);

  // Load Recovery Opportunities
  const loadRecoveryOpportunities = useCallback(async () => {
    setLoadingRecovery(true);
    setErrorRecovery(null);
    const { data, error } = await fetchCustomerRecoveryOpportunities({
      asOfDate,
      companyName: selectedCompany,
      salesperson: selectedSalesperson,
      limit: 10
    });
    if (error) {
      setErrorRecovery(error);
    } else {
      setRecoveryOpportunities(data);
    }
    setLoadingRecovery(false);
  }, [asOfDate, selectedCompany, selectedSalesperson]);

  // Load Action Queue Items
  const loadActionItems = useCallback(async () => {
    setLoadingActionItems(true);
    setErrorActionItems(null);
    const { data, error } = await fetchCustomerActionCenterList({
      asOfDate,
      companyName: selectedCompany,
      salesperson: selectedSalesperson,
      priority: selectedPriority,
      actionType: selectedActionType,
      risk: selectedRisk,
      search: searchQuery,
      limit: 500,
      offset: 0
    });
    if (error) {
      setErrorActionItems(error);
    } else {
      setActionItems(data);
    }
    setLoadingActionItems(false);
  }, [asOfDate, selectedCompany, selectedSalesperson, selectedPriority, selectedActionType, selectedRisk, searchQuery]);

  // Master fetch trigger
  useEffect(() => {
    loadPortfolioSummary();
    loadRiskDistribution();
    loadRecoveryOpportunities();
    loadActionItems();
  }, [loadPortfolioSummary, loadRiskDistribution, loadRecoveryOpportunities, loadActionItems]);

  // Apply Quick Filter Shortcuts
  const handleQuickFilter = (type: string) => {
    setActiveQuickFilter(type);
    setPage(1);
    switch (type) {
      case 'ACTION_TODAY':
      case 'HIGH_PRIORITY':
        setSelectedPriority('HIGH');
        setSelectedActionType('ALL');
        break;
      case 'STOPPED_BUYING':
        setSelectedPriority('ALL');
        setSelectedActionType('WIN_BACK');
        break;
      case 'DECLINING_SALES':
        setSelectedPriority('ALL');
        setSelectedActionType('RECOVER_DECLINE');
        break;
      case 'OVERDUE':
        setSelectedPriority('ALL');
        setSelectedActionType('OVERDUE_FOLLOWUP');
        break;
      case 'OWNER_TRANSFERRED':
        setSelectedPriority('ALL');
        setSelectedActionType('OWNER_TRANSFER_REVIEW');
        break;
      case 'ALL':
      default:
        setSelectedPriority('ALL');
        setSelectedActionType('ALL');
        break;
    }
  };

  // Click customer handler (Drilldown into Customer 360)
  const handleCustomerClick = (customerId: number, customerName: string) => {
    setSelectedCustomer({
      id: customerId as any,
      nameAr: customerName,
      nameEn: customerName,
      company: selectedCompany === 'All' ? 'MAS' : (selectedCompany as any),
      sector: 'restaurant',
      area: '',
      city: '',
      salesRepId: '',
      salesRepName: '',
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

  // Mappers
  const getActionTypeBadge = (actionType: string) => {
    switch (actionType) {
      case 'REACTIVATE_LOST':
        return {
          label: isAr ? 'إعادة تنشيط عميل مفقود' : 'Reactivate Lost Customer',
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'WIN_BACK':
        return {
          label: isAr ? 'استرجاع العميل' : 'Win-Back Customer',
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'RECOVER_DECLINE':
        return {
          label: isAr ? 'معالجة انخفاض المبيعات' : 'Recover Declining Sales',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'OVERDUE_FOLLOWUP':
        return {
          label: isAr ? 'متابعة تأخر الشراء' : 'Overdue Buying Followup',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
        };
      case 'OWNER_TRANSFER_REVIEW':
        return {
          label: isAr ? 'مراجعة نقل العميل' : 'Owner Transfer Review',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'MONITOR':
      default:
        return {
          label: isAr ? 'متابعة عادية' : 'Regular Monitor',
          className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return {
          label: isAr ? 'أولوية عالية' : 'High Priority',
          className: 'bg-red-500 text-white font-extrabold shadow-sm'
        };
      case 'MEDIUM':
        return {
          label: isAr ? 'أولوية متوسطة' : 'Medium Priority',
          className: 'bg-amber-500 text-white font-bold'
        };
      case 'LOW':
      default:
        return {
          label: isAr ? 'أولوية منخفضة' : 'Low Priority',
          className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium'
        };
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOST':
        return {
          label: isAr ? 'مفقود' : 'Lost',
          className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
        };
      case 'HIGH':
        return {
          label: isAr ? 'مرتفع' : 'High',
          className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
        };
      case 'MEDIUM':
        return {
          label: isAr ? 'متوسط' : 'Medium',
          className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        };
      case 'LOW':
      default:
        return {
          label: isAr ? 'منخفض' : 'Low',
          className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        };
    }
  };

  // Formatters
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US').format(val);
  };

  // Paginated Action Items
  const paginatedActionItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return actionItems.slice(startIndex, startIndex + pageSize);
  }, [actionItems, page]);

  const totalPages = Math.ceil(actionItems.length / pageSize) || 1;

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 ltr:right-0 rtl:left-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-400">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  {isAr ? 'مركز إجراءات العملاء' : 'Customer Action Center'}
                </h1>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  {isAr
                    ? 'منصة التشغيل الميداني والمتابعة التجارية لإدارة فرص التعافي والاسترجاع وإشارات تدهور العملاء'
                    : 'Operational workspace for customer recovery, churn prevention, and sales gap management'}
                </p>
              </div>
            </div>
          </div>

          {/* Active As-Of Date Badge */}
          <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs">
            <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold">
                {isAr ? 'تاريخ المرجعية التشغيلية (As-Of Date)' : 'Active As-Of Date'}
              </div>
              <div className="font-mono font-bold text-slate-100 flex items-center gap-2">
                <span>{asOfDate}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isAr ? 'بيانات معتمدة' : 'Verified'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Global Controls & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{isAr ? 'عناصر التصفية التشغيلية' : 'Operational Filter Controls'}</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {isAr
                ? 'تحديد تاريخ مرجعي يضمن احتساب مؤشرات الاسترجاع دقيقة بناءً على أحدث حركة مبيعات فعالية.'
                : 'Selected as-of date computes recovery gaps against latest actual sales.'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* As-Of Date Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'تاريخ المرجعية (As-Of)' : 'As-Of Date'}
            </label>
            <div className="relative">
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute ltr:right-2.5 rtl:left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Operating Company */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'الشركة التشغيلية' : 'Operating Company'}
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setFilters((prev) => ({ ...prev, company: e.target.value as any }));
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">{isAr ? 'جميع الشركات' : 'All Companies'}</option>
              <option value="Horeca Smart">Horeca Smart</option>
              <option value="MAS">MAS</option>
            </select>
          </div>

          {/* Salesperson */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'مندوب المبيعات' : 'Sales Representative'}
            </label>
            <select
              value={selectedSalesperson}
              onChange={(e) => {
                setSelectedSalesperson(e.target.value);
                setFilters((prev) => ({ ...prev, salesRepId: e.target.value }));
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">{isAr ? 'جميع المندوبين' : 'All Representatives'}</option>
              {salespersonOptions.map((sp, idx) => (
                <option key={`sp-${sp.salesperson}-${idx}`} value={sp.salesperson}>
                  {sp.salespersonName || sp.salesperson}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'مستوى الأولوية' : 'Priority Level'}
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setActiveQuickFilter('CUSTOM');
                setPage(1);
              }}
              disabled={loadingActionOptions}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">
                {loadingActionOptions
                  ? (isAr ? 'جاري التحميل...' : 'Loading...')
                  : (isAr ? 'جميع الأولويات' : 'All Priorities')}
              </option>
              {priorityOptions.map((p) => (
                <option key={`prio-${p.optionCode}`} value={p.optionCode}>
                  {p.optionLabelAr} ({p.customersCount})
                </option>
              ))}
            </select>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'نوع الإجراء المطلوبة' : 'Action Type'}
            </label>
            <select
              value={selectedActionType}
              onChange={(e) => {
                setSelectedActionType(e.target.value);
                setActiveQuickFilter('CUSTOM');
                setPage(1);
              }}
              disabled={loadingActionOptions}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">
                {loadingActionOptions
                  ? (isAr ? 'جاري التحميل...' : 'Loading...')
                  : (isAr ? 'جميع الإجراءات' : 'All Actions')}
              </option>
              {actionTypeOptions.map((a) => (
                <option key={`act-${a.optionCode}`} value={a.optionCode}>
                  {a.optionLabelAr} ({a.customersCount})
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'مستوى المخاطرة' : 'Risk Level'}
            </label>
            <select
              value={selectedRisk}
              onChange={(e) => {
                setSelectedRisk(e.target.value);
                setActiveQuickFilter('CUSTOM');
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">{isAr ? 'جميع المخاطر' : 'All Risk Levels'}</option>
              <option value="HIGH">{isAr ? 'مرتفع (High)' : 'High Risk'}</option>
              <option value="MEDIUM">{isAr ? 'متوسط (Medium)' : 'Medium Risk'}</option>
              <option value="LOW">{isAr ? 'منخفض (Low)' : 'Low Risk'}</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'البحث عن عميل' : 'Customer Search'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={isAr ? 'اسم العميل أو كود العميل...' : 'Customer name or ID...'}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute ltr:left-2.5 rtl:right-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* 3. Quick Views Filter Shortcuts Bar */}
        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ltr:mr-1 rtl:ml-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>{isAr ? 'اختصارات التصفية السريعة:' : 'Quick Filters:'}</span>
          </span>

          <button
            onClick={() => handleQuickFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeQuickFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isAr ? 'كل العملاء' : 'All Customers'}
          </button>

          <button
            onClick={() => handleQuickFilter('ACTION_TODAY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeQuickFilter === 'ACTION_TODAY'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isAr ? 'يحتاج تدخل اليوم' : 'Requires Action Today'}</span>
          </button>

          <button
            onClick={() => handleQuickFilter('STOPPED_BUYING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeQuickFilter === 'STOPPED_BUYING'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>{isAr ? 'العملاء المتوقفون (Win-Back)' : 'Stopped Buying'}</span>
          </button>

          <button
            onClick={() => handleQuickFilter('DECLINING_SALES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeQuickFilter === 'DECLINING_SALES'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{isAr ? 'المبيعات المنخفضة' : 'Declining Sales'}</span>
          </button>

          <button
            onClick={() => handleQuickFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeQuickFilter === 'OVERDUE'
                ? 'bg-yellow-600 text-white shadow-sm'
                : 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 border border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isAr ? 'متأخر عن نمط الشراء' : 'Overdue Followup'}</span>
          </button>

          <button
            onClick={() => handleQuickFilter('OWNER_TRANSFERRED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeQuickFilter === 'OWNER_TRANSFERRED'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{isAr ? 'تم تغيير المندوب' : 'Owner Transferred'}</span>
          </button>
        </div>
      </div>

      {/* 4. Executive KPI Summary Row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>{isAr ? 'ملخص محفظة العملاء والأولويات' : 'Customer Portfolio & Priority Summary'}</span>
          </h2>
          {loadingSummary && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{isAr ? 'جاري تجميع المؤشرات...' : 'Calculating KPIs...'}</span>
            </span>
          )}
        </div>

        {errorSummary ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{errorSummary}</span>
            <button onClick={loadPortfolioSummary} className="px-3 py-1 rounded bg-red-600 text-white font-bold">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* KPI 1: Total Customers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                {isAr ? 'إجمالي العملاء بالمحفظة' : 'Total Customers'}
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {portfolioSummary ? formatNumber(portfolioSummary.totalCustomers) : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {isAr ? 'عملاء معتمدون تشغيلياً' : 'Active Portfolio accounts'}
              </div>
            </div>

            {/* KPI 2: High Priority */}
            <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-xl p-4 shadow-sm relative overflow-hidden bg-gradient-to-br from-red-50/30 to-transparent dark:from-red-950/10">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] font-bold text-red-700 dark:text-red-400">
                  {isAr ? 'أولوية عالية جداً (High Priority)' : 'High Priority Items'}
                </div>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
                {portfolioSummary ? formatNumber(portfolioSummary.highPriority) : '—'}
              </div>
              <div className="text-[10px] text-red-600/80 dark:text-red-400/80 font-semibold mt-1">
                {isAr ? 'يتطلب تدخلاً عاجلاً اليوم' : 'Requires immediate action'}
              </div>
            </div>

            {/* KPI 3: Medium Priority */}
            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1">
                {isAr ? 'أولوية متوسطة (Medium)' : 'Medium Priority Items'}
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {portfolioSummary ? formatNumber(portfolioSummary.mediumPriority) : '—'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {isAr ? 'متابعة خلال الأسبوع الحاضر' : 'Follow up this week'}
              </div>
            </div>

            {/* KPI 4: Total Recovery Opportunity */}
            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1 lg:col-span-2 bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/20">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
                  {isAr ? 'إجمالي فرصة الاسترجاع التشغيلية' : 'Total Recovery Opportunity'}
                </div>
                <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {portfolioSummary ? formatCurrency(portfolioSummary.totalRecoveryOpportunity) : '—'}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold mt-1 flex items-center gap-1">
                <span>{isAr ? 'منها أولوية عالية:' : 'High priority share:'}</span>
                <span className="font-mono">
                  {portfolioSummary ? formatCurrency(portfolioSummary.highPriorityRecoveryOpportunity) : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown Secondary KPI Row */}
        {portfolioSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500">{isAr ? 'عملاء الاسترجاع (Win-Back)' : 'Win-Back Accounts'}</div>
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{formatNumber(portfolioSummary.winBackCustomers)}</div>
              </div>
              <UserX className="w-5 h-5 text-rose-500" />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500">{isAr ? 'انخفاض المبيعات (Declining)' : 'Declining Accounts'}</div>
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{formatNumber(portfolioSummary.decliningCustomers)}</div>
              </div>
              <TrendingDown className="w-5 h-5 text-amber-500" />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500">{isAr ? 'تأخر نمط الشراء (Overdue)' : 'Overdue Accounts'}</div>
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{formatNumber(portfolioSummary.overdueCustomers)}</div>
              </div>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500">{isAr ? 'تغيير المندوب (Transferred)' : 'Owner Transferred'}</div>
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{formatNumber(portfolioSummary.salespersonTransferReviews)}</div>
              </div>
              <UserCheck className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* 5. Risk Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>{isAr ? 'توزيع مخاطر المحفظة (Risk Distribution)' : 'Portfolio Risk Distribution'}</span>
            </h3>
            {/* Tooltip Info */}
            <div className="group relative cursor-pointer">
              <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              <div className="absolute ltr:right-0 rtl:left-0 top-6 hidden group-hover:block z-30 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-xl leading-relaxed border border-slate-700">
                {isAr
                  ? 'مؤشر المخاطر يقيس التدهور التجاري أو الانقطاع عن الشراء بناءً على الأيام المنقضية ووسيط الشراء. بينما تأخذ الأولوية بعين الاعتبار الاستعجال التشغيلي وحجم فرصة الاسترجاع المالية.'
                  : 'Risk measures commercial deterioration/inactivity. Priority considers operational urgency and financial recovery gap.'}
              </div>
            </div>
          </div>

          {loadingRisk ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              {isAr ? 'جاري تحليلات المخاطر...' : 'Loading risk distribution...'}
            </div>
          ) : errorRisk ? (
            <div className="p-3 text-xs text-red-600">{errorRisk}</div>
          ) : (
            <div className="space-y-4">
              {riskDistribution.map((item, idx) => {
                const badge = getRiskBadge(item.riskLevel);
                return (
                  <div key={`${item.riskLevel}_${idx}`} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.className}`}>
                          {badge.label}
                        </span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatNumber(item.customersCount)} {isAr ? 'عميل' : 'cust.'}
                        </span>
                      </div>
                      <div className="font-mono text-slate-500 font-semibold">
                        {item.customersPct}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.riskLevel === 'HIGH' || item.riskLevel === 'LOST'
                            ? 'bg-rose-500'
                            : item.riskLevel === 'MEDIUM'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.customersPct)}%` }}
                      />
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono text-end">
                      {isAr ? 'قيمة الاسترجاع:' : 'Recovery:'} {formatCurrency(item.recoveryOpportunity)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. Top Recovery Opportunities Showcase */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>{isAr ? 'أعلى فرص الاسترجاع المالية (Top Recovery Opportunities)' : 'Top Recovery Opportunities'}</span>
              </h3>
            </div>

            {/* Disclaimer Tooltip / Note */}
            <div className="group relative cursor-pointer">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>{isAr ? 'تنبيه المنهجية' : 'Methodology Note'}</span>
              </span>
              <div className="absolute ltr:right-0 rtl:left-0 top-6 hidden group-hover:block z-30 w-72 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-xl leading-relaxed border border-slate-700">
                {isAr
                  ? 'قيمة فرصة الاسترجاع تقديرية وتعتمد على الفرق بين سلوك الشراء السابق والحالي، وليست توقعًا مضمونًا للمبيعات.'
                  : 'Recovery opportunity is an estimated sales gap indicator based on historical vs recent buying, not guaranteed future revenue.'}
              </div>
            </div>
          </div>

          {loadingRecovery ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              {isAr ? 'جاري تحميل أعلى الفرص...' : 'Loading recovery opportunities...'}
            </div>
          ) : errorRecovery ? (
            <div className="p-3 text-xs text-red-600">{errorRecovery}</div>
          ) : recoveryOpportunities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {isAr ? 'لا توجد فرص استرجاع مطابقة للفلتر المحدد' : 'No recovery opportunities matching filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recoveryOpportunities.slice(0, 6).map((item, idx) => (
                <div
                  key={`${item.customerId}_${idx}`}
                  onClick={() => handleCustomerClick(item.customerId, item.customerName)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                        <span>{item.customerName}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {item.companyName} • {item.salesperson || (isAr ? 'غير محدد' : 'Unassigned')}
                      </div>
                    </div>

                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono shrink-0 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                      {formatCurrency(item.recoveryValue)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[10px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <span className="text-slate-400">{isAr ? '30d سابقة:' : 'Prev 30d:'}</span>
                      <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatNumber(item.previous30dSales)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">{isAr ? '30d حديثة:' : 'Recent 30d:'}</span>
                      <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatNumber(item.recent30dSales)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">{isAr ? 'الانقطاع:' : 'Days Since:'}</span>
                      <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {item.daysSinceLastOrder} {isAr ? 'يوم' : 'd'}
                      </div>
                    </div>
                  </div>

                  {item.actionReason && (
                    <div className="text-[10px] text-slate-500 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200/60 dark:border-slate-800 line-clamp-1">
                      <span className="font-bold">{isAr ? 'السبب:' : 'Reason:'}</span> {item.actionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7. Operational Action Queue Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {isAr ? 'قائمة الإجراءات والمتابعة التجارية (Action Queue)' : 'Operational Action Queue'}
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {formatNumber(actionItems.length)} {isAr ? 'عميل' : 'accounts'}
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            {isAr
              ? 'الترتيب التلقائي يعتمد على قواعد الاستعجال وحجم فرصة الاسترجاع التشغيلية'
              : 'Default ordering is rules-based by priority urgency and recovery gap.'}
          </div>
        </div>

        {loadingActionItems ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            {isAr ? 'جاري تحميل قائمة الإجراءات...' : 'Loading action items queue...'}
          </div>
        ) : errorActionItems ? (
          <div className="p-6 text-center text-xs text-red-600 space-y-2">
            <p>{errorActionItems}</p>
            <button onClick={loadActionItems} className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-bold">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : actionItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p>{isAr ? 'لا توجد إجراءات معلقة تطابق خيارات التصفية المحددة.' : 'No pending action items matching the filter criteria.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-800 dark:text-slate-200 border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 text-start">{isAr ? 'العميل والشركة' : 'Customer & Company'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'المندوب الحالي' : 'Salesperson'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الأولوية' : 'Priority'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'نوع الإجراء' : 'Action Type'}</th>
                    <th className="py-3 px-3 text-start max-w-xs">{isAr ? 'سبب الإجراء' : 'Reason'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'آخر طلب' : 'Last Order'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الأيام' : 'Days'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'وسيط الشراء' : 'Interval'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'مبيعات 30d سابقة' : 'Prev 30d'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'مبيعات 30d حديثة' : 'Recent 30d'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'فرصة الاسترجاع' : 'Recovery Opp.'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'المخاطر' : 'Risk'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedActionItems.map((item, idx) => {
                    const actionBadge = getActionTypeBadge(item.actionType);
                    const priorityBadge = getPriorityBadge(item.priority);
                    const riskBadge = getRiskBadge(item.risk);

                    return (
                      <tr
                        key={`${item.customerId}_${item.companyName}_${idx}`}
                        className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Customer */}
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleCustomerClick(item.customerId, item.customerName)}
                            className="text-start group font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5"
                          >
                            <span>{item.customerName}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                            <span>{item.companyName}</span>
                            {item.salespersonChanged && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                                {isAr ? 'تم تغيير المندوب' : 'Transferred'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Salesperson */}
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.salesperson || (isAr ? 'غير محدد' : 'Unassigned')}
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${priorityBadge.className}`}>
                            {priorityBadge.label}
                          </span>
                        </td>

                        {/* Action Type */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${actionBadge.className}`}>
                            {actionBadge.label}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs leading-snug">
                          {item.actionReason || '—'}
                        </td>

                        {/* Last Order Date */}
                        <td className="py-3 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                          {item.lastOrderDate || '—'}
                        </td>

                        {/* Days Since Last Order */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.daysSinceLastOrder} {isAr ? 'يوم' : 'd'}
                        </td>

                        {/* Median Buying Interval */}
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {item.medianBuyingInterval} {isAr ? 'يوم' : 'd'}
                        </td>

                        {/* Previous 30d Sales */}
                        <td className="py-3 px-3 text-end font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {formatNumber(item.previous30dSales)}
                        </td>

                        {/* Recent 30d Sales */}
                        <td className="py-3 px-3 text-end font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {formatNumber(item.recent30dSales)}
                        </td>

                        {/* Recovery Opportunity */}
                        <td className="py-3 px-3 text-end font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(item.recoveryOpportunity)}
                        </td>

                        {/* Risk Level */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${riskBadge.className}`}>
                            {riskBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="text-slate-500">
                  {isAr
                    ? `عرض ${(page - 1) * pageSize + 1} إلى ${Math.min(page * pageSize, actionItems.length)} من إجمالي ${actionItems.length}`
                    : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, actionItems.length)} of ${actionItems.length}`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                  <span className="font-mono font-bold">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
