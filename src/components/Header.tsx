import React, { useState } from 'react';
import { Building2, Search, Sparkles, Sun, Moon, Globe, CheckCircle2, ChevronDown, LogOut, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAccess } from '../context/AccessContext';
import { formatDateRangeDisplay } from '../utils/dateFilters';

function companyLabel(companyId: number | null): 'MAS' | 'Horeca Smart' | null {
  if (companyId === 1) return 'MAS';
  if (companyId === 2) return 'Horeca Smart';
  return null;
}

export const Header: React.FC = () => {
  const { language, setLanguage, theme, setTheme, filters, setFilters, aiPanelOpen, setAiPanelOpen } = useApp();
  const { profile, signOut } = useAccess();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const isAr = language === 'ar';

  if (!profile) return null;

  const scopedCompany = companyLabel(profile.companyId);
  const companyLocked = profile.role === 'sales_rep' || profile.role === 'supervisor';
  const visibleCompany = companyLocked ? scopedCompany ?? '—' : filters.company === 'All' ? (isAr ? 'جميع الشركات' : 'All Companies') : filters.company;

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">HS</div>
            <div className="hidden sm:block">
              <div className="font-black text-slate-900 dark:text-white text-lg leading-none">{isAr ? 'هوريكا سمارت' : 'Horeca Smart'}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">{isAr ? 'منصة ذكاء المبيعات' : 'Sales Intelligence Platform'}</div>
            </div>
          </div>

          <div className="relative">
            <button
              disabled={companyLocked}
              onClick={() => !companyLocked && setShowCompanyMenu((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${companyLocked ? 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 cursor-default' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{visibleCompany}</span>
              {!companyLocked && <ChevronDown className="w-3 h-3 text-slate-400" />}
            </button>

            {!companyLocked && showCompanyMenu && (
              <div className="absolute top-full mt-1.5 ltr:left-0 rtl:right-0 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50">
                {(['All', 'Horeca Smart', 'MAS'] as const).map((comp) => (
                  <button
                    key={comp}
                    onClick={() => { setFilters((prev) => ({ ...prev, company: comp })); setShowCompanyMenu(false); }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between font-medium ${filters.company === comp ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <span>{comp === 'All' ? (isAr ? 'Horeca Smart + MAS' : 'Horeca Smart + MAS') : comp}</span>
                    {filters.company === comp && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden xl:flex items-center px-3 py-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-[11px] text-blue-800 dark:text-blue-200 font-semibold">
            {formatDateRangeDisplay(filters.selectedStartDate, filters.selectedEndDate, isAr)}
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder={isAr ? 'بحث داخل نطاق صلاحياتك...' : 'Search within your authorized scope...'}
              className="w-full ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setAiPanelOpen(!aiPanelOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${aiPanelOpen ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI</span>
          </button>
          <button onClick={() => setLanguage(isAr ? 'en' : 'ar')} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300" title={isAr ? 'English' : 'العربية'}><Globe className="w-4 h-4" /></button>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}</button>

          <div className="hidden lg:flex items-center gap-2 px-2 border-l rtl:border-l-0 rtl:border-r border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></div>
            <div className="max-w-36">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{profile.displayName}</div>
              <div className="text-[10px] text-slate-500 uppercase">{profile.role}</div>
            </div>
          </div>
          <button onClick={() => void signOut()} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600" title={isAr ? 'تسجيل الخروج' : 'Sign out'}><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </header>
  );
};
