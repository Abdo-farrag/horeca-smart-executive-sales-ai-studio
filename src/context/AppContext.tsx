import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  GlobalFilterState,
  PeriodMode,
  DrillDownData,
  OperatingCompany,
  DateRangeFilter,
  Customer,
  SalesRep,
  Product,
  CategoryPerformance,
  AreaTerritory,
  LostCustomerRecord,
  KpiMetric,
  OrderRecord
} from '../types';
import {
  getCurrentMonthRange,
  getPreviousMonthRange,
  calculateEffectiveWindow,
  formatDateRangeDisplay
} from '../utils/dateFilters';
import { analytics } from '../analytics';

interface AppContextType {
  // Localization & Theme
  language: 'ar' | 'en';
  dir: 'rtl' | 'ltr';
  theme: 'light' | 'dark';
  setLanguage: (lang: 'ar' | 'en') => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Active View Navigation
  currentView: string;
  setCurrentView: (view: string) => void;

  // Global Filters
  filters: GlobalFilterState;
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
  resetFilters: () => void;
  activeFilterCount: number;

  // Drill Down System
  drillDown: {
    isOpen: boolean;
    data: DrillDownData | null;
  };
  openDrillDown: (data: DrillDownData) => void;
  closeDrillDown: () => void;

  // AI Assistant System
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;

  // Filtered Datasets
  kpis: KpiMetric[];
  customers: Customer[];
  salesReps: SalesRep[];
  products: Product[];
  categories: CategoryPerformance[];
  areas: AreaTerritory[];
  lostCustomers: LostCustomerRecord[];
  orders: OrderRecord[];

  // Selected Entity Detail Modals
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  selectedRep: SalesRep | null;
  setSelectedRep: (rep: SalesRep | null) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
}

const INITIAL_LATEST_DATA_DATE = '2026-08-09';
const initialCurrentMonth = getCurrentMonthRange('2026-08-10');
const initialEffective = calculateEffectiveWindow(
  initialCurrentMonth.startDate,
  initialCurrentMonth.endDate,
  INITIAL_LATEST_DATA_DATE
);

const DEFAULT_FILTERS: GlobalFilterState = {
  periodMode: 'current_month',
  selectedStartDate: initialCurrentMonth.startDate,
  selectedEndDate: initialCurrentMonth.endDate,
  effectiveStartDate: initialEffective.effectiveStartDate,
  effectiveEndDate: initialEffective.effectiveEndDate,
  latestAvailableDataDate: INITIAL_LATEST_DATA_DATE,
  companyId: null,
  companyName: null,
  company: 'All',
  salespersonOptionKey: null,
  salespersonName: null,
  salespersonCompanyId: null,
  salesperson: null,
  salesRepId: 'All',
  governorateCode: null,
  governorateName: null,
  areaCode: null,
  areaName: null,
  customerId: null,
  customerName: null,
  productId: null,
  productName: null,
  dateRange: {
    label: formatDateRangeDisplay(initialCurrentMonth.startDate, initialCurrentMonth.endDate, true),
    startDate: initialEffective.effectiveStartDate,
    endDate: initialEffective.effectiveEndDate,
    preset: 'current_mtd'
  },
  area: 'All',
  city: 'All',
  category: 'All',
  customerStatus: null,
  priority: null,
  risk: null,
  actionType: null,
  customerSector: 'All',
  searchQuery: ''
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'ar' | 'en'>('ar');
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [currentView, setCurrentView] = useState<string>('executive');
  const [filters, setFilters] = useState<GlobalFilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    // Fetch latest available data date on mount
    analytics.sales.freshness()
      .then((rows) => {
        if (rows && rows.length > 0 && rows[0].maxOrderDate) {
          const freshDate = rows[0].maxOrderDate;
          setFilters((prev) => {
            const { effectiveStartDate, effectiveEndDate } = calculateEffectiveWindow(
              prev.selectedStartDate,
              prev.selectedEndDate,
              freshDate
            );
            return {
              ...prev,
              latestAvailableDataDate: freshDate,
              effectiveStartDate,
              effectiveEndDate,
              dateRange: {
                ...prev.dateRange,
                startDate: effectiveStartDate,
                endDate: effectiveEndDate
              }
            };
          });
        }
      })
      .catch(() => {
        // Fallback to default INITIAL_LATEST_DATA_DATE if RPC fails or not connected
      });
  }, []);

  // Drill Down State
  const [drillDown, setDrillDown] = useState<{ isOpen: boolean; data: DrillDownData | null }>({
    isOpen: false,
    data: null
  });

  // AI Panel State
  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(false);

  // Entity Modals State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const setLanguage = (lang: 'ar' | 'en') => {
    setLanguageState(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.companyId !== null || filters.company !== 'All') count++;
    if (filters.salespersonOptionKey !== null || (filters.salesRepId !== 'All' && filters.salesRepId !== '')) count++;
    if (filters.governorateCode !== null) count++;
    if (filters.areaCode !== null) count++;
    if (filters.customerId !== null) count++;
    if (filters.productId !== null) count++;
    if (filters.category !== 'All') count++;
    if (filters.customerStatus !== null && filters.customerStatus !== 'All') count++;
    if (filters.priority !== null && filters.priority !== 'ALL') count++;
    if (filters.risk !== null && filters.risk !== 'ALL') count++;
    if (filters.actionType !== null && filters.actionType !== 'ALL') count++;
    if (filters.customerSector !== 'All') count++;
    if (filters.searchQuery.trim() !== '') count++;
    if (filters.periodMode !== 'current_month') count++;
    return count;
  }, [filters]);

  const openDrillDown = (data: DrillDownData) => {
    setDrillDown({ isOpen: true, data });
  };

  const closeDrillDown = () => {
    setDrillDown({ isOpen: false, data: null });
  };

  // Filter Data according to Global Filter State
  const filteredCustomers = useMemo(() => [], []);
  const filteredSalesReps = useMemo(() => [], []);
  const filteredProducts = useMemo(() => [], []);
  const filteredCategories = useMemo(() => [], []);
  const filteredAreas = useMemo(() => [], []);
  const filteredLostCustomers = useMemo(() => [], []);
  const filteredOrders = useMemo(() => [], []);

  const value = {
    language,
    dir,
    theme,
    setLanguage,
    setTheme,
    currentView,
    setCurrentView,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    drillDown,
    openDrillDown,
    closeDrillDown,
    aiPanelOpen,
    setAiPanelOpen,
    kpis: [],
    customers: filteredCustomers,
    salesReps: filteredSalesReps,
    products: filteredProducts,
    categories: filteredCategories,
    areas: filteredAreas,
    lostCustomers: filteredLostCustomers,
    orders: filteredOrders,
    selectedCustomer,
    setSelectedCustomer,
    selectedRep,
    setSelectedRep,
    selectedProduct,
    setSelectedProduct
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
