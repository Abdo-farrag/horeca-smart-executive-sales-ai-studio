import React, { useState } from 'react';
import {
  Building2,
  Search,
  Bell,
  Sparkles,
  Sun,
  Moon,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateRangeDisplay } from '../utils/dateFilters';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    filters,
    setFilters,
    aiPanelOpen,
    setAiPanelOpen
  } = useApp();

  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isAr = language === 'ar';

  const notificationItems = [
    {
      id: 1,
      titleAr: 'تنبيه خطر فقدان عميل',
      titleEn: 'Churn Risk Warning',
      descAr: 'لم يقم مطعم النخيل التراثي بإجراء أي طلب منذ 15 يوماً.',
      descEn: 'Al Nakhil Restaurant has not placed an order in 15 days.',
      timeAr: 'قبل 10 دقائق',
      timeEn: '10 mins ago',
      type: 'warning'
    },
    {
      id: 2,
      titleAr: 'متابعة أهداف المبيعات',
      titleEn: 'Sales Target Update',
      descAr: 'تم تحديث أهداف المبيعات الإقليمية للشهر الحالي.',
      descEn: 'Regional sales targets updated for the current month.',
      timeAr: 'قبل ساعة',
      timeEn: '1 hour ago',
      type: 'success'
    },
    {
      id: 3,
      titleAr: 'تراجع مبيعات الألبان الإقليمي',
      titleEn: 'Regional Dairy Sales Dip',
      descAr: 'انخفاض في مبيعات الموزاريلا بمنطقة الرياض السلي بنسبة 8%.',
      descEn: 'Mozzarella sales dropped 8% in Riyadh Sulai area.',
      timeAr: 'قبل 3 ساعات',
      timeEn: '3 hours ago',
      type: 'info'
    }
  ];

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left Section: Logo & Company Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              HS
            </div>
            <div className="hidden sm:block">
              <div className="font-black text-slate-900 dark:text-white text-lg leading-none tracking-tight">
                {isAr ? 'هوريكا سمارت' : 'Horeca Smart'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {isAr ? 'منصة الذكاء التنفيذي للمبيعات' : 'Executive Sales Intelligence'}
              </div>
            </div>
          </div>

          {/* Operating Company Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowCompanyMenu(!showCompanyMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors border border-slate-200/80 dark:border-slate-700"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                {filters.company === 'All'
                  ? (isAr ? 'جميع الشركات' : 'All Operating Companies')
                  : filters.company}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showCompanyMenu && (
              <div className="absolute top-full mt-1.5 ltr:left-0 rtl:right-0 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {isAr ? 'اختر الشركة التشغيلية' : 'Select Operating Company'}
                </div>
                {(['All', 'Horeca Smart', 'MAS'] as const).map((comp) => (
                  <button
                    key={comp}
                    onClick={() => {
                      setFilters(prev => ({ ...prev, company: comp }));
                      setShowCompanyMenu(false);
                    }}
                    className={`w-full text-right rtl:text-right ltr:text-left px-3 py-2 text-xs flex items-center justify-between font-medium transition-colors ${
                      filters.company === comp
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span>
                      {comp === 'All'
                        ? (isAr ? 'دمج جميع الشركات (Horeca Smart + MAS)' : 'All Companies (Horeca Smart + MAS)')
                        : comp}
                    </span>
                    {filters.company === comp && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Date Period Badge in Header */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-xs text-blue-900 dark:text-blue-200 font-medium">
            <span className="font-bold text-blue-700 dark:text-blue-300">
              {filters.periodMode === 'current_month'
                ? (isAr ? 'الشهر الحالي' : 'Current Month')
                : filters.periodMode === 'previous_month'
                ? (isAr ? 'الشهر السابق' : 'Previous Month')
                : (isAr ? 'نطاق مخصص' : 'Custom Range')}
            </span>
            <span className="text-blue-600 dark:text-blue-300 font-semibold text-[11px] ltr:ml-1 rtl:mr-1">
              ({formatDateRangeDisplay(filters.selectedStartDate, filters.selectedEndDate, isAr)})
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder={isAr ? 'بحث شامل (عميل، مندوب، منتج، كود، منطقة...)' : 'Global search (Customer, Rep, Product, Area...)'}
              className="w-full ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Section: Action Controls & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* AI Assistant Button */}
          <button
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              aiPanelOpen
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300 animate-pulse" />
            <span className="hidden sm:inline">
              {isAr ? 'المساعد الذكي التنفيذي' : 'Executive AI Assistant'}
            </span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 ltr:right-1.5 rtl:left-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="absolute top-1.5 ltr:right-1.5 rtl:left-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {showNotifications && (
              <div className="absolute top-full mt-2 ltr:right-0 rtl:left-0 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-3 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    {isAr ? 'التنبيهات الإدارية (3)' : 'Executive Alerts (3)'}
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold cursor-pointer">
                    {isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-80 overflow-y-auto">
                  {notificationItems.map(item => (
                    <div key={item.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-start gap-2.5">
                        {item.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {isAr ? item.titleAr : item.titleEn}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {isAr ? item.descAr : item.descEn}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                            {isAr ? item.timeAr : item.timeEn}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700"
            title={isAr ? 'Switch to English' : 'التحويل للغة العربية'}
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* User Executive Badge */}
          <div className="flex items-center gap-2 pl-2 rtl:pr-2 border-l rtl:border-r ltr:border-slate-200 rtl:border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-sm">
              SA
            </div>
            <div className="hidden lg:block">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {isAr ? 'سارة العتيبي' : 'Sarah Al-Otaibi'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {isAr ? 'المدير التجاري والتنفيذي' : 'Commercial Director'}
              </div>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
